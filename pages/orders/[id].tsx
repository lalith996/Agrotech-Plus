import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/router"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Calendar, MapPin, Package, Download, Truck, CheckCircle } from "lucide-react"
import { OrderStatus } from "@prisma/client"

interface OrderItem {
  id: string
  quantity: number
  price: number
  product: {
    id: string
    name: string
    unit: string
    description?: string
    farmer: {
      farmName: string
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
  updatedAt: string
  customer: {
    user: {
      name: string
      email: string
    }
  }
  address: {
    name: string
    street: string
    city: string
    state: string
    zipCode: string
  }
  items: OrderItem[]
  subscription?: {
    id: string
    deliveryDay: string
  }
}

export default function OrderDetails() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { id } = router.query
  const [order, setOrder] = useState<Order | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin")
      return
    }

    if (status === "authenticated" && id) {
      fetchOrder()
    }
  }, [status, router, id])

  const fetchOrder = async () => {
    try {
      const response = await fetch(`/api/orders/${id}`)
      if (!response.ok) {
        if (response.status === 404) {
          router.push("/orders")
          return
        }
        throw new Error("Failed to fetch order")
      }
      const data = await response.json()
      setOrder(data.order)
    } catch (error) {
      // console.error("Error fetching order:", error)
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

  const getStatusSteps = (currentStatus: OrderStatus) => {
    const steps = [
      { status: OrderStatus.PENDING, label: "Order Placed", icon: Package },
      { status: OrderStatus.CONFIRMED, label: "Confirmed", icon: CheckCircle },
      { status: OrderStatus.PICKED, label: "Picked", icon: Package },
      { status: OrderStatus.ORDER_IN_TRANSIT, label: "In Transit", icon: Truck },
      { status: OrderStatus.DELIVERED, label: "Delivered", icon: CheckCircle },
    ]

    const currentIndex = steps.findIndex(step => step.status === currentStatus)
    
    return steps.map((step, index) => ({
      ...step,
      isCompleted: index <= currentIndex,
      isCurrent: index === currentIndex,
    }))
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
      month: "long",
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

  const downloadInvoice = async () => {
    try {
      const response = await fetch(`/api/orders/${id}/invoice`)
      if (!response.ok) throw new Error("Failed to generate invoice")
      
      const data = await response.json()
      // console.log("Invoice data:", data.invoice)
      alert("Invoice data logged to console. PDF generation would be implemented here.")
    } catch (error) {
      // console.error("Error downloading invoice:", error)
    }
  }

  const cancelOrder = async () => {
    if (!confirm("Are you sure you want to cancel this order?")) return

    try {
      const response = await fetch(`/api/orders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: OrderStatus.CANCELLED }),
      })

      if (!response.ok) throw new Error("Failed to cancel order")
      
      fetchOrder() // Refresh order data
    } catch (error) {
      // console.error("Error cancelling order:", error)
    }
  }

  if (status === "loading" || isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Order Not Found</h1>
          <Link href="/orders">
            <Button>Back to Orders</Button>
          </Link>
        </div>
      </div>
    )
  }

  const statusSteps = getStatusSteps(order.status)

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => router.back()} className="pl-0">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Orders
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Order Header */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-2xl">
                    Order #{order.id.slice(-8).toUpperCase()}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Placed on {formatDateTime(order.createdAt)}
                  </CardDescription>
                </div>
                <Badge className={getStatusColor(order.status)} variant="secondary">
                  {order.status.toLowerCase().replace('_', ' ')}
                </Badge>
              </div>
            </CardHeader>
          </Card>

          {/* Order Status Timeline */}
          {order.status !== OrderStatus.CANCELLED && (
            <Card>
              <CardHeader>
                <CardTitle>Order Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {statusSteps.map((step, index) => {
                    const Icon = step.icon
                    return (
                      <div key={step.status} className="flex items-center space-x-4">
                        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                          step.isCompleted 
                            ? "bg-green-100 text-green-600" 
                            : step.isCurrent
                            ? "bg-blue-100 text-blue-600"
                            : "bg-gray-100 text-gray-400"
                        }`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <div className={`font-medium ${
                            step.isCompleted || step.isCurrent ? "text-gray-900" : "text-gray-400"
                          }`}>
                            {step.label}
                          </div>
                        </div>
                        {step.isCompleted && (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        )}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Order Items */}
          <Card>
            <CardHeader>
              <CardTitle>Order Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {order.items.map((item) => (
                  <div key={item.id} className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-medium">{item.product.name}</h4>
                      <p className="text-sm text-gray-600">
                        From {item.product.farmer.farmName}
                      </p>
                      {item.product.description && (
                        <p className="text-sm text-gray-500 mt-1">
                          {item.product.description}
                        </p>
                      )}
                    </div>
                    <div className="text-right ml-4">
                      <div className="font-medium">
                        {item.quantity} {item.product.unit}
                      </div>
                      <div className="text-sm text-gray-600">
                        {formatPrice(item.price)} each
                      </div>
                      <div className="font-semibold text-green-600">
                        {formatPrice(item.price * item.quantity)}
                      </div>
                    </div>
                  </div>
                ))}
                
                <Separator />
                
                <div className="flex justify-between items-center font-semibold text-lg">
                  <span>Total</span>
                  <span className="text-green-600">{formatPrice(order.totalAmount)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Special Notes */}
          {order.specialNotes && (
            <Card>
              <CardHeader>
                <CardTitle>Special Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">{order.specialNotes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          {/* Delivery Information */}
          <Card>
            <CardHeader>
              <CardTitle>Delivery Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-3">
                <Calendar className="w-5 h-5 text-gray-400" />
                <div>
                  <div className="font-medium">{formatDate(order.deliveryDate)}</div>
                  <div className="text-sm text-gray-600">{order.deliverySlot}</div>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <div className="font-medium">{order.address.name}</div>
                  <div className="text-sm text-gray-600">
                    {order.address.street}<br />
                    {order.address.city}, {order.address.state} {order.address.zipCode}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {order.status === OrderStatus.DELIVERED && (
                <Button onClick={downloadInvoice} className="w-full">
                  <Download className="w-4 h-4 mr-2" />
                  Download Invoice
                </Button>
              )}
              
              {order.status === OrderStatus.PENDING && (
                <Button 
                  variant="destructive" 
                  onClick={cancelOrder}
                  className="w-full"
                >
                  Cancel Order
                </Button>
              )}

              {order.subscription && (
                <Link href={`/subscriptions/${order.subscription.id}`}>
                  <Button variant="outline" className="w-full">
                    View Subscription
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}