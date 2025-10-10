import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'

interface HealthCheck {
  status: 'healthy' | 'unhealthy'
  timestamp: string
  version: string
  environment: string
  checks: {
    database: {
      status: 'up' | 'down'
      responseTime?: number
      error?: string
    }
    memory: {
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
    let dbStatus: 'up' | 'down' = 'down'
    let dbResponseTime: number | undefined
    let dbError: string | undefined

    try {
      const dbStartTime = Date.now()
      await prisma.$queryRaw`SELECT 1`
      dbResponseTime = Date.now() - dbStartTime
      dbStatus = 'up'
    } catch (error) {
      dbError = error instanceof Error ? error.message : 'Unknown database error'
    }

    // Memory usage
    const memoryUsage = process.memoryUsage()
    const memoryPercentage = Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100)

    // System uptime
    const uptime = process.uptime()

    // Overall health status
    const isHealthy = dbStatus === 'up' && memoryPercentage < 90

    const healthCheck: HealthCheck = {
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      checks: {
        database: {
          status: dbStatus,
          responseTime: dbResponseTime,
          error: dbError
        },
        memory: {
          used: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
          total: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
          percentage: memoryPercentage
        },
        uptime: Math.round(uptime)
      }
    }

    const statusCode = isHealthy ? 200 : 503
    res.status(statusCode).json(healthCheck)

  } catch (error) {
    // console.error('Health check error:', error)
    
    const errorHealthCheck: HealthCheck = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      checks: {
        database: {
          status: 'down',
          error: 'Health check failed'
        },
        memory: {
          used: 0,
          total: 0,
          percentage: 0
        },
        uptime: 0
      }
    }

    res.status(503).json(errorHealthCheck)
  }
}