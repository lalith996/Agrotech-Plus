"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/router"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { 
  CheckCircle2, 
  Copy, 
  Download, 
  Package, 
  MapPin,
  Calendar,
  ShoppingBag,
  ArrowRight,
  Check
} from "lucide-react"
import { toast } from "sonner"

interface OrderItem {
  id: string
  productId: string
  quantity: number
  price: number
  product: {
    id: string
    name: string
    images: string[]
    unit: string
    farmer: {
      id: string
      farmName: string
      user: {
        name: string
      }
    }
  }
}

interface Order {
  id: string
  totalAmount: number
  deliveryDate: string
  status: string
  address: {
    id: string
    name: string
    street: string
    city: string
    state: string
    zipCode: string
  }
  items: OrderItem[]
  createdAt: string
}

export default function OrderConfirmationPage() {
  const router = useRouter()
  const { orderId } = router.query
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (orderId && typeof orderId === "string") {
      fetchOrder(orderId)
    }
  }, [orderId])

  const fetchOrder = async (id: string) => {
    try {
      const response = await fetch(`/api/orders/${id}`)
      if (response.ok) {
        const data = await response.json()
        setOrder(data.order)
      } else {
        toast.error("Order not found")
        router.push("/orders")
      }
    } catch (error) {
      // console.error("Error fetching order:", error)
      toast.error("Failed to load order details")
    } finally {
      setLoading(false)
    }
  }

  const copyOrderId = () => {
    if (order?.id) {
      navigator.clipboard.writeText(order.id)
      setCopied(true)
      toast.success("Order ID copied to clipboard")
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(price)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })
  }

  const getEstimatedDeliveryDate = () => {
    if (!order) return ""
    const deliveryDate = new Date(order.deliveryDate)
    return deliveryDate.toLocaleDateString("en-IN", {
      weekday: "long",
      day: "numeric",
      month: "long",
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#00B207] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading order details...</p>
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Order not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Success Icon and Message */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-400 to-[#00B207] rounded-full mb-6 animate-in zoom-in duration-500">
            <CheckCircle2 className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Order Placed Successfully!
          </h1>
          <p className="text-gray-600 text-lg">
            Thank you for your order. We've received it and will process it soon.
          </p>
        </div>

        {/* Order ID Card */}
        <Card className="rounded-xl shadow-lg mb-6 border-green-100">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Order Number</p>
                <div className="flex items-center gap-2">
                  <code className="text-lg font-mono font-semibold text-gray-900 bg-gray-100 px-3 py-1 rounded">
                    #{order.id.slice(-8).toUpperCase()}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={copyOrderId}
                    className="rounded-full"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-[#00B207]" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-2 text-[#00B207]">
                <Calendar className="w-5 h-5" />
                <div>
                  <p className="text-sm text-gray-600">Estimated Delivery</p>
                  <p className="font-semibold">{getEstimatedDeliveryDate()}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Order Details */}
        <Card className="rounded-xl shadow-lg mb-6">
          <CardContent className="p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
              <Package className="w-5 h-5 mr-2 text-[#00B207]" />
              Order Details
            </h2>

            {/* Order Items */}
            <div className="space-y-4 mb-6">
              {order.items.map((item) => (
                <div key={item.id} className="flex gap-4">
                  {item.product.images?.[0] ? (
                    <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                      <Image
                        src={item.product.images[0]}
                        alt={item.product.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center flex-shrink-0">
                      <ShoppingBag className="w-10 h-10 text-[#00B207]" />
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{item.product.name}</h3>
                    <p className="text-sm text-gray-600">
                      by {item.product.farmer.farmName}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-sm text-gray-600">
                        Qty: {item.quantity} {item.product.unit}
                      </span>
                      <span className="font-semibold text-gray-900">
                        {formatPrice(item.price * item.quantity)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Separator className="my-4" />

            {/* Shipping Address */}
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                <MapPin className="w-4 h-4 mr-2 text-[#00B207]" />
                Shipping Address
              </h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="font-medium text-gray-900">{order.address.name}</p>
                <p className="text-sm text-gray-600 mt-1">
                  {order.address.street}
                </p>
                <p className="text-sm text-gray-600">
                  {order.address.city}, {order.address.state} - {order.address.zipCode}
                </p>
              </div>
            </div>

            <Separator className="my-4" />

            {/* Order Total */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="text-gray-900">
                  {formatPrice(order.totalAmount - 50 - order.totalAmount * 0.05)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Shipping</span>
                <span className="text-gray-900">{formatPrice(50)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Tax (5%)</span>
                <span className="text-gray-900">
                  {formatPrice(order.totalAmount * 0.05)}
                </span>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between items-center pt-2">
                <span className="text-lg font-semibold text-gray-900">Total</span>
                <span className="text-2xl font-bold text-[#00B207]">
                  {formatPrice(order.totalAmount)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <Button
            asChild
            className="flex-1 rounded-full bg-[#00B207] hover:bg-green-700 py-6 text-lg"
          >
            <Link href={`/orders/${order.id}`}>
              <Package className="w-5 h-5 mr-2" />
              Track Order
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="flex-1 rounded-full py-6 text-lg border-2"
          >
            <Link href="/products">
              <ShoppingBag className="w-5 h-5 mr-2" />
              Continue Shopping
            </Link>
          </Button>
        </div>

        {/* Download Invoice */}
        <div className="text-center">
          <Button
            variant="link"
            asChild
            className="text-[#00B207] hover:text-green-700"
          >
            <a href={`/api/orders/${order.id}/invoice`} target="_blank" rel="noopener noreferrer">
              <Download className="w-4 h-4 mr-2" />
              Download Invoice
            </a>
          </Button>
        </div>

        {/* Order Placed Date */}
        <div className="text-center mt-8 text-sm text-gray-500">
          Order placed on {formatDate(order.createdAt)}
        </div>
      </div>
    </div>
  )
}
