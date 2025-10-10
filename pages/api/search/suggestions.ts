import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { SearchEngine } from '@/lib/search';
import { prisma } from '@/lib/db-optimization';
import { cacheHelpers } from '@/lib/cache';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    
    const { q: query, limit = '10', type = 'all' } = req.query;

    if (!query || typeof query !== 'string' || query.length < 2) {
      return res.status(400).json({ 
        success: false, 
        message: 'Query must be at least 2 characters long' 
      });
    }

    const suggestionLimit = Math.min(parseInt(limit as string), 20);

    // Cache suggestions for better performance
    const cacheKey = `suggestions:${query}:${type}:${suggestionLimit}`;
    
    const suggestions = await cacheHelpers.cacheApiResponse(
      'suggestions',
      { query, type, limit: suggestionLimit },
      async () => {
        const isElasticsearchAvailable = await SearchEngine.isElasticsearchAvailable();
        
        if (isElasticsearchAvailable) {
          return await getElasticsearchSuggestions(query, suggestionLimit, type as string);
        } else {
          return await getDatabaseSuggestions(query, suggestionLimit, type as string);
        }
      },
      300 // 5 minutes cache
    );

    res.status(200).json({
      success: true,
      query,
      suggestions
    });

  } catch (error) {
    // console.error('Suggestions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get suggestions'
    });
  }
}

async function getElasticsearchSuggestions(query: string, limit: number, type: string) {
  try {
    const suggestions = await SearchEngine.getSearchSuggestions('products', query, limit);
    
    // Add type information
    return suggestions.map(suggestion => ({
      ...suggestion,
      type: 'product'
    }));
  } catch (error) {
    // console.error('Elasticsearch suggestions error:', error);
    return await getDatabaseSuggestions(query, limit, type);
  }
}

async function getDatabaseSuggestions(query: string, limit: number, type: string) {
  const suggestions: any[] = [];

  try {
    if (type === 'all' || type === 'products') {
      // Product suggestions
      const products = await prisma.product.findMany({
        where: {
          isActive: true,
          name: {
            contains: query,
            mode: 'insensitive'
          }
        },
        select: {
          name: true,
          category: true
        },
        take: Math.ceil(limit / 3),
        orderBy: { name: 'asc' }
      });

      suggestions.push(...products.map(p => ({
        text: p.name,
        type: 'product',
        category: p.category,
        score: calculateRelevanceScore(p.name, query)
      })));
    }

    if (type === 'all' || type === 'farmers') {
      // Farmer suggestions
      const farmers = await prisma.farmer.findMany({
        where: {
          isApproved: true,
          farmName: {
            contains: query,
            mode: 'insensitive'
          }
        },
        select: {
          farmName: true,
          location: true
        },
        take: Math.ceil(limit / 3),
        orderBy: { farmName: 'asc' }
      });

      suggestions.push(...farmers.map(f => ({
        text: f.farmName,
        type: 'farmer',
        location: f.location,
        score: calculateRelevanceScore(f.farmName, query)
      })));
    }

    if (type === 'all' || type === 'categories') {
      // Category suggestions
      const categories = await prisma.product.groupBy({
        by: ['category'],
        where: {
          isActive: true,
          category: {
            contains: query,
            mode: 'insensitive'
          }
        },
        _count: {
          category: true
        },
        orderBy: {
          _count: {
            category: 'desc'
          }
        },
        take: Math.ceil(limit / 3)
      });

      suggestions.push(...categories.map(c => ({
        text: c.category,
        type: 'category',
        count: c._count.category,
        score: calculateRelevanceScore(c.category, query)
      })));
    }

    // Sort by relevance score and limit results
    return suggestions
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

  } catch (error) {
    // console.error('Database suggestions error:', error);
    return [];
  }
}

function calculateRelevanceScore(text: string, query: string): number {
  const textLower = text.toLowerCase();
  const queryLower = query.toLowerCase();

  // Exact match gets highest score
  if (textLower === queryLower) return 100;
  
  // Starts with query gets high score
  if (textLower.startsWith(queryLower)) return 80;
  
  // Contains query gets medium score
  if (textLower.includes(queryLower)) return 60;
  
  // Calculate similarity based on common characters
  let commonChars = 0;
  for (const char of queryLower) {
    if (textLower.includes(char)) {
      commonChars++;
    }
  }
  
  return (commonChars / queryLower.length) * 40;
}