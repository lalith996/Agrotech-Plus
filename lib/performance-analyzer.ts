/**
 * Performance Analyzer
 * Analyzes system performance metrics and identifies bottlenecks
 */

export interface PerformanceMetric {
  name: string
  value: number
  unit: string
  threshold: number
  status: 'good' | 'warning' | 'critical'
  timestamp: Date
}

export interface PerformanceReport {
  summary: {
    overallScore: number
    criticalIssues: number
    warnings: number
    recommendations: string[]
  }
  metrics: {
    api: PerformanceMetric[]
    database: PerformanceMetric[]
    cache: PerformanceMetric[]
    frontend: PerformanceMetric[]
  }
}

export class PerformanceAnalyzer {
  private metrics: Map<string, PerformanceMetric[]> = new Map()

  recordMetric(
    category: string,
    name: string,
    value: number,
    unit: string,
    threshold: number
  ): void {
    const status = this.determineStatus(value, threshold)
    
    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      threshold,
      status,
      timestamp: new Date(),
    }

    if (!this.metrics.has(category)) {
      this.metrics.set(category, [])
    }

    this.metrics.get(category)!.push(metric)
  }

  private determineStatus(value: number, threshold: number): 'good' | 'warning' | 'critical' {
    if (value <= threshold) return 'good'
    if (value <= threshold * 1.5) return 'warning'
    return 'critical'
  }

  generateReport(): PerformanceReport {
    let totalMetrics = 0
    let goodMetrics = 0

    this.metrics.forEach(metrics => {
      metrics.forEach(metric => {
        totalMetrics++
        if (metric.status === 'good') goodMetrics++
      })
    })

    const overallScore = totalMetrics > 0 ? Math.round((goodMetrics / totalMetrics) * 100) : 0
    const criticalIssues = Array.from(this.metrics.values())
      .flat()
      .filter(m => m.status === 'critical').length

    return {
      summary: {
        overallScore,
        criticalIssues,
        warnings: 0,
        recommendations: [],
      },
      metrics: {
        api: this.metrics.get('api') || [],
        database: this.metrics.get('database') || [],
        cache: this.metrics.get('cache') || [],
        frontend: this.metrics.get('frontend') || [],
      },
    }
  }

  clear(): void {
    this.metrics.clear()
  }
}

export const performanceAnalyzer = new PerformanceAnalyzer()
