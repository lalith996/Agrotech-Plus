import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/router"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts"
import { TrendingUp, Award, AlertTriangle, CheckCircle, Target } from "lucide-react"
import { UserRole } from "@prisma/client"

interface QCInsight {
  productName: string
  totalDeliveries: number
  averageAcceptanceRate: number
  trend: "up" | "down" | "stable"
  recentIssues: string[]
  recommendations: string[]
}

interface PerformanceData {
  month: string
  acceptanceRate: number
  revenue: number
  deliveries: number
}

interface FarmerInsights {
  overallQCScore: number
  totalRevenue: number
  totalDeliveries: number
  performanceData: PerformanceData[]
  productInsights: QCInsight[]
  achievements: Array<{
    id: string
    title: string
    description: string
    earnedDate: string
    icon: string
  }>
}

export default function FarmerInsights() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [insights, setInsights] = useState<FarmerInsights | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin")
      return
    }

    if (status === "authenticated") {
      if (session.user.role !== UserRole.FARMER) {
        router.push("/")
        return
      }
      fetchInsights()
    }
  }, [status, session, router])

  const fetchInsights = async () => {
    try {
      const response = await fetch("/api/farmer/insights")
      if (!response.ok) throw new Error("Failed to fetch insights")
      const data = await response.json()
      setInsights(data.insights)
    } catch (error) {
      // console.error("Error fetching insights:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(price)
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "up":
        return <TrendingUp className="w-4 h-4 text-green-600" />
      case "down":
        return <TrendingUp className="w-4 h-4 text-red-600 rotate-180" />
      default:
        return <Target className="w-4 h-4 text-gray-600" />
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600"
    if (score >= 70) return "text-yellow-600"
    return "text-red-600"
  }

  if (status === "loading" || isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!insights) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Insights Unavailable</h1>
          <p className="text-gray-600">Unable to load performance insights.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Performance Insights</h1>
        <p className="text-gray-600">Track your quality performance and revenue trends</p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall QC Score</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getScoreColor(insights.overallQCScore)}`}>
              {insights.overallQCScore.toFixed(1)}%
            </div>
            <Progress value={insights.overallQCScore} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPrice(insights.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              From {insights.totalDeliveries} deliveries
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Achievements</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{insights.achievements.length}</div>
            <p className="text-xs text-muted-foreground">
              Milestones earned
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Performance Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Quality Performance Trend</CardTitle>
            <CardDescription>Your acceptance rate over the last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={insights.performanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="acceptanceRate" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  name="Acceptance Rate (%)"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
            <CardDescription>Monthly revenue from deliveries</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={insights.performanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => formatPrice(value as number)} />
                <Bar dataKey="revenue" fill="#3b82f6" name="Revenue" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Product Insights */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Product Performance</CardTitle>
          <CardDescription>Quality insights for each of your products</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {insights.productInsights.map((product, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-semibold text-lg">{product.productName}</h4>
                    <p className="text-sm text-gray-600">
                      {product.totalDeliveries} deliveries
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getTrendIcon(product.trend)}
                    <span className={`font-semibold ${getScoreColor(product.averageAcceptanceRate)}`}>
                      {product.averageAcceptanceRate.toFixed(1)}%
                    </span>
                  </div>
                </div>

                {product.recentIssues.length > 0 && (
                  <div className="mb-3">
                    <h5 className="font-medium text-red-800 mb-2 flex items-center">
                      <AlertTriangle className="w-4 h-4 mr-2" />
                      Recent Issues
                    </h5>
                    <div className="flex flex-wrap gap-2">
                      {product.recentIssues.map((issue, i) => (
                        <Badge key={i} variant="destructive" className="text-xs">
                          {issue}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {product.recommendations.length > 0 && (
                  <div>
                    <h5 className="font-medium text-blue-800 mb-2 flex items-center">
                      <Target className="w-4 h-4 mr-2" />
                      Recommendations
                    </h5>
                    <ul className="text-sm text-blue-700 space-y-1">
                      {product.recommendations.map((rec, i) => (
                        <li key={i} className="flex items-start">
                          <span className="mr-2">•</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Achievements */}
      {insights.achievements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Your Achievements</CardTitle>
            <CardDescription>Milestones you've earned for quality performance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {insights.achievements.map((achievement) => (
                <div key={achievement.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                  <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                    <Award className="w-5 h-5 text-yellow-600" />
                  </div>
                  <div>
                    <h4 className="font-medium">{achievement.title}</h4>
                    <p className="text-sm text-gray-600">{achievement.description}</p>
                    <p className="text-xs text-gray-500">
                      Earned on {new Date(achievement.earnedDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}