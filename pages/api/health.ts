import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { cacheService } from '@/lib/redis'
import { logError, logWarn } from '@/lib/logger'

interface ServiceCheck {
  status: 'up' | 'down' | 'degraded'
  responseTime?: number
  error?: string
  details?: Record<string, any>
}

interface HealthCheck {
  status: 'healthy' | 'unhealthy' | 'degraded'
  timestamp: string
  version: string
  environment: string
  responseTime: number
  checks: {
    database: ServiceCheck
    cache: ServiceCheck
    memory: {
      status: 'up' | 'down' | 'degraded'
      used: number
      total: number
      percentage: number
    }
    uptime: number
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<HealthCheck>) {
  const startTime = Date.now()

  try {
    // Database health check
    let databaseCheck: ServiceCheck = { status: 'down' }

    try {
      const dbStartTime = Date.now()
      await prisma.$queryRaw`SELECT 1`
      databaseCheck = {
        status: 'up',
        responseTime: Date.now() - dbStartTime,
      }
    } catch (error) {
      databaseCheck = {
        status: 'down',
        error: error instanceof Error ? error.message : 'Unknown database error',
      }
      logError('Database health check failed', error instanceof Error ? error : new Error(String(error)))
    }

    // Cache health check (Redis + Memory)
    let cacheCheck: ServiceCheck = { status: 'down' }

    try {
      const cacheHealth = await cacheService.checkHealth()

      if (cacheHealth.redis.healthy) {
        cacheCheck = {
          status: 'up',
          responseTime: cacheHealth.redis.latency,
          details: {
            redis: {
              status: cacheHealth.redis.status,
              latency: cacheHealth.redis.latency,
            },
            memory: {
              healthy: cacheHealth.memory.healthy,
            },
          },
        }
      } else if (cacheHealth.memory.healthy) {
        // Redis down but memory cache working
        cacheCheck = {
          status: 'degraded',
          error: cacheHealth.redis.error,
          details: {
            redis: {
              status: cacheHealth.redis.status,
              error: cacheHealth.redis.error,
            },
            memory: {
              healthy: true,
            },
          },
        }
        logWarn('Redis is down, using memory cache only', {
          redisStatus: cacheHealth.redis.status,
          error: cacheHealth.redis.error,
        })
      } else {
        cacheCheck = {
          status: 'down',
          error: 'Cache service unavailable',
        }
        logError('Cache health check failed', new Error('Both Redis and memory cache unavailable'))
      }
    } catch (error) {
      cacheCheck = {
        status: 'down',
        error: error instanceof Error ? error.message : 'Unknown cache error',
      }
      logError('Cache health check failed', error instanceof Error ? error : new Error(String(error)))
    }

    // Memory usage
    const memoryUsage = process.memoryUsage()
    const memoryPercentage = Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100)

    // Determine memory status based on usage
    let memoryStatus: 'up' | 'down' | 'degraded' = 'up'
    if (memoryPercentage >= 90) {
      memoryStatus = 'down'
      logError('Critical memory usage', new Error(`Memory usage at ${memoryPercentage}%`))
    } else if (memoryPercentage >= 75) {
      memoryStatus = 'degraded'
      logWarn('High memory usage', { percentage: memoryPercentage })
    }

    // System uptime
    const uptime = process.uptime()

    // Overall health status
    const criticalServicesDown =
      databaseCheck.status === 'down' || memoryStatus === 'down'
    const servicesGood =
      databaseCheck.status === 'up' &&
      memoryStatus === 'up' &&
      cacheCheck.status !== 'down'

    let overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy'
    if (criticalServicesDown) {
      overallStatus = 'unhealthy'
    } else if (!servicesGood) {
      overallStatus = 'degraded'
    }

    const healthCheck: HealthCheck = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      responseTime: Date.now() - startTime,
      checks: {
        database: databaseCheck,
        cache: cacheCheck,
        memory: {
          status: memoryStatus,
          used: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
          total: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
          percentage: memoryPercentage,
        },
        uptime: Math.round(uptime),
      },
    }

    // Return appropriate status code
    const statusCode =
      overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 200 : 503

    res.status(statusCode).json(healthCheck)
  } catch (error) {
    logError('Health check error', error instanceof Error ? error : new Error(String(error)))

    const errorHealthCheck: HealthCheck = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      responseTime: Date.now() - startTime,
      checks: {
        database: {
          status: 'down',
          error: 'Health check failed',
        },
        cache: {
          status: 'down',
          error: 'Health check failed',
        },
        memory: {
          status: 'down',
          used: 0,
          total: 0,
          percentage: 0,
        },
        uptime: 0,
      },
    }

    res.status(503).json(errorHealthCheck)
  }
}