import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/router"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Calendar, MapPin, Package } from "lucide-react"
import { SubscriptionStatus } from "@prisma/client"

interface SubscriptionItem {
  id: string
  quantity: number
  frequency: string
  product: {
    id: string
    name: string
    basePrice: number
    unit: string
    farmer: {
      farmName: string
      user: {
        name: string
      }
    }
  }
}

interface Subscription {
  id: string
  deliveryZone: string
  deliveryDay: string
  status: SubscriptionStatus
  startDate: string
  pausedUntil?: string
  createdAt: string
  items: SubscriptionItem[]
}

export default function Subscriptions() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin")
      return
    }

    if (status === "authenticated") {
      fetchSubscriptions()
    }
  }, [status, router])

  const fetchSubscriptions = async () => {
    try {
      const response = await fetch("/api/subscriptions")
      if (!response.ok) {
        throw new Error("Failed to fetch subscriptions")
      }
      const data = await response.json()
      setSubscriptions(data.subscriptions)
    } catch (error) {
      // console.error("Error fetching subscriptions:", error)
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
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const getStatusColor = (status: SubscriptionStatus) => {
    switch (status) {
      case SubscriptionStatus.ACTIVE:
        return "bg-green-100 text-green-800"
      case SubscriptionStatus.PAUSED:
        return "bg-yellow-100 text-yellow-800"
      case SubscriptionStatus.CANCELLED:
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const calculateSubscriptionTotal = (items: SubscriptionItem[]) => {
    return items.reduce((total, item) => {
      return total + (item.product.basePrice * item.quantity)
    }, 0)
  }

  if (status === "loading" || isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-64 bg-gray-200 rounded-lg"></div>
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Subscriptions</h1>
          <p className="text-gray-600">
            Manage your weekly fresh produce deliveries
          </p>
        </div>
        <Link href="/subscriptions/create">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            New Subscription
          </Button>
        </Link>
      </div>

      {subscriptions.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-24 h-24 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Package className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No subscriptions yet</h3>
          <p className="text-gray-600 mb-6">
            Start your farm-to-table journey by creating your first subscription.
          </p>
          <Link href="/subscriptions/create">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Subscription
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {subscriptions.map((subscription) => (
            <Card key={subscription.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">
                      {subscription.deliveryDay} Delivery
                    </CardTitle>
                    <CardDescription className="flex items-center mt-1">
                      <MapPin className="w-4 h-4 mr-1" />
                      {subscription.deliveryZone}
                    </CardDescription>
                  </div>
                  <Badge className={getStatusColor(subscription.status)}>
                    {subscription.status.toLowerCase()}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Items ({subscription.items.length})</h4>
                    <div className="space-y-2">
                      {subscription.items.slice(0, 3).map((item) => (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span className="text-gray-600">
                            {item.quantity}x {item.product.name}
                          </span>
                          <span className="font-medium">
                            {formatPrice(item.product.basePrice * item.quantity)}
                          </span>
                        </div>
                      ))}
                      {subscription.items.length > 3 && (
                        <div className="text-sm text-gray-500">
                          +{subscription.items.length - 3} more items
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="border-t pt-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium">Weekly Total</span>
                      <span className="font-bold text-green-600">
                        {formatPrice(calculateSubscriptionTotal(subscription.items))}
                      </span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar className="w-4 h-4 mr-1" />
                      Started {formatDate(subscription.startDate)}
                    </div>
                    {subscription.status === SubscriptionStatus.PAUSED && subscription.pausedUntil && (
                      <div className="text-sm text-yellow-600 mt-1">
                        Paused until {formatDate(subscription.pausedUntil)}
                      </div>
                    )}
                  </div>

                  <div className="flex space-x-2">
                    <Link href={`/subscriptions/${subscription.id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full">
                        View Details
                      </Button>
                    </Link>
                    {subscription.status === SubscriptionStatus.ACTIVE && (
                      <Link href={`/subscriptions/${subscription.id}/edit`} className="flex-1">
                        <Button size="sm" className="w-full">
                          Manage
                        </Button>
                      </Link>
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