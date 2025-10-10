import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/router"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, MapPin, Package, Download, Eye } from "lucide-react"
import { OrderStatus } from "@prisma/client"

interface OrderItem {
  id: string
  quantity: number
  price: number
  product: {
    id: string
    name: string
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
  deliverySlot: string
  specialNotes?: string
  createdAt: string
  address: {
    name: string
    street: string
    city: string
    state: string
    zipCode: string
  }
  items: OrderItem[]
}

export default function Orders() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState("all")
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  })

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin")
      return
    }

    if (status === "authenticated") {
      fetchOrders()
    }
  }, [status, router, statusFilter])

  const fetchOrders = async (page = 1) => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
      })
      
      if (statusFilter !== "all") {
        params.append("status", statusFilter)
      }

      const response = await fetch(`/api/orders?${params.toString()}`)
      if (!response.ok) throw new Error("Failed to fetch orders")
      
      const data = await response.json()
      setOrders(data.orders)
      setPagination(data.pagination)
    } catch (error) {
      // console.error("Error fetching orders:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.PENDING:
        return "bg-yellow-100 text-yellow-800"
      case OrderStatus.CONFIRMED:
        return "bg-blue-100 text-blue-800"
      case OrderStatus.PICKED:
        return "bg-purple-100 text-purple-800"
      case OrderStatus.ORDER_IN_TRANSIT:
        return "bg-orange-100 text-orange-800"
      case OrderStatus.DELIVERED:
        return "bg-green-100 text-green-800"
      case OrderStatus.CANCELLED:
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
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
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const downloadInvoice = async (orderId: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}/invoice`)
      if (!response.ok) throw new Error("Failed to generate invoice")
      
      const data = await response.json()
      
      // For now, we'll just log the invoice data
      // In a real app, you'd generate a PDF
      // console.log("Invoice data:", data.invoice)
      alert("Invoice data logged to console. PDF generation would be implemented here.")
    } catch (error) {
      // console.error("Error downloading invoice:", error)
    }
  }

  if (status === "loading" || isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Orders</h1>
          <p className="text-gray-600">Track your fresh produce deliveries</p>
        </div>
        <div className="flex items-center space-x-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Orders</SelectItem>
              <SelectItem value={OrderStatus.PENDING}>Pending</SelectItem>
              <SelectItem value={OrderStatus.CONFIRMED}>Confirmed</SelectItem>
              <SelectItem value={OrderStatus.PICKED}>Picked</SelectItem>
              <SelectItem value={OrderStatus.ORDER_IN_TRANSIT}>In Transit</SelectItem>
              <SelectItem value={OrderStatus.DELIVERED}>Delivered</SelectItem>
              <SelectItem value={OrderStatus.CANCELLED}>Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-24 h-24 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Package className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
          <p className="text-gray-600 mb-6">
            {statusFilter === "all" 
              ? "You haven't placed any orders yet."
              : `No orders with status "${statusFilter}" found.`
            }
          </p>
          <Link href="/subscriptions/create">
            <Button>Create Your First Subscription</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => (
            <Card key={order.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center space-x-2">
                      <span>Order #{order.id.slice(-8).toUpperCase()}</span>
                      <Badge className={getStatusColor(order.status)}>
                        {order.status.toLowerCase().replace('_', ' ')}
                      </Badge>
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Placed on {formatDateTime(order.createdAt)}
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-green-600">
                      {formatPrice(order.totalAmount)}
                    </div>
                    <div className="text-sm text-gray-500">
                      {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-2">Items</h4>
                    <div className="space-y-2">
                      {order.items.slice(0, 3).map((item) => (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span className="text-gray-600">
                            {item.quantity}x {item.product.name}
                          </span>
                          <span className="font-medium">
                            {formatPrice(item.price * item.quantity)}
                          </span>
                        </div>
                      ))}
                      {order.items.length > 3 && (
                        <div className="text-sm text-gray-500">
                          +{order.items.length - 3} more items
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Delivery Details</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center text-gray-600">
                        <Calendar className="w-4 h-4 mr-2" />
                        {formatDate(order.deliveryDate)} • {order.deliverySlot}
                      </div>
                      <div className="flex items-start text-gray-600">
                        <MapPin className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                        <div>
                          <div className="font-medium">{order.address.name}</div>
                          <div>
                            {order.address.street}, {order.address.city}, {order.address.state} {order.address.zipCode}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {order.specialNotes && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <h5 className="font-medium text-sm mb-1">Special Notes</h5>
                    <p className="text-sm text-gray-600">{order.specialNotes}</p>
                  </div>
                )}

                <div className="flex justify-between items-center mt-6 pt-4 border-t">
                  <div className="flex space-x-2">
                    <Link href={`/orders/${order.id}`}>
                      <Button variant="outline" size="sm">
                        <Eye className="w-4 h-4 mr-2" />
                        View Details
                      </Button>
                    </Link>
                    {order.status === OrderStatus.DELIVERED && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => downloadInvoice(order.id)}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Invoice
                      </Button>
                    )}
                  </div>
                  
                  {order.status === OrderStatus.PENDING && (
                    <Button variant="destructive" size="sm">
                      Cancel Order
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex justify-center space-x-2">
              {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((page) => (
                <Button
                  key={page}
                  variant={page === pagination.page ? "default" : "outline"}
                  size="sm"
                  onClick={() => fetchOrders(page)}
                >
                  {page}
                </Button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}