import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/router"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Package, 
  Calendar, 
  Copy, 
  Check,
  RefreshCw,
  Eye,
  ShoppingBag
} from "lucide-react"
import { OrderStatus } from "@prisma/client"
import { toast } from "sonner"

interface OrderItem {
  id: string
  quantity: number
  price: number
  product: {
    id: string
    name: string
    images: string[]
    unit: string
    farmer: {
      user: {
        name: string
      }
    }
  }
}

interface Order {
  id: string
  status: OrderStatus
  totalAmount: number
  deliveryDate: string
  createdAt: string
  items: OrderItem[]
}

export default function OrdersPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState("all")
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin")
      return
    }

    if (status === "authenticated") {
      fetchOrders()
    }
  }, [status, router, statusFilter])

  const fetchOrders = async () => {
    try {
      const params = new URLSearchParams({
        limit: "50",
      })
      
      if (statusFilter !== "all") {
        params.append("status", statusFilter)
      }

      const response = await fetch(`/api/orders?${params.toString()}`)
      if (!response.ok) throw new Error("Failed to fetch orders")
      
      const data = await response.json()
      setOrders(data.orders || [])
    } catch (error) {
      // console.error("Error fetching orders:", error)
      toast.error("Failed to load orders")
    } finally {
      setIsLoading(false)
    }
  }

  const copyOrderId = (orderId: string) => {
    navigator.clipboard.writeText(orderId)
    setCopiedId(orderId)
    toast.success("Order ID copied to clipboard")
    setTimeout(() => setCopiedId(null), 2000)
  }

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.PENDING:
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case OrderStatus.CONFIRMED:
        return "bg-blue-100 text-blue-800 border-blue-200"
      case OrderStatus.PICKED:
        return "bg-purple-100 text-purple-800 border-purple-200"
      case OrderStatus.ORDER_IN_TRANSIT:
        return "bg-orange-100 text-orange-800 border-orange-200"
      case OrderStatus.DELIVERED:
        return "bg-green-100 text-green-800 border-green-200"
      case OrderStatus.CANCELLED:
        return "bg-red-100 text-red-800 border-red-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getStatusStep = (status: OrderStatus) => {
    const steps = [
      OrderStatus.PENDING,
      OrderStatus.CONFIRMED,
      OrderStatus.PICKED,
      OrderStatus.ORDER_IN_TRANSIT,
      OrderStatus.DELIVERED
    ]
    return steps.indexOf(status)
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(price)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  if (status === "loading" || isLoading) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-12 w-full" />
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">My Orders</h1>
        <p className="text-gray-600">Track and manage your orders</p>
      </div>

      {/* Filter Tabs */}
      <Tabs value={statusFilter} onValueChange={setStatusFilter} className="mb-6">
        <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value={OrderStatus.PENDING}>Pending</TabsTrigger>
          <TabsTrigger value={OrderStatus.DELIVERED}>Delivered</TabsTrigger>
          <TabsTrigger value={OrderStatus.ORDER_IN_TRANSIT}>In Transit</TabsTrigger>
          <TabsTrigger value={OrderStatus.CANCELLED}>Cancelled</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Orders List */}
      {orders.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-24 h-24 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Package className="w-12 h-12 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No orders yet</h3>
          <p className="text-gray-600 mb-6">
            {statusFilter === "all" 
              ? "Start shopping to place your first order"
              : `No ${statusFilter.toLowerCase()} orders found`
            }
          </p>
          <Link href="/products">
            <Button className="bg-[#00B207] hover:bg-[#00A006]">
              <ShoppingBag className="w-4 h-4 mr-2" />
              Start Shopping
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Card key={order.id} className="rounded-xl border-none shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg font-semibold">
                      #{order.id.slice(-8).toUpperCase()}
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => copyOrderId(order.id)}
                    >
                      {copiedId === order.id ? (
                        <Check className="w-4 h-4 text-[#00B207]" />
                      ) : (
                        <Copy className="w-4 h-4 text-gray-500" />
                      )}
                    </Button>
                  </div>
                  <Badge className={getStatusColor(order.status)}>
                    {order.status.toLowerCase().replace('_', ' ')}
                  </Badge>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm text-gray-600 mt-2">
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    Ordered: {formatDate(order.createdAt)}
                  </div>
                  <span className="hidden sm:inline">•</span>
                  <div>Delivery: {formatDate(order.deliveryDate)}</div>
                </div>
              </CardHeader>

              <CardContent>
                {/* Order Items */}
                <div className="mb-4">
                  <div className="flex gap-3 mb-3">
                    {order.items.slice(0, 3).map((item) => (
                      <div key={item.id} className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200">
                        <Image
                          src={item.product.images[0] || "/images/products/placeholder.jpg"}
                          alt={item.product.name}
                          fill
                          className="object-cover"
                        />
                        <div className="absolute bottom-0 right-0 bg-[#00B207] text-white text-xs px-1.5 py-0.5 rounded-tl">
                          {item.quantity}x
                        </div>
                      </div>
                    ))}
                    {order.items.length > 3 && (
                      <div className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
                        <span className="text-sm font-medium text-gray-500">
                          +{order.items.length - 3}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Status Timeline */}
                {order.status !== OrderStatus.CANCELLED && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between relative">
                      <div className="absolute top-4 left-0 right-0 h-0.5 bg-gray-200">
                        <div 
                          className="h-full bg-[#00B207] transition-all duration-500"
                          style={{ 
                            width: `${(getStatusStep(order.status) / 4) * 100}%` 
                          }}
                        />
                      </div>
                      {["Ordered", "Confirmed", "Packed", "Shipped", "Delivered"].map((step, index) => {
                        const isComplete = index <= getStatusStep(order.status)
                        return (
                          <div key={step} className="relative z-10 flex flex-col items-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                              isComplete 
                                ? "bg-[#00B207] text-white" 
                                : "bg-white border-2 border-gray-300 text-gray-400"
                            }`}>
                              {isComplete ? (
                                <Check className="w-4 h-4" />
                              ) : (
                                <span className="text-xs">{index + 1}</span>
                              )}
                            </div>
                            <span className="text-xs text-gray-600 mt-1 hidden sm:block">{step}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Order Footer */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4 border-t">
                  <div>
                    <p className="text-sm text-gray-600">Order Total</p>
                    <p className="text-2xl font-bold text-gray-900">{formatPrice(order.totalAmount)}</p>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Link href={`/dashboard/orders/${order.id}`} className="flex-1 sm:flex-initial">
                      <Button variant="outline" className="w-full border-[#00B207] text-[#00B207] hover:bg-green-50">
                        <Eye className="w-4 h-4 mr-2" />
                        Track Order
                      </Button>
                    </Link>
                    {order.status === OrderStatus.DELIVERED && (
                      <Button variant="outline" className="flex-1 sm:flex-initial">
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Reorder
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
