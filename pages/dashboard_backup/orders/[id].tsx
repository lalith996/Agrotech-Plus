import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/router"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { 
  ArrowLeft,
  Download,
  MessageCircle,
  RefreshCw,
  X,
  Check,
  MapPin,
  CreditCard,
  Package,
  Truck,
  Home
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

interface Address {
  name: string
  street: string
  city: string
  state: string
  zipCode: string
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
  address: Address
  items: OrderItem[]
}

interface TimelineStep {
  status: string
  label: string
  timestamp?: string
  icon: any
}

export default function OrderDetailPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { id } = router.query
  const [order, setOrder] = useState<Order | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCancelling, setIsCancelling] = useState(false)

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
          toast.error("Order not found")
          router.push("/dashboard/orders")
          return
        }
        throw new Error("Failed to fetch order")
      }
      
      const data = await response.json()
      setOrder(data.order)
    } catch (error) {
      // console.error("Error fetching order:", error)
      toast.error("Failed to load order details")
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancelOrder = async () => {
    if (!confirm("Are you sure you want to cancel this order?")) return

    setIsCancelling(true)
    try {
      const response = await fetch(`/api/orders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: OrderStatus.CANCELLED })
      })

      if (!response.ok) throw new Error("Failed to cancel order")

      toast.success("Order cancelled successfully")
      fetchOrder()
    } catch (error) {
      // console.error("Error cancelling order:", error)
      toast.error("Failed to cancel order")
    } finally {
      setIsCancelling(false)
    }
  }

  const downloadInvoice = async () => {
    try {
      const response = await fetch(`/api/orders/${id}/invoice`)
      if (!response.ok) throw new Error("Failed to generate invoice")
      
      const data = await response.json()
      toast.success("Invoice downloaded successfully")
    } catch (error) {
      // console.error("Error downloading invoice:", error)
      toast.error("Failed to download invoice")
    }
  }

  const getTimelineSteps = (): TimelineStep[] => {
    const steps: TimelineStep[] = [
      { status: OrderStatus.PENDING, label: "Order Placed", icon: Package },
      { status: OrderStatus.CONFIRMED, label: "Confirmed", icon: Check },
      { status: "PACKED", label: "Packed", icon: Package },
      { status: OrderStatus.PICKED, label: "Shipped", icon: Truck },
      { status: OrderStatus.ORDER_IN_TRANSIT, label: "Out for Delivery", icon: Truck },
      { status: OrderStatus.DELIVERED, label: "Delivered", icon: Home },
    ]

    if (order?.status === OrderStatus.CANCELLED) {
      return [
        { status: OrderStatus.PENDING, label: "Order Placed", icon: Package, timestamp: order.createdAt },
        { status: OrderStatus.CANCELLED, label: "Cancelled", icon: X },
      ]
    }

    return steps
  }

  const getCurrentStep = () => {
    if (!order) return -1
    const steps = getTimelineSteps()
    const statusIndex = steps.findIndex(step => step.status === order.status)
    return statusIndex
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

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.DELIVERED:
        return "bg-green-100 text-green-800 border-green-200"
      case OrderStatus.ORDER_IN_TRANSIT:
        return "bg-blue-100 text-blue-800 border-blue-200"
      case OrderStatus.CONFIRMED:
      case OrderStatus.PICKED:
        return "bg-purple-100 text-purple-800 border-purple-200"
      case OrderStatus.PENDING:
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case OrderStatus.CANCELLED:
        return "bg-red-100 text-red-800 border-red-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  if (status === "loading" || isLoading) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-64" />
              <Skeleton className="h-96" />
            </div>
            <Skeleton className="h-96" />
          </div>
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <div className="text-center py-16">
          <Package className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Order not found</h3>
          <p className="text-gray-600 mb-6">The order you're looking for doesn't exist</p>
          <Link href="/dashboard/orders">
            <Button className="bg-[#00B207] hover:bg-[#00A006]">
              Back to Orders
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  const currentStep = getCurrentStep()
  const timelineSteps = getTimelineSteps()

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <Link href="/dashboard/orders">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Orders
          </Button>
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Order #{order.id.slice(-8).toUpperCase()}
            </h1>
            <p className="text-gray-600">
              Placed on {formatDateTime(order.createdAt)}
            </p>
          </div>
          <Badge className={`${getStatusColor(order.status)} text-lg px-4 py-2`}>
            {order.status.toLowerCase().replace('_', ' ')}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status Timeline */}
          <Card className="rounded-xl border-none shadow-sm">
            <CardHeader>
              <CardTitle>Order Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                {timelineSteps.map((step, index) => {
                  const isComplete = index <= currentStep
                  const isCurrent = index === currentStep
                  const Icon = step.icon
                  
                  return (
                    <div key={step.status} className="flex gap-4 relative pb-8 last:pb-0">
                      {index < timelineSteps.length - 1 && (
                        <div className={`absolute left-5 top-12 w-0.5 h-full -ml-px ${
                          isComplete ? "bg-[#00B207]" : "bg-gray-200"
                        }`} />
                      )}
                      <div className={`relative z-10 flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                        isComplete
                          ? isCurrent
                            ? "bg-[#00B207] text-white ring-4 ring-green-100"
                            : "bg-[#00B207] text-white"
                          : "bg-white border-2 border-gray-300 text-gray-400"
                      }`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 pt-1">
                        <p className={`font-semibold ${isCurrent ? "text-[#00B207]" : isComplete ? "text-gray-900" : "text-gray-500"}`}>
                          {step.label}
                        </p>
                        {step.timestamp && (
                          <p className="text-sm text-gray-500 mt-1">
                            {formatDateTime(step.timestamp)}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Order Items */}
          <Card className="rounded-xl border-none shadow-sm">
            <CardHeader>
              <CardTitle>Order Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {order.items.map((item) => (
                  <div key={item.id} className="flex gap-4 p-4 border border-gray-200 rounded-lg">
                    <div className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
                      <Image
                        src={item.product.images[0] || "/images/products/placeholder.jpg"}
                        alt={item.product.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">{item.product.name}</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        Farmer: {item.product.farmer.user.name}
                      </p>
                      <div className="flex items-center gap-4 mt-2">
                        <span className="text-sm text-gray-600">
                          Qty: {item.quantity} {item.product.unit}
                        </span>
                        <span className="text-sm text-gray-600">
                          {formatPrice(item.price)} per {item.product.unit}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">
                        {formatPrice(item.price * item.quantity)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <Separator className="my-4" />

              <div className="space-y-2">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>{formatPrice(order.totalAmount)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Delivery Fee</span>
                  <span className="text-[#00B207]">Free</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-bold text-gray-900">
                  <span>Total</span>
                  <span>{formatPrice(order.totalAmount)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Order Summary */}
          <Card className="rounded-xl border-none shadow-sm">
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 mb-1">Delivery Address</p>
                    <p className="text-sm text-gray-600">{order.address.name}</p>
                    <p className="text-sm text-gray-600">
                      {order.address.street}, {order.address.city}
                    </p>
                    <p className="text-sm text-gray-600">
                      {order.address.state} {order.address.zipCode}
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <div className="flex items-start gap-3">
                  <Package className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 mb-1">Delivery Date</p>
                    <p className="text-sm text-gray-600">
                      {formatDate(order.deliveryDate)}
                    </p>
                    <p className="text-sm text-gray-600">{order.deliverySlot}</p>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <div className="flex items-start gap-3">
                  <CreditCard className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 mb-1">Payment Method</p>
                    <p className="text-sm text-gray-600">Cash on Delivery</p>
                  </div>
                </div>
              </div>

              {order.specialNotes && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium text-gray-900 mb-1">Special Notes</p>
                    <p className="text-sm text-gray-600">{order.specialNotes}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <Card className="rounded-xl border-none shadow-sm">
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {order.status === OrderStatus.DELIVERED && (
                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={downloadInvoice}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Invoice
                </Button>
              )}
              
              <Button variant="outline" className="w-full">
                <MessageCircle className="w-4 h-4 mr-2" />
                Contact Support
              </Button>

              {order.status === OrderStatus.DELIVERED && (
                <Button className="w-full bg-[#00B207] hover:bg-[#00A006]">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reorder
                </Button>
              )}

              {order.status === OrderStatus.PENDING && (
                <Button 
                  variant="destructive" 
                  className="w-full"
                  onClick={handleCancelOrder}
                  disabled={isCancelling}
                >
                  <X className="w-4 h-4 mr-2" />
                  {isCancelling ? "Cancelling..." : "Cancel Order"}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
