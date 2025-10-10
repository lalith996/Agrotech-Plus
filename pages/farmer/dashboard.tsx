import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/router"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { FarmerLayout } from "@/components/farmer/farmer-layout"
import { 
  Package, 
  ShoppingBag,
  TrendingUp, 
  IndianRupee,
  Plus,
  User,
  Eye
} from "lucide-react"
import { UserRole } from "@prisma/client"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"

interface DashboardStats {
  farmName: string
  totalProducts: number
  activeProducts: number
  activeOrders: number
  totalRevenue: number
  monthlyRevenue: number
  recentOrders: Array<{
    id: string
    customerName: string
    totalAmount: number
    status: string
    createdAt: string
    items: Array<{
      productName: string
      quantity: number
      price: number
    }>
  }>
  productPerformance: Array<{
    name: string
    sales: number
  }>
}

export default function FarmerDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats | null>(null)
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
      fetchDashboardStats()
    }
  }, [status, session, router])

  const fetchDashboardStats = async () => {
    try {
      const response = await fetch("/api/farmer/dashboard")
      if (!response.ok) throw new Error("Failed to fetch dashboard stats")
      const data = await response.json()
      setStats(data.stats)
    } catch (error) {
      // console.error("Error fetching dashboard stats:", error)
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      PENDING: "bg-yellow-100 text-yellow-800",
      CONFIRMED: "bg-blue-100 text-blue-800",
      PICKED: "bg-purple-100 text-purple-800",
      ORDER_IN_TRANSIT: "bg-indigo-100 text-indigo-800",
      DELIVERED: "bg-green-100 text-green-800",
      CANCELLED: "bg-red-100 text-red-800",
    }
    return colors[status] || "bg-gray-100 text-gray-800"
  }

  if (status === "loading" || isLoading) {
    return (
      <FarmerLayout>
        <div className="container mx-auto py-8 px-4">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </FarmerLayout>
    )
  }

  if (!stats) {
    return (
      <FarmerLayout>
        <div className="container mx-auto py-8 px-4">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Dashboard Unavailable</h1>
            <p className="text-gray-600">Unable to load dashboard data.</p>
          </div>
        </div>
      </FarmerLayout>
    )
  }

  return (
    <FarmerLayout>
      <div className="container mx-auto py-8 px-4 lg:px-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome to {stats.farmName}!
          </h1>
          <p className="text-gray-600">Here's your farm overview and recent activity.</p>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="rounded-xl shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Products</CardTitle>
              <Package className="h-5 w-5 text-[#00B207]" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{stats.totalProducts}</div>
              <p className="text-xs text-gray-500 mt-1">
                {stats.activeProducts} active
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-xl shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Orders</CardTitle>
              <ShoppingBag className="h-5 w-5 text-[#00B207]" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{stats.activeOrders}</div>
              <p className="text-xs text-gray-500 mt-1">
                Currently processing
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-xl shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <TrendingUp className="h-5 w-5 text-[#00B207]" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{formatPrice(stats.totalRevenue)}</div>
              <p className="text-xs text-gray-500 mt-1">
                All time earnings
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-xl shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
              <IndianRupee className="h-5 w-5 text-[#00B207]" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{formatPrice(stats.monthlyRevenue)}</div>
              <p className="text-xs text-gray-500 mt-1">
                This month
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link href="/farmer/products">
              <Card className="rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer border-2 border-transparent hover:border-[#00B207]">
                <CardContent className="p-6 text-center">
                  <Plus className="w-10 h-10 mx-auto mb-3 text-[#00B207]" />
                  <h3 className="font-semibold text-gray-900 mb-1">Add New Product</h3>
                  <p className="text-sm text-gray-600">List a new product for sale</p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/farmer/deliveries">
              <Card className="rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer border-2 border-transparent hover:border-[#00B207]">
                <CardContent className="p-6 text-center">
                  <Eye className="w-10 h-10 mx-auto mb-3 text-[#00B207]" />
                  <h3 className="font-semibold text-gray-900 mb-1">View Orders</h3>
                  <p className="text-sm text-gray-600">Check order status and details</p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/farmer/profile">
              <Card className="rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer border-2 border-transparent hover:border-[#00B207]">
                <CardContent className="p-6 text-center">
                  <User className="w-10 h-10 mx-auto mb-3 text-[#00B207]" />
                  <h3 className="font-semibold text-gray-900 mb-1">Manage Profile</h3>
                  <p className="text-sm text-gray-600">Update farm information</p>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Recent Orders Table */}
          <Card className="rounded-xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Recent Orders</CardTitle>
              <CardDescription>Last 5 orders containing your products</CardDescription>
            </CardHeader>
            <CardContent>
              {stats.recentOrders.length === 0 ? (
                <div className="text-center py-8">
                  <ShoppingBag className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-gray-500">No orders yet</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stats.recentOrders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium">{order.customerName}</TableCell>
                          <TableCell className="text-sm text-gray-600">
                            {formatDate(order.createdAt)}
                          </TableCell>
                          <TableCell className="font-semibold text-[#00B207]">
                            {formatPrice(order.totalAmount)}
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(order.status)}>
                              {order.status.replace("_", " ")}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Product Performance Chart */}
          <Card className="rounded-xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Product Performance</CardTitle>
              <CardDescription>Top 5 products by sales volume</CardDescription>
            </CardHeader>
            <CardContent>
              {stats.productPerformance.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-gray-500">No sales data yet</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={stats.productPerformance}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fontSize: 12 }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: "white", 
                        border: "1px solid #e5e7eb",
                        borderRadius: "8px"
                      }}
                    />
                    <Legend />
                    <Bar 
                      dataKey="sales" 
                      fill="#00B207" 
                      radius={[8, 8, 0, 0]}
                      name="Sales (units)"
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </FarmerLayout>
  )
}
