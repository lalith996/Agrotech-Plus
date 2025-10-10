import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/router"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts'
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  ShoppingCart, 
  DollarSign, 
  Package,
  Download,
  Calendar,
  Filter,
  RefreshCw
} from "lucide-react"
import { UserRole } from "@prisma/client"
import { toast } from "sonner"

interface AnalyticsData {
  customerMetrics: {
    totalCustomers: number
    activeSubscriptions: number
    churnRate: number
    averageOrderValue: number
    customerLifetimeValue: number
    newCustomersThisMonth: number
    subscriptionGrowthRate: number
  }
  farmerMetrics: {
    totalFarmers: number
    activeFarmers: number
    averageQualityScore: number
    onTimeDeliveryRate: number
    totalProductsSupplied: number
    farmerRetentionRate: number
    averageYield: number
  }
  operationsMetrics: {
    totalOrders: number
    completedDeliveries: number
    averageDeliveryTime: number
    inventoryTurnover: number
    procurementEfficiency: number
    routeOptimizationSavings: number
    qcPassRate: number
  }
  financialMetrics: {
    totalRevenue: number
    monthlyRecurringRevenue: number
    grossMargin: number
    customerAcquisitionCost: number
    revenueGrowthRate: number
    profitMargin: number
    averageRevenuePerUser: number
  }
  chartData: {
    revenueOverTime: Array<{ month: string; revenue: number; orders: number }>
    customerGrowth: Array<{ month: string; customers: number; churn: number }>
    farmerPerformance: Array<{ name: string; qualityScore: number; deliveryRate: number; volume: number }>
    productPopularity: Array<{ name: string; orders: number; revenue: number }>
    deliveryMetrics: Array<{ date: string; onTime: number; delayed: number; cancelled: number }>
  }
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D']

export default function AnalyticsDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [dateRange, setDateRange] = useState("30")
  const [activeTab, setActiveTab] = useState("overview")
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin")
      return
    }

    if (status === "authenticated") {
      if (session.user.role !== UserRole.ADMIN && session.user.role !== UserRole.OPERATIONS) {
        router.push("/")
        return
      }
      fetchAnalyticsData()
    }
  }, [status, session, router, dateRange])

  const fetchAnalyticsData = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/admin/analytics?days=${dateRange}`)
      if (!response.ok) throw new Error("Failed to fetch analytics data")
      
      const data = await response.json()
      setAnalyticsData(data.analytics)
    } catch (error) {
      // console.error("Error fetching analytics:", error)
      toast.error("Failed to load analytics data")
    } finally {
      setIsLoading(false)
    }
  }

  const refreshData = async () => {
    setIsRefreshing(true)
    await fetchAnalyticsData()
    setIsRefreshing(false)
    toast.success("Analytics data refreshed")
  }

  const exportData = async (type: string) => {
    try {
      const response = await fetch(`/api/admin/analytics/export?type=${type}&days=${dateRange}`)
      if (!response.ok) throw new Error("Failed to export data")
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      a.download = `${type}-analytics-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      
      toast.success(`${type} data exported successfully`)
    } catch (error) {
      // console.error("Error exporting data:", error)
      toast.error("Failed to export data")
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  const getMetricTrend = (current: number, previous: number) => {
    const change = ((current - previous) / previous) * 100
    return {
      value: Math.abs(change),
      isPositive: change > 0,
      icon: change > 0 ? TrendingUp : TrendingDown,
      color: change > 0 ? 'text-green-600' : 'text-red-600'
    }
  }

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600"></div>
      </div>
    )
  }

  if (!analyticsData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">No Analytics Data Available</h2>
          <Button onClick={fetchAnalyticsData}>Retry Loading</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Analytics Dashboard</h1>
              <p className="text-gray-600">Comprehensive business intelligence and reporting</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Label htmlFor="dateRange">Time Period</Label>
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">Last 7 days</SelectItem>
                    <SelectItem value="30">Last 30 days</SelectItem>
                    <SelectItem value="90">Last 90 days</SelectItem>
                    <SelectItem value="365">Last year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="outline"
                onClick={refreshData}
                disabled={isRefreshing}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                variant="outline"
                onClick={() => exportData('all')}
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="customers">Customers</TabsTrigger>
            <TabsTrigger value="farmers">Farmers</TabsTrigger>
            <TabsTrigger value="operations">Operations</TabsTrigger>
            <TabsTrigger value="financial">Financial</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Key Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {formatCurrency(analyticsData.financialMetrics.totalRevenue)}
                      </p>
                    </div>
                    <DollarSign className="w-8 h-8 text-green-600" />
                  </div>
                  <div className="mt-4 flex items-center text-sm">
                    <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
                    <span className="text-green-600">+12.5%</span>
                    <span className="text-gray-600 ml-1">from last period</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Active Customers</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {analyticsData.customerMetrics.totalCustomers.toLocaleString()}
                      </p>
                    </div>
                    <Users className="w-8 h-8 text-blue-600" />
                  </div>
                  <div className="mt-4 flex items-center text-sm">
                    <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
                    <span className="text-green-600">+8.2%</span>
                    <span className="text-gray-600 ml-1">from last period</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Orders</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {analyticsData.operationsMetrics.totalOrders.toLocaleString()}
                      </p>
                    </div>
                    <ShoppingCart className="w-8 h-8 text-purple-600" />
                  </div>
                  <div className="mt-4 flex items-center text-sm">
                    <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
                    <span className="text-green-600">+15.3%</span>
                    <span className="text-gray-600 ml-1">from last period</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Active Farmers</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {analyticsData.farmerMetrics.activeFarmers}
                      </p>
                    </div>
                    <Package className="w-8 h-8 text-orange-600" />
                  </div>
                  <div className="mt-4 flex items-center text-sm">
                    <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
                    <span className="text-green-600">+5.7%</span>
                    <span className="text-gray-600 ml-1">from last period</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Revenue and Orders Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Revenue & Orders Trend</CardTitle>
                <CardDescription>Monthly revenue and order volume over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={analyticsData.chartData.revenueOverTime}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="revenue"
                      stackId="1"
                      stroke="#8884d8"
                      fill="#8884d8"
                      name="Revenue ($)"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="orders"
                      stroke="#82ca9d"
                      name="Orders"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Product Popularity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Product Popularity</CardTitle>
                  <CardDescription>Most ordered products by volume</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={analyticsData.chartData.productPopularity}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="orders"
                      >
                        {analyticsData.chartData.productPopularity.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Delivery Performance</CardTitle>
                  <CardDescription>On-time vs delayed deliveries</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={analyticsData.chartData.deliveryMetrics}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="onTime" stackId="a" fill="#00C49F" name="On Time" />
                      <Bar dataKey="delayed" stackId="a" fill="#FFBB28" name="Delayed" />
                      <Bar dataKey="cancelled" stackId="a" fill="#FF8042" name="Cancelled" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Customer Analytics Tab */}
          <TabsContent value="customers" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-600">Customer Lifetime Value</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">
                      {formatCurrency(analyticsData.customerMetrics.customerLifetimeValue)}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-600">Churn Rate</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">
                      {formatPercentage(analyticsData.customerMetrics.churnRate)}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-600">Average Order Value</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">
                      {formatCurrency(analyticsData.customerMetrics.averageOrderValue)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Customer Growth & Churn</CardTitle>
                <CardDescription>New customers vs churn rate over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={analyticsData.chartData.customerGrowth}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="customers" stroke="#8884d8" name="New Customers" />
                    <Line type="monotone" dataKey="churn" stroke="#82ca9d" name="Churn Rate %" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Farmer Analytics Tab */}
          <TabsContent value="farmers" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-600">Average Quality Score</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">
                      {analyticsData.farmerMetrics.averageQualityScore.toFixed(1)}/10
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-600">On-Time Delivery Rate</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">
                      {formatPercentage(analyticsData.farmerMetrics.onTimeDeliveryRate)}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-600">Farmer Retention Rate</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">
                      {formatPercentage(analyticsData.farmerMetrics.farmerRetentionRate)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Farmer Performance Comparison</CardTitle>
                <CardDescription>Quality score vs delivery rate by farmer</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={analyticsData.chartData.farmerPerformance}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="qualityScore" fill="#8884d8" name="Quality Score" />
                    <Bar dataKey="deliveryRate" fill="#82ca9d" name="Delivery Rate %" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Operations Tab */}
          <TabsContent value="operations" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-600">Completed Deliveries</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">
                      {analyticsData.operationsMetrics.completedDeliveries.toLocaleString()}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-600">Avg Delivery Time</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">
                      {analyticsData.operationsMetrics.averageDeliveryTime}h
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-600">QC Pass Rate</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">
                      {formatPercentage(analyticsData.operationsMetrics.qcPassRate)}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-600">Route Savings</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">
                      {formatCurrency(analyticsData.operationsMetrics.routeOptimizationSavings)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Financial Tab */}
          <TabsContent value="financial" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-600">Monthly Recurring Revenue</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">
                      {formatCurrency(analyticsData.financialMetrics.monthlyRecurringRevenue)}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-600">Gross Margin</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">
                      {formatPercentage(analyticsData.financialMetrics.grossMargin)}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-600">Customer Acquisition Cost</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">
                      {formatCurrency(analyticsData.financialMetrics.customerAcquisitionCost)}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-600">Revenue Growth Rate</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">
                      {formatPercentage(analyticsData.financialMetrics.revenueGrowthRate)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}