import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db-optimization';
import { cacheHelpers } from '@/lib/cache';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    
    const { 
      query,
      category,
      location,
      farmerId 
    } = req.query;

    // Build base filters for facet calculation
    const baseFilters: any = {
      isActive: true,
      farmer: {
        isApproved: true
      }
    };

    // Apply existing filters to get relevant facets
    if (query) {
      baseFilters.OR = [
        {
          name: {
            contains: query as string,
            mode: 'insensitive'
          }
        },
        {
          description: {
            contains: query as string,
            mode: 'insensitive'
          }
        },
        {
          farmer: {
            farmName: {
              contains: query as string,
              mode: 'insensitive'
            }
          }
        }
      ];
    }

    if (category) {
      baseFilters.category = category;
    }

    if (location) {
      baseFilters.farmer = {
        ...baseFilters.farmer,
        location: {
          contains: location as string,
          mode: 'insensitive'
        }
      };
    }

    if (farmerId) {
      baseFilters.farmerId = farmerId;
    }

    // Cache facets for better performance
    const cacheKey = `facets:${JSON.stringify(baseFilters)}`;
    
    const facets = await cacheHelpers.cacheApiResponse(
      'facets',
      baseFilters,
      async () => {
        const [categories, locations, farmers, priceStats] = await Promise.all([
          // Categories facet
          prisma.product.groupBy({
            by: ['category'],
            _count: {
              category: true
            },
            where: baseFilters,
            orderBy: {
              _count: {
                category: 'desc'
              }
            },
            take: 20
          }),

          // Locations facet
          prisma.product.findMany({
            where: baseFilters,
            select: {
              farmer: {
                select: {
                  location: true
                }
              }
            },
            distinct: ['farmerId']
          }).then(products => {
            const locationCounts: Record<string, number> = {};
            products.forEach(p => {
              const location = p.farmer.location;
              locationCounts[location] = (locationCounts[location] || 0) + 1;
            });
            return Object.entries(locationCounts)
              .map(([location, count]) => ({ value: location, count }))
              .sort((a, b) => b.count - a.count)
              .slice(0, 20);
          }),

          // Farmers facet
          prisma.product.groupBy({
            by: ['farmerId'],
            _count: {
              farmerId: true
            },
            where: baseFilters,
            orderBy: {
              _count: {
                farmerId: 'desc'
              }
            },
            take: 15
          }).then(async (farmerGroups) => {
            const farmerIds = farmerGroups.map(fg => fg.farmerId);
            const farmers = await prisma.farmer.findMany({
              where: {
                id: {
                  in: farmerIds
                }
              },
              select: {
                id: true,
                farmName: true
              }
            });

            return farmerGroups.map(fg => {
              const farmer = farmers.find(f => f.id === fg.farmerId);
              return {
                id: fg.farmerId,
                name: farmer?.farmName || 'Unknown Farm',
                count: fg._count.farmerId
              };
            });
          }),

          // Price statistics for ranges
          prisma.product.aggregate({
            where: baseFilters,
            _min: {
              basePrice: true
            },
            _max: {
              basePrice: true
            },
            _avg: {
              basePrice: true
            }
          })
        ]);

        // Generate price ranges
        const minPrice = priceStats._min.basePrice || 0;
        const maxPrice = priceStats._max.basePrice || 100;
        const priceRangeSize = Math.ceil((maxPrice - minPrice) / 5);

        const priceRanges = [];
        for (let i = 0; i < 5; i++) {
          const rangeMin = minPrice + i * priceRangeSize;
          const rangeMax = i === 4 ? maxPrice : minPrice + (i + 1) * priceRangeSize;
          
          // Count products in this price range
          const count = await prisma.product.count({
            where: {
              ...baseFilters,
              basePrice: {
                gte: rangeMin,
                lte: rangeMax
              }
            }
          });

          if (count > 0) {
            priceRanges.push({
              range: `${rangeMin}-${rangeMax}`,
              min: rangeMin,
              max: rangeMax,
              count
            });
          }
        }

        return {
          categories: categories.map(cat => ({
            value: cat.category,
            count: cat._count.category
          })),
          locations,
          farmers,
          priceRanges,
          certifications: [] // Could be expanded to include certification facets
        };
      },
      300 // 5 minutes cache
    );

    res.status(200).json({
      success: true,
      facets
    });

  } catch (error) {
    // console.error('Facets error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get facets'
    });
  }
}