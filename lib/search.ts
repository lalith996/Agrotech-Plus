// Advanced search and filtering utilities with Elasticsearch integration

import { prisma } from './db-optimization';
import { cacheHelpers } from './cache';

// Elasticsearch client (optional - fallback to database search if not available)
let elasticsearchClient: any = null;

try {
  // Try to import Elasticsearch client
  const { Client } = require('@elastic/elasticsearch');
  elasticsearchClient = new Client({
    node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
    auth: process.env.ELASTICSEARCH_AUTH ? {
      username: process.env.ELASTICSEARCH_USERNAME || 'elastic',
      password: process.env.ELASTICSEARCH_PASSWORD || ''
    } : undefined,
    requestTimeout: 30000,
    pingTimeout: 3000,
    maxRetries: 3
  });
} catch (error) {
  // console.warn('Elasticsearch not available, falling back to in-memory search');
}

export interface SearchOptions {
  query?: string
  filters?: Record<string, any>
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  limit?: number
  fuzzy?: boolean
  includeHighlights?: boolean
}

export interface SearchResult<T> {
  items: T[]
  total: number
  page: number
  limit: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
  highlights?: Record<string, string[]>
}

export interface FilterConfig {
  field: string
  type: 'text' | 'number' | 'date' | 'boolean' | 'select' | 'multiselect' | 'range'
  label: string
  options?: Array<{ value: any; label: string }>
  min?: number
  max?: number
  searchable?: boolean
}

export class FuzzySearch {
  private static levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null))
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // deletion
          matrix[j - 1][i] + 1, // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        )
      }
    }
    
    return matrix[str2.length][str1.length]
  }

  static similarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2
    const shorter = str1.length > str2.length ? str2 : str1
    
    if (longer.length === 0) return 1.0
    
    const distance = this.levenshteinDistance(longer, shorter)
    return (longer.length - distance) / longer.length
  }

  static search<T>(
    items: T[],
    query: string,
    searchFields: (keyof T)[],
    threshold: number = 0.3
  ): Array<T & { score: number }> {
    if (!query.trim()) return items.map(item => ({ ...item, score: 1 }))
    
    const queryLower = query.toLowerCase()
    const results: Array<T & { score: number }> = []
    
    for (const item of items) {
      let maxScore = 0
      
      for (const field of searchFields) {
        const fieldValue = String(item[field] || '').toLowerCase()
        
        // Exact match gets highest score
        if (fieldValue.includes(queryLower)) {
          maxScore = Math.max(maxScore, 1)
          continue
        }
        
        // Fuzzy match
        const words = fieldValue.split(/\s+/)
        for (const word of words) {
          const score = this.similarity(queryLower, word)
          maxScore = Math.max(maxScore, score)
        }
        
        // Also check similarity with full field value
        const fullScore = this.similarity(queryLower, fieldValue)
        maxScore = Math.max(maxScore, fullScore)
      }
      
      if (maxScore >= threshold) {
        results.push({ ...item, score: maxScore })
      }
    }
    
    return results.sort((a, b) => b.score - a.score)
  }
}

export class AdvancedFilter {
  static applyFilters<T>(items: T[], filters: Record<string, any>): T[] {
    return items.filter(item => {
      return Object.entries(filters).every(([key, value]) => {
        if (value === undefined || value === null || value === '') return true
        
        const itemValue = this.getNestedValue(item, key)
        
        if (Array.isArray(value)) {
          // Multi-select filter
          return value.length === 0 || value.includes(itemValue)
        }
        
        if (typeof value === 'object' && value.min !== undefined && value.max !== undefined) {
          // Range filter
          const numValue = Number(itemValue)
          return numValue >= value.min && numValue <= value.max
        }
        
        if (typeof value === 'string') {
          // Text filter (case-insensitive contains)
          return String(itemValue).toLowerCase().includes(value.toLowerCase())
        }
        
        if (typeof value === 'boolean') {
          return Boolean(itemValue) === value
        }
        
        // Exact match for other types
        return itemValue === value
      })
    })
  }

  private static getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj)
  }

  static buildFilterQuery(filters: Record<string, any>): string {
    const queryParts: string[] = []
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return
      
      if (Array.isArray(value) && value.length > 0) {
        queryParts.push(`${key}:${value.join(',')}`)
      } else if (typeof value === 'object' && value.min !== undefined && value.max !== undefined) {
        queryParts.push(`${key}:${value.min}-${value.max}`)
      } else if (typeof value === 'string' && value.trim()) {
        queryParts.push(`${key}:"${value}"`)
      } else if (typeof value === 'boolean') {
        queryParts.push(`${key}:${value}`)
      }
    })
    
    return queryParts.join(' AND ')
  }

  static parseFilterQuery(query: string): Record<string, any> {
    const filters: Record<string, any> = {}
    
    // Simple parser for filter queries like: category:"vegetables" AND price:10-50
    const parts = query.split(' AND ')
    
    parts.forEach(part => {
      const [key, value] = part.split(':')
      if (!key || !value) return
      
      const trimmedKey = key.trim()
      const trimmedValue = value.trim()
      
      if (trimmedValue.startsWith('"') && trimmedValue.endsWith('"')) {
        // Quoted string
        filters[trimmedKey] = trimmedValue.slice(1, -1)
      } else if (trimmedValue.includes('-')) {
        // Range
        const [min, max] = trimmedValue.split('-').map(Number)
        if (!isNaN(min) && !isNaN(max)) {
          filters[trimmedKey] = { min, max }
        }
      } else if (trimmedValue.includes(',')) {
        // Array
        filters[trimmedKey] = trimmedValue.split(',')
      } else if (trimmedValue === 'true' || trimmedValue === 'false') {
        // Boolean
        filters[trimmedKey] = trimmedValue === 'true'
      } else {
        // Default to string
        filters[trimmedKey] = trimmedValue
      }
    })
    
    return filters
  }
}

export class SearchEngine {
  /**
   * Check if Elasticsearch is available
   */
  static async isElasticsearchAvailable(): Promise<boolean> {
    if (!elasticsearchClient) return false;
    
    try {
      await elasticsearchClient.ping();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Index document in Elasticsearch
   */
  static async indexDocument(index: string, id: string, document: any): Promise<void> {
    if (!elasticsearchClient) return;

    try {
      await elasticsearchClient.index({
        index,
        id,
        body: document
      });
    } catch (error) {
      // console.error('Elasticsearch indexing error:', error);
    }
  }

  /**
   * Search with Elasticsearch or fallback to in-memory search
   */
  static async searchWithElasticsearch<T>(
    index: string,
    options: SearchOptions,
    fallbackItems?: T[],
    searchFields?: (keyof T)[]
  ): Promise<SearchResult<T>> {
    const isElasticsearchAvailable = await this.isElasticsearchAvailable();
    
    if (isElasticsearchAvailable && options.query) {
      return await this.performElasticsearchQuery<T>(index, options);
    } else if (fallbackItems && searchFields) {
      return this.search(fallbackItems, options, searchFields);
    } else {
      // Fallback to database search
      return await this.performDatabaseSearch<T>(options);
    }
  }

  /**
   * Perform Elasticsearch query
   */
  private static async performElasticsearchQuery<T>(
    index: string,
    options: SearchOptions
  ): Promise<SearchResult<T>> {
    const startTime = Date.now();
    const from = ((options.page || 1) - 1) * (options.limit || 20);

    try {
      // Build Elasticsearch query
      const query: any = {
        bool: {
          must: [],
          filter: []
        }
      };

      // Text search
      if (options.query) {
        query.bool.must.push({
          multi_match: {
            query: options.query,
            fields: ['name^3', 'description^2', 'category', 'farmer.farmName^2'],
            type: 'best_fields',
            fuzziness: options.fuzzy ? 'AUTO' : 0,
            operator: 'or'
          }
        });
      }

      // Apply filters
      if (options.filters) {
        Object.entries(options.filters).forEach(([key, value]) => {
          if (value === undefined || value === null || value === '') return;

          if (Array.isArray(value)) {
            query.bool.filter.push({ terms: { [key]: value } });
          } else if (typeof value === 'object' && value.min !== undefined && value.max !== undefined) {
            query.bool.filter.push({
              range: {
                [key]: {
                  gte: value.min,
                  lte: value.max
                }
              }
            });
          } else {
            query.bool.filter.push({ term: { [key]: value } });
          }
        });
      }

      // Sorting
      const sort: any[] = [];
      if (options.sortBy === 'relevance' || !options.sortBy) {
        sort.push('_score');
      } else {
        sort.push({ [options.sortBy]: { order: options.sortOrder || 'asc' } });
      }

      // Execute search
      const response = await elasticsearchClient.search({
        index,
        body: {
          query,
          sort,
          from,
          size: options.limit || 20,
          highlight: options.includeHighlights ? {
            fields: {
              name: {},
              description: {},
              'farmer.farmName': {}
            }
          } : undefined
        }
      });

      // Format results
      const items = response.body.hits.hits.map((hit: any) => ({
        ...hit._source,
        _score: hit._score,
        _highlights: hit.highlight
      }));

      const total = response.body.hits.total.value;
      const page = options.page || 1;
      const limit = options.limit || 20;
      const totalPages = Math.ceil(total / limit);

      return {
        items,
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        highlights: options.includeHighlights ? this.formatElasticsearchHighlights(response.body.hits.hits) : undefined
      };

    } catch (error) {
      // console.error('Elasticsearch search error:', error);
      // Fallback to database search
      return await this.performDatabaseSearch<T>(options);
    }
  }

  /**
   * Perform database search as fallback
   */
  private static async performDatabaseSearch<T>(options: SearchOptions): Promise<SearchResult<T>> {
    // This would implement database-specific search logic
    // For now, return empty results
    return {
      items: [],
      total: 0,
      page: options.page || 1,
      limit: options.limit || 20,
      totalPages: 0,
      hasNextPage: false,
      hasPrevPage: false
    };
  }

  /**
   * Format Elasticsearch highlights
   */
  private static formatElasticsearchHighlights(hits: any[]): Record<string, string[]> {
    const highlights: Record<string, string[]> = {};
    
    hits.forEach((hit, index) => {
      if (hit.highlight) {
        const itemHighlights: string[] = [];
        
        Object.entries(hit.highlight).forEach(([field, values]) => {
          itemHighlights.push(`${field}: ${(values as string[]).join(' ... ')}`);
        });
        
        if (itemHighlights.length > 0) {
          highlights[index] = itemHighlights;
        }
      }
    });
    
    return highlights;
  }

  /**
   * Get search suggestions from Elasticsearch
   */
  static async getSearchSuggestions(
    index: string,
    query: string,
    limit: number = 10
  ): Promise<Array<{ text: string; score: number }>> {
    if (!elasticsearchClient || !query || query.length < 2) return [];

    try {
      const response = await elasticsearchClient.search({
        index,
        body: {
          suggest: {
            text_suggest: {
              prefix: query,
              completion: {
                field: 'suggest',
                size: limit,
                fuzzy: {
                  fuzziness: 'AUTO'
                }
              }
            }
          }
        }
      });

      return response.body.suggest.text_suggest[0].options.map((option: any) => ({
        text: option.text,
        score: option._score
      }));
    } catch (error) {
      // console.error('Elasticsearch suggestions error:', error);
      return [];
    }
  }

  /**
   * Original in-memory search method
   */
  static search<T>(
    items: T[],
    options: SearchOptions,
    searchFields: (keyof T)[],
    filterConfigs?: FilterConfig[]
  ): SearchResult<T> {
    let results = [...items]
    
    // Apply text search
    if (options.query && options.query.trim()) {
      if (options.fuzzy) {
        const fuzzyResults = FuzzySearch.search(results, options.query, searchFields)
        results = fuzzyResults
      } else {
        const queryLower = options.query.toLowerCase()
        results = results.filter(item => {
          return searchFields.some(field => {
            const fieldValue = String(item[field] || '').toLowerCase()
            return fieldValue.includes(queryLower)
          })
        })
      }
    }
    
    // Apply filters
    if (options.filters && Object.keys(options.filters).length > 0) {
      results = AdvancedFilter.applyFilters(results, options.filters)
    }
    
    // Apply sorting
    if (options.sortBy) {
      results.sort((a, b) => {
        const aValue = this.getNestedValue(a, options.sortBy!)
        const bValue = this.getNestedValue(b, options.sortBy!)
        
        let comparison = 0
        if (aValue < bValue) comparison = -1
        else if (aValue > bValue) comparison = 1
        
        return options.sortOrder === 'desc' ? -comparison : comparison
      })
    }
    
    // Calculate pagination
    const total = results.length
    const page = options.page || 1
    const limit = options.limit || 20
    const totalPages = Math.ceil(total / limit)
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    
    const paginatedResults = results.slice(startIndex, endIndex)
    
    return {
      items: paginatedResults,
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      highlights: options.includeHighlights ? this.generateHighlights(paginatedResults, options.query, searchFields) : undefined
    }
  }

  private static getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj)
  }

  private static generateHighlights<T>(
    items: T[],
    query: string | undefined,
    searchFields: (keyof T)[]
  ): Record<string, string[]> {
    if (!query) return {}
    
    const highlights: Record<string, string[]> = {}
    const queryLower = query.toLowerCase()
    
    items.forEach((item, index) => {
      const itemHighlights: string[] = []
      
      searchFields.forEach(field => {
        const fieldValue = String(item[field] || '')
        const fieldValueLower = fieldValue.toLowerCase()
        
        if (fieldValueLower.includes(queryLower)) {
          const highlightedText = fieldValue.replace(
            new RegExp(query, 'gi'),
            `<mark>$&</mark>`
          )
          itemHighlights.push(`${String(field)}: ${highlightedText}`)
        }
      })
      
      if (itemHighlights.length > 0) {
        highlights[index] = itemHighlights
      }
    })
    
    return highlights
  }
}

// Interface for saved search with metadata
interface SavedSearch extends SearchOptions {
  savedAt: string
}

export class SavedSearchManager {
  private static STORAGE_KEY = 'agrotrack_saved_searches'

  static saveSearch(name: string, searchOptions: SearchOptions, userId: string): void {
    const savedSearches = this.getSavedSearches(userId)
    const savedSearch: SavedSearch = {
      ...searchOptions,
      savedAt: new Date().toISOString()
    }
    savedSearches[name] = savedSearch
    
    localStorage.setItem(`${this.STORAGE_KEY}_${userId}`, JSON.stringify(savedSearches))
  }

  static getSavedSearches(userId: string): Record<string, SavedSearch> {
    try {
      const saved = localStorage.getItem(`${this.STORAGE_KEY}_${userId}`)
      return saved ? JSON.parse(saved) : {}
    } catch {
      return {}
    }
  }

  static deleteSavedSearch(name: string, userId: string): void {
    const savedSearches = this.getSavedSearches(userId)
    delete savedSearches[name]
    localStorage.setItem(`${this.STORAGE_KEY}_${userId}`, JSON.stringify(savedSearches))
  }

  static loadSavedSearch(name: string, userId: string): SearchOptions | null {
    const savedSearches = this.getSavedSearches(userId)
    const search = savedSearches[name]
    if (!search) return null
    
    // Remove the savedAt property when returning SearchOptions
    const { savedAt, ...searchOptions } = search
    return searchOptions
  }
}

// Predefined filter configurations for different entities
export const PRODUCT_FILTERS: FilterConfig[] = [
  {
    field: 'category',
    type: 'select',
    label: 'Category',
    options: [
      { value: 'vegetables', label: 'Vegetables' },
      { value: 'fruits', label: 'Fruits' },
      { value: 'herbs', label: 'Herbs' },
      { value: 'grains', label: 'Grains' }
    ]
  },
  {
    field: 'price',
    type: 'range',
    label: 'Price Range',
    min: 0,
    max: 100
  },
  {
    field: 'organic',
    type: 'boolean',
    label: 'Organic Only'
  },
  {
    field: 'farmer.name',
    type: 'text',
    label: 'Farmer Name',
    searchable: true
  },
  {
    field: 'inStock',
    type: 'boolean',
    label: 'In Stock'
  }
]

export const FARMER_FILTERS: FilterConfig[] = [
  {
    field: 'status',
    type: 'select',
    label: 'Status',
    options: [
      { value: 'active', label: 'Active' },
      { value: 'inactive', label: 'Inactive' },
      { value: 'pending', label: 'Pending Approval' }
    ]
  },
  {
    field: 'qualityScore',
    type: 'range',
    label: 'Quality Score',
    min: 0,
    max: 10
  },
  {
    field: 'deliveryRate',
    type: 'range',
    label: 'Delivery Rate (%)',
    min: 0,
    max: 100
  },
  {
    field: 'location.state',
    type: 'select',
    label: 'State',
    options: [
      { value: 'CA', label: 'California' },
      { value: 'OR', label: 'Oregon' },
      { value: 'WA', label: 'Washington' }
    ]
  },
  {
    field: 'certifications',
    type: 'multiselect',
    label: 'Certifications',
    options: [
      { value: 'organic', label: 'USDA Organic' },
      { value: 'gap', label: 'Good Agricultural Practices' },
      { value: 'fair-trade', label: 'Fair Trade' }
    ]
  }
]

export const ORDER_FILTERS: FilterConfig[] = [
  {
    field: 'status',
    type: 'select',
    label: 'Order Status',
    options: [
      { value: 'pending', label: 'Pending' },
      { value: 'confirmed', label: 'Confirmed' },
      { value: 'preparing', label: 'Preparing' },
      { value: 'out_for_delivery', label: 'Out for Delivery' },
      { value: 'delivered', label: 'Delivered' },
      { value: 'cancelled', label: 'Cancelled' }
    ]
  },
  {
    field: 'total',
    type: 'range',
    label: 'Order Total',
    min: 0,
    max: 500
  },
  {
    field: 'deliveryDate',
    type: 'date',
    label: 'Delivery Date'
  },
  {
    field: 'customer.name',
    type: 'text',
    label: 'Customer Name',
    searchable: true
  },
  {
    field: 'deliveryZone',
    type: 'select',
    label: 'Delivery Zone',
    options: [
      { value: 'zone-1', label: 'Downtown' },
      { value: 'zone-2', label: 'Suburbs North' },
      { value: 'zone-3', label: 'Suburbs South' }
    ]
  }
]

export const QC_RESULT_FILTERS: FilterConfig[] = [
  {
    field: 'acceptanceRate',
    type: 'range',
    label: 'Acceptance Rate (%)',
    min: 0,
    max: 100
  },
  {
    field: 'farmer.name',
    type: 'text',
    label: 'Farmer Name',
    searchable: true
  },
  {
    field: 'product.name',
    type: 'text',
    label: 'Product Name',
    searchable: true
  },
  {
    field: 'inspectedAt',
    type: 'date',
    label: 'Inspection Date'
  },
  {
    field: 'rejectionReasons',
    type: 'multiselect',
    label: 'Rejection Reasons',
    options: [
      { value: 'size_inconsistency', label: 'Size Inconsistency' },
      { value: 'quality_degradation', label: 'Quality Degradation' },
      { value: 'pest_damage', label: 'Pest Damage' },
      { value: 'overripe', label: 'Overripe' },
      { value: 'packaging_issues', label: 'Packaging Issues' }
    ]
  }
]