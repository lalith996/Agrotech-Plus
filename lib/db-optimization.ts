import { PrismaClient } from '@prisma/client';
// Import cache service instead of helpers
import { cacheService } from './redis';

// Database connection pool configuration
const prismaConfig = {
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  log: process.env.NODE_ENV === 'development' ? 
    ['query', 'info', 'warn', 'error'] as any[] : 
    ['error'] as any[],
};

// Enhanced Prisma client with connection pooling
export const prisma = new PrismaClient(prismaConfig);

// Query performance monitoring
class QueryPerformanceMonitor {
  private static queryTimes = new Map<string, number[]>();
  private static slowQueryThreshold = 1000; // 1 second

  static startQuery(queryName: string): () => void {
    const startTime = Date.now();
    
    return () => {
      const duration = Date.now() - startTime;
      this.recordQuery(queryName, duration);
      
      if (duration > this.slowQueryThreshold) {
        // console.warn(`Slow query detected: ${queryName} took ${duration}ms`);
      }
    };
  }

  private static recordQuery(queryName: string, duration: number): void {
    if (!this.queryTimes.has(queryName)) {
      this.queryTimes.set(queryName, []);
    }
    
    const times = this.queryTimes.get(queryName)!;
    times.push(duration);
    
    // Keep only last 100 measurements
    if (times.length > 100) {
      times.shift();
    }
  }

  static getQueryStats(queryName?: string) {
    if (queryName) {
      const times = this.queryTimes.get(queryName) || [];
      if (times.length === 0) return null;
      
      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      const min = Math.min(...times);
      const max = Math.max(...times);
      
      return { queryName, avg, min, max, count: times.length };
    }
    
    const allStats: Record<string, any> = {};
    for (const [name, times] of Array.from(this.queryTimes.entries())) {
      const avg = times.reduce((a: number, b: number) => a + b, 0) / times.length;
      const min = Math.min(...times);
      const max = Math.max(...times);
      
      allStats[name] = { avg, min, max, count: times.length };
    }
    
    return allStats;
  }
}

// Optimized query builder
class OptimizedQueryBuilder {
  /**
   * Build optimized select fields to reduce data transfer
   */
  static selectFields<T>(fields: (keyof T)[]): Record<string, boolean> {
    return fields.reduce((acc, field) => {
      acc[field as string] = true;
      return acc;
    }, {} as Record<string, boolean>);
  }

  /**
   * Build pagination with proper indexing
   */
  static buildPagination(page: number = 1, limit: number = 20) {
    const skip = Math.max(0, (page - 1) * limit);
    const take = Math.min(limit, 100); // Cap at 100 items per page
    
    return { skip, take };
  }

  /**
   * Build search where clause with full-text search
   */
  static buildSearchWhere(query: string, fields: string[]) {
    if (!query?.trim()) return {};
    
    const searchTerm = query.trim();
    
    return {
      OR: [
        // Exact matches (higher priority)
        ...fields.map(field => ({
          [field]: {
            equals: searchTerm,
            mode: 'insensitive' as const
          }
        })),
        // Partial matches
        ...fields.map(field => ({
          [field]: {
            contains: searchTerm,
            mode: 'insensitive' as const
          }
        })),
        // Word matches
        ...fields.map(field => ({
          [field]: {
            search: searchTerm.split(' ').join(' & ')
          }
        }))
      ]
    };
  }

  /**
   * Build optimized include for related data
   */
  static buildOptimizedInclude(includes: Record<string, any>) {
    const optimized: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(includes)) {
      if (typeof value === 'boolean' && value) {
        // Simple include - add basic optimization
        optimized[key] = {
          select: this.getDefaultSelectForModel(key)
        };
      } else if (typeof value === 'object') {
        // Complex include - preserve configuration
        optimized[key] = value;
      }
    }
    
    return optimized;
  }

  /**
   * Get default select fields for common models
   */
  private static getDefaultSelectForModel(modelName: string): Record<string, boolean> {
    const defaultSelects: Record<string, Record<string, boolean>> = {
      user: { id: true, name: true, email: true, role: true },
      product: { id: true, name: true, category: true, basePrice: true, unit: true, images: true },
      farmer: { id: true, farmName: true, location: true, isApproved: true },
      customer: { id: true, phone: true },
      order: { id: true, status: true, totalAmount: true, deliveryDate: true, createdAt: true },
      subscription: { id: true, status: true, deliveryZone: true, deliveryDay: true }
    };
    
    return defaultSelects[modelName.toLowerCase()] || { id: true };
  }
}

// Cached query wrapper
class CachedQueryService {
  /**
   * Execute query with caching
   */
  static async executeWithCache<T>(
    cacheKey: string,
    queryFn: () => Promise<T>,
    ttl: number = 300
  ): Promise<T> {
    const endTimer = QueryPerformanceMonitor.startQuery(cacheKey);
    
    try {
      const result = await cacheService.get(
        cacheKey,
        queryFn,
        { redisTTL: ttl, memoryTTL: Math.min(ttl, 300) }
      );
      
      return result;
    } finally {
      endTimer();
    }
  }

  /**
   * Get products with caching and optimization
   */
  static async getProducts(filters: {
    category?: string;
    farmerId?: string;
    search?: string;
    page?: number;
    limit?: number;
  } = {}) {
    const { page = 1, limit = 20, category, farmerId, search } = filters;
    const cacheKey = `products:${JSON.stringify(filters)}`;
    
    return this.executeWithCache(
      cacheKey,
      async () => {
        const where: any = { isActive: true };
        
        if (category) {
          where.category = category;
        }
        
        if (farmerId) {
          where.farmerId = farmerId;
        }
        
        if (search) {
          Object.assign(where, OptimizedQueryBuilder.buildSearchWhere(search, ['name', 'description']));
        }
        
        const [products, total] = await Promise.all([
          prisma.product.findMany({
            where,
            select: {
              id: true,
              name: true,
              category: true,
              description: true,
              images: true,
              basePrice: true,
              unit: true,
              farmer: {
                select: {
                  id: true,
                  farmName: true,
                  location: true,
                  isApproved: true
                }
              }
            },
            ...OptimizedQueryBuilder.buildPagination(page, limit),
            orderBy: [
              { name: 'asc' }
            ]
          }),
          prisma.product.count({ where })
        ]);
        
        return {
          products,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
          }
        };
      },
      300 // 5 minutes cache
    );
  }

  /**
   * Get user dashboard data with caching
   */
  static async getUserDashboard(userId: string, role: string) {
    const cacheKey = `dashboard:${userId}:${role}`;
    
    return this.executeWithCache(
      cacheKey,
      async () => {
        const baseUser = await prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true
          }
        });
        
        if (!baseUser) throw new Error('User not found');
        
        let roleSpecificData = {};
        
        if (role === 'CUSTOMER') {
          const customer = await prisma.customer.findUnique({
            where: { userId },
            select: {
              id: true,
              phone: true,
              subscriptions: {
                select: {
                  id: true,
                  status: true,
                  deliveryZone: true,
                  deliveryDay: true,
                  items: {
                    select: {
                      quantity: true,
                      product: {
                        select: {
                          name: true,
                          basePrice: true,
                          unit: true
                        }
                      }
                    }
                  }
                },
                where: { status: 'ACTIVE' }
              },
              orders: {
                select: {
                  id: true,
                  status: true,
                  totalAmount: true,
                  deliveryDate: true
                },
                orderBy: { createdAt: 'desc' },
                take: 5
              }
            }
          });
          
          roleSpecificData = { customer };
        } else if (role === 'FARMER') {
          const farmer = await prisma.farmer.findUnique({
            where: { userId },
            select: {
              id: true,
              farmName: true,
              location: true,
              isApproved: true,
              products: {
                select: {
                  id: true,
                  name: true,
                  category: true,
                  isActive: true
                }
              },
              deliveries: {
                select: {
                  id: true,
                  deliveryDate: true,
                  status: true
                },
                orderBy: { deliveryDate: 'desc' },
                take: 5
              }
            }
          });
          
          roleSpecificData = { farmer };
        }
        
        return {
          user: baseUser,
          ...roleSpecificData
        };
      },
      600 // 10 minutes cache for dashboard
    );
  }

  /**
   * Get orders with optimized queries
   */
  static async getOrders(filters: {
    customerId?: string;
    farmerId?: string;
    status?: string;
    page?: number;
    limit?: number;
  } = {}) {
    const { page = 1, limit = 20, customerId, farmerId, status } = filters;
    const cacheKey = `orders:${JSON.stringify(filters)}`;
    
    return this.executeWithCache(
      cacheKey,
      async () => {
        const where: any = {};
        
        if (customerId) {
          where.customerId = customerId;
        }
        
        if (status) {
          where.status = status;
        }
        
        if (farmerId) {
          where.items = {
            some: {
              product: {
                farmerId
              }
            }
          };
        }
        
        const [orders, total] = await Promise.all([
          prisma.order.findMany({
            where,
            select: {
              id: true,
              status: true,
              totalAmount: true,
              deliveryDate: true,
              createdAt: true,
              customer: {
                select: {
                  id: true,
                  user: {
                    select: {
                      name: true,
                      email: true
                    }
                  }
                }
              },
              items: {
                select: {
                  quantity: true,
                  price: true,
                  product: {
                    select: {
                      id: true,
                      name: true,
                      unit: true,
                      farmer: {
                        select: {
                          farmName: true
                        }
                      }
                    }
                  }
                }
              },
              address: {
                select: {
                  name: true,
                  street: true,
                  city: true
                }
              }
            },
            ...OptimizedQueryBuilder.buildPagination(page, limit),
            orderBy: { createdAt: 'desc' }
          }),
          prisma.order.count({ where })
        ]);
        
        return {
          orders,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
          }
        };
      },
      180 // 3 minutes cache for orders
    );
  }

  /**
   * Invalidate related caches when data changes
   */
  static async invalidateRelatedCaches(entity: string, entityId?: string) {
    const patterns = {
      product: [`products:*`, `dashboard:*`],
      order: [`orders:*`, `dashboard:*`],
      user: [`dashboard:${entityId}:*`],
      farmer: [`products:*`, `dashboard:*`],
      subscription: [`dashboard:*`]
    };
    
    const patternsToInvalidate = patterns[entity as keyof typeof patterns] || [];
    
    for (const pattern of patternsToInvalidate) {
      await cacheService.invalidate(pattern);
    }
  }
}

// Database health monitoring
class DatabaseHealthMonitor {
  static async checkHealth() {
    try {
      const startTime = Date.now();
      
      // Simple query to test connection
      await prisma.$queryRaw`SELECT 1`;
      
      const responseTime = Date.now() - startTime;
      
      // Get basic connection info
      const connectionInfo = {
        connected: true,
        queriesExecuted: 1
      };
      
      return {
        status: 'healthy',
        responseTime,
        connectionInfo,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }

  static async getSlowQueries() {
    return QueryPerformanceMonitor.getQueryStats();
  }
}

// Connection management
export async function connectDatabase() {
  try {
    await prisma.$connect();
    // console.log('Database connected successfully');
  } catch (error) {
    // console.error('Database connection failed:', error);
    throw error;
  }
}

export async function disconnectDatabase() {
  try {
    await prisma.$disconnect();
    // console.log('Database disconnected successfully');
  } catch (error) {
    // console.error('Database disconnection failed:', error);
  }
}

// Graceful shutdown
process.on('beforeExit', async () => {
  await disconnectDatabase();
});

process.on('SIGINT', async () => {
  await disconnectDatabase();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await disconnectDatabase();
  process.exit(0);
});

export {
  QueryPerformanceMonitor,
  OptimizedQueryBuilder,
  CachedQueryService,
  DatabaseHealthMonitor
};