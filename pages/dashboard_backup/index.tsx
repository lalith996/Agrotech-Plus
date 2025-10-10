import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/router"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  ShoppingBag, 
  Calendar, 
  Heart, 
  DollarSign,
  Package,
  MapPin,
  User,
  TrendingUp,
  ArrowRight,
  CheckCircle2
} from "lucide-react"
import { UserRole, OrderStatus, SubscriptionStatus } from "@prisma/client"
import { useWishlistStore } from "@/lib/stores/wishlist-store"

interface DashboardStats {
  totalOrders: number
  activeSubscriptions: number
  totalSpent: number
}

interface RecentOrder {
  id: string
  status: OrderStatus
  totalAmount: number
  deliveryDate: string
  createdAt: string
  items: { id: string }[]
}

interface ActiveSubscription {
  id: string
  deliveryDay: string
  deliveryZone: string
  items: {
    id: string
    product: {
      name: string
      images: string[]
    }
  }[]
  nextDelivery?: string
}

export default function CustomerDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const wishlistCount = useWishlistStore((state) => state.getItemCount())
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([])
  const [activeSubscriptions, setActiveSubscriptions] = useState<ActiveSubscription[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin")
      return
    }

    if (status === "authenticated") {
      if (session.user.role !== UserRole.CUSTOMER) {
        if (session.user.role === UserRole.FARMER) {
          router.push("/farmer/dashboard")
        } else if (session.user.role === UserRole.ADMIN || session.user.role === UserRole.OPERATIONS) {
          router.push("/admin/dashboard")
        } else {
          router.push("/")
        }
        return
      }
      fetchDashboardData()
    }
  }, [status, session, router])

  const fetchDashboardData = async () => {
    try {
      const [ordersRes, subscriptionsRes] = await Promise.all([
        fetch("/api/orders?limit=3"),
        fetch("/api/subscriptions")
      ])

      if (ordersRes.ok) {
        const ordersData = await ordersRes.json()
        setRecentOrders(ordersData.orders || [])
        
        const totalOrders = ordersData.pagination?.total || 0
        const totalSpent = (ordersData.orders || []).reduce(
          (sum: number, order: RecentOrder) => sum + order.totalAmount,
          0
        )
        
        setStats({
          totalOrders,
          activeSubscriptions: 0,
          totalSpent
        })
      }

      if (subscriptionsRes.ok) {
        const subscriptionsData = await subscriptionsRes.json()
        const activeSubs = (subscriptionsData.subscriptions || []).filter(
          (sub: any) => sub.status === SubscriptionStatus.ACTIVE
        )
        setActiveSubscriptions(activeSubs.slice(0, 2))
        
        if (stats) {
          setStats({ ...stats, activeSubscriptions: activeSubs.length })
        }
      }
    } catch (error) {
      // console.error("Error fetching dashboard data:", error)
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
      year: "numeric"
    })
  }

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.DELIVERED:
        return "bg-green-100 text-green-800"
      case OrderStatus.ORDER_IN_TRANSIT:
        return "bg-blue-100 text-blue-800"
      case OrderStatus.CONFIRMED:
        return "bg-purple-100 text-purple-800"
      case OrderStatus.PENDING:
        return "bg-yellow-100 text-yellow-800"
      case OrderStatus.CANCELLED:
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getNextDeliveryDate = (deliveryDay: string) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const targetDay = days.indexOf(deliveryDay)
    const today = new Date()
    const currentDay = today.getDay()
    
    let daysUntilNext = targetDay - currentDay
    if (daysUntilNext <= 0) {
      daysUntilNext += 7
    }
    
    const nextDate = new Date(today)
    nextDate.setDate(today.getDate() + daysUntilNext)
    return nextDate
  }

  if (status === "loading" || isLoading) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <Skeleton className="h-64" />
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome back, {session?.user?.name?.split(' ')[0]}! 🌱
        </h1>
        <p className="text-gray-600">Here's your account overview</p>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="rounded-xl border-none shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Orders</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.totalOrders || 0}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <ShoppingBag className="w-6 h-6 text-[#00B207]" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-none shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Active Subscriptions</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.activeSubscriptions || 0}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <Calendar className="w-6 h-6 text-[#00B207]" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-none shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Wishlist Items</p>
                <p className="text-2xl font-bold text-gray-900">{wishlistCount}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <Heart className="w-6 h-6 text-[#00B207]" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-none shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Spent</p>
                <p className="text-2xl font-bold text-gray-900">{formatPrice(stats?.totalSpent || 0)}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-[#00B207]" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Recent Orders Section */}
        <div className="lg:col-span-2">
          <Card className="rounded-xl border-none shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-semibold">Recent Orders</CardTitle>
                <Link href="/dashboard/orders">
                  <Button variant="ghost" size="sm" className="text-[#00B207] hover:text-[#00B207] hover:bg-green-50">
                    View All <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {recentOrders.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                  <p className="text-gray-600 mb-4">No orders yet</p>
                  <Link href="/products">
                    <Button className="bg-[#00B207] hover:bg-[#00A006]">
                      Start Shopping
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentOrders.map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-[#00B207] transition-colors">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <p className="font-medium text-gray-900">
                            #{order.id.slice(-8).toUpperCase()}
                          </p>
                          <Badge className={getStatusColor(order.status)}>
                            {order.status.toLowerCase().replace('_', ' ')}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">
                          {formatDate(order.createdAt)} • {order.items.length} items
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900">{formatPrice(order.totalAmount)}</p>
                        <Link href={`/dashboard/orders/${order.id}`}>
                          <Button variant="ghost" size="sm" className="text-[#00B207] hover:text-[#00B207] p-0 h-auto">
                            View Details
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Active Subscriptions Preview */}
        <div>
          <Card className="rounded-xl border-none shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-semibold">Active Subscriptions</CardTitle>
                <Link href="/dashboard/subscriptions">
                  <Button variant="ghost" size="sm" className="text-[#00B207] hover:text-[#00B207] hover:bg-green-50 p-1 h-auto">
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {activeSubscriptions.length === 0 ? (
                <div className="text-center py-6">
                  <Calendar className="w-10 h-10 mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600 mb-3">No active subscriptions</p>
                  <Link href="/subscriptions/create">
                    <Button size="sm" className="bg-[#00B207] hover:bg-[#00A006]">
                      Create One
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {activeSubscriptions.map((sub) => (
                    <div key={sub.id} className="p-4 border-2 border-[#00B207] rounded-lg bg-green-50">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-medium text-gray-900">{sub.deliveryDay} Delivery</p>
                          <p className="text-sm text-gray-600 flex items-center mt-1">
                            <MapPin className="w-3 h-3 mr-1" />
                            {sub.deliveryZone}
                          </p>
                        </div>
                        <CheckCircle2 className="w-5 h-5 text-[#00B207]" />
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        {sub.items.length} items
                      </p>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Next delivery:</span>
                        <span className="font-medium text-[#00B207]">
                          {formatDate(getNextDeliveryDate(sub.deliveryDay).toISOString())}
                        </span>
                      </div>
                    </div>
                  ))}
                  <Link href="/dashboard/subscriptions">
                    <Button variant="outline" size="sm" className="w-full border-[#00B207] text-[#00B207] hover:bg-green-50">
                      Manage Subscriptions
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href="/products">
            <Card className="rounded-xl border-none shadow-sm hover:shadow-md transition-all cursor-pointer group hover:border-[#00B207] border border-transparent">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:bg-[#00B207] transition-colors">
                  <Package className="w-6 h-6 text-[#00B207] group-hover:text-white transition-colors" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">Browse Products</h3>
                <p className="text-sm text-gray-600">Discover fresh organic produce</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/dashboard/orders">
            <Card className="rounded-xl border-none shadow-sm hover:shadow-md transition-all cursor-pointer group hover:border-[#00B207] border border-transparent">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:bg-[#00B207] transition-colors">
                  <TrendingUp className="w-6 h-6 text-[#00B207] group-hover:text-white transition-colors" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">Track Orders</h3>
                <p className="text-sm text-gray-600">View order status and history</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/dashboard/profile">
            <Card className="rounded-xl border-none shadow-sm hover:shadow-md transition-all cursor-pointer group hover:border-[#00B207] border border-transparent">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:bg-[#00B207] transition-colors">
                  <User className="w-6 h-6 text-[#00B207] group-hover:text-white transition-colors" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">Manage Profile</h3>
                <p className="text-sm text-gray-600">Update your information</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/wishlist">
            <Card className="rounded-xl border-none shadow-sm hover:shadow-md transition-all cursor-pointer group hover:border-[#00B207] border border-transparent">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:bg-[#00B207] transition-colors">
                  <Heart className="w-6 h-6 text-[#00B207] group-hover:text-white transition-colors" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">Wishlist</h3>
                <p className="text-sm text-gray-600">View saved items</p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  )
}
