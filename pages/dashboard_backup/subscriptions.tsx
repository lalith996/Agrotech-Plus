import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/router"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Calendar } from "@/components/ui/calendar"
import { 
  Calendar as CalendarIcon,
  MapPin, 
  Plus,
  Pause,
  Play,
  Edit,
  X,
  Package,
  Check
} from "lucide-react"
import { SubscriptionStatus } from "@prisma/client"
import { toast } from "sonner"

interface SubscriptionItem {
  id: string
  quantity: number
  frequency: string
  product: {
    id: string
    name: string
    basePrice: number
    unit: string
    images: string[]
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

export default function SubscriptionsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())

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
      if (!response.ok) throw new Error("Failed to fetch subscriptions")
      
      const data = await response.json()
      setSubscriptions(data.subscriptions || [])
    } catch (error) {
      // console.error("Error fetching subscriptions:", error)
      toast.error("Failed to load subscriptions")
    } finally {
      setIsLoading(false)
    }
  }

  const handlePauseSubscription = async (subscriptionId: string) => {
    try {
      const response = await fetch(`/api/subscriptions/${subscriptionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          action: "pause",
          pausedUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        })
      })

      if (!response.ok) throw new Error("Failed to pause subscription")

      toast.success("Subscription paused for 7 days")
      fetchSubscriptions()
    } catch (error) {
      // console.error("Error pausing subscription:", error)
      toast.error("Failed to pause subscription")
    }
  }

  const handleResumeSubscription = async (subscriptionId: string) => {
    try {
      const response = await fetch(`/api/subscriptions/${subscriptionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          action: "resume"
        })
      })

      if (!response.ok) throw new Error("Failed to resume subscription")

      toast.success("Subscription resumed successfully")
      fetchSubscriptions()
    } catch (error) {
      // console.error("Error resuming subscription:", error)
      toast.error("Failed to resume subscription")
    }
  }

  const handleCancelSubscription = async (subscriptionId: string) => {
    if (!confirm("Are you sure you want to cancel this subscription?")) return

    try {
      const response = await fetch(`/api/subscriptions/${subscriptionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          action: "cancel"
        })
      })

      if (!response.ok) throw new Error("Failed to cancel subscription")

      toast.success("Subscription cancelled successfully")
      fetchSubscriptions()
    } catch (error) {
      // console.error("Error cancelling subscription:", error)
      toast.error("Failed to cancel subscription")
    }
  }

  const handleReactivateSubscription = async (subscriptionId: string) => {
    try {
      const response = await fetch(`/api/subscriptions/${subscriptionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          action: "resume"
        })
      })

      if (!response.ok) throw new Error("Failed to reactivate subscription")

      toast.success("Subscription reactivated successfully")
      fetchSubscriptions()
    } catch (error) {
      // console.error("Error reactivating subscription:", error)
      toast.error("Failed to reactivate subscription")
    }
  }

  const getNextDeliveryDate = (deliveryDay: string, startDate: string) => {
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

  const getDeliveryDates = (deliveryDay: string, months: number = 3) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const targetDay = days.indexOf(deliveryDay)
    const dates: Date[] = []
    const today = new Date()
    
    for (let i = 0; i < months * 4; i++) {
      const date = new Date(today)
      date.setDate(today.getDate() + (i * 7) + (targetDay - today.getDay() + (i === 0 ? 7 : 0)) % 7)
      dates.push(date)
    }
    
    return dates
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(price)
  }

  const formatDate = (dateString: string | Date) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const calculateSubscriptionTotal = (items: SubscriptionItem[]) => {
    return items.reduce((total, item) => {
      return total + (item.product.basePrice * item.quantity)
    }, 0)
  }

  const getStatusColor = (status: SubscriptionStatus) => {
    switch (status) {
      case SubscriptionStatus.ACTIVE:
        return "bg-green-100 text-green-800 border-green-200"
      case SubscriptionStatus.PAUSED:
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case SubscriptionStatus.CANCELLED:
        return "bg-red-100 text-red-800 border-red-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const activeSubscriptions = subscriptions.filter(sub => sub.status === SubscriptionStatus.ACTIVE || sub.status === SubscriptionStatus.PAUSED)
  const pastSubscriptions = subscriptions.filter(sub => sub.status === SubscriptionStatus.CANCELLED)

  const allDeliveryDates = activeSubscriptions.flatMap(sub => 
    getDeliveryDates(sub.deliveryDay)
  )

  if (status === "loading" || isLoading) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-96" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Subscriptions</h1>
          <p className="text-gray-600">Manage your weekly fresh produce deliveries</p>
        </div>
        <Link href="/subscriptions/create">
          <Button className="bg-[#00B207] hover:bg-[#00A006]">
            <Plus className="w-4 h-4 mr-2" />
            New Subscription
          </Button>
        </Link>
      </div>

      {subscriptions.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-24 h-24 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Package className="w-12 h-12 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No subscriptions yet</h3>
          <p className="text-gray-600 mb-6">
            Start your farm-to-table journey by creating your first subscription.
          </p>
          <Link href="/subscriptions/create">
            <Button className="bg-[#00B207] hover:bg-[#00A006]">
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Subscription
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Active Subscriptions */}
          {activeSubscriptions.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Active Subscriptions</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeSubscriptions.map((subscription) => (
                  <Card 
                    key={subscription.id} 
                    className={`rounded-xl shadow-sm transition-all ${
                      subscription.status === SubscriptionStatus.ACTIVE 
                        ? "border-2 border-[#00B207]" 
                        : "border border-gray-200"
                    }`}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <CardTitle className="text-lg">
                            {subscription.deliveryDay} Delivery
                          </CardTitle>
                          <p className="text-sm text-gray-600 flex items-center mt-1">
                            <MapPin className="w-3 h-3 mr-1" />
                            {subscription.deliveryZone}
                          </p>
                        </div>
                        <Badge className={getStatusColor(subscription.status)}>
                          {subscription.status.toLowerCase()}
                        </Badge>
                      </div>
                      {subscription.status === SubscriptionStatus.ACTIVE && (
                        <div className="bg-green-50 p-3 rounded-lg mt-2">
                          <p className="text-sm font-medium text-[#00B207] flex items-center">
                            <CalendarIcon className="w-4 h-4 mr-2" />
                            Next Delivery: {formatDate(getNextDeliveryDate(subscription.deliveryDay, subscription.startDate))}
                          </p>
                        </div>
                      )}
                      {subscription.status === SubscriptionStatus.PAUSED && subscription.pausedUntil && (
                        <div className="bg-yellow-50 p-3 rounded-lg mt-2">
                          <p className="text-sm font-medium text-yellow-800">
                            Paused until {formatDate(subscription.pausedUntil)}
                          </p>
                        </div>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-medium mb-3 text-gray-900">
                            Items ({subscription.items.length})
                          </h4>
                          <div className="flex gap-2 mb-3">
                            {subscription.items.slice(0, 4).map((item) => (
                              <div key={item.id} className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200">
                                <Image
                                  src={item.product.images[0] || "/images/products/placeholder.jpg"}
                                  alt={item.product.name}
                                  fill
                                  className="object-cover"
                                />
                              </div>
                            ))}
                            {subscription.items.length > 4 && (
                              <div className="w-16 h-16 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
                                <span className="text-xs font-medium text-gray-500">
                                  +{subscription.items.length - 4}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="space-y-2">
                            {subscription.items.slice(0, 3).map((item) => (
                              <div key={item.id} className="flex justify-between text-sm">
                                <span className="text-gray-600">
                                  {item.quantity}x {item.product.name}
                                </span>
                                <span className="font-medium text-gray-900">
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

                        <div className="pt-3 border-t">
                          <div className="flex justify-between items-center mb-3">
                            <span className="font-medium text-gray-900">Weekly Total</span>
                            <span className="font-bold text-lg text-[#00B207]">
                              {formatPrice(calculateSubscriptionTotal(subscription.items))}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 mb-3">
                            Started {formatDate(subscription.startDate)}
                          </p>
                        </div>

                        <div className="flex gap-2">
                          {subscription.status === SubscriptionStatus.ACTIVE ? (
                            <>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="flex-1"
                                onClick={() => handlePauseSubscription(subscription.id)}
                              >
                                <Pause className="w-4 h-4 mr-1" />
                                Pause
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="flex-1 border-[#00B207] text-[#00B207] hover:bg-green-50"
                              >
                                <Edit className="w-4 h-4 mr-1" />
                                Modify
                              </Button>
                            </>
                          ) : (
                            <Button 
                              size="sm" 
                              className="flex-1 bg-[#00B207] hover:bg-[#00A006]"
                              onClick={() => handleResumeSubscription(subscription.id)}
                            >
                              <Play className="w-4 h-4 mr-1" />
                              Resume
                            </Button>
                          )}
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleCancelSubscription(subscription.id)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Delivery Calendar */}
          {activeSubscriptions.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Delivery Calendar</h2>
              <Card className="rounded-xl border-none shadow-sm">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row gap-6">
                    <div className="flex-1">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        className="rounded-md border"
                        modifiers={{
                          delivery: allDeliveryDates,
                        }}
                        modifiersStyles={{
                          delivery: {
                            backgroundColor: '#00B207',
                            color: 'white',
                            fontWeight: 'bold',
                          }
                        }}
                      />
                    </div>
                    <div className="lg:w-64">
                      <h3 className="font-semibold mb-3">Upcoming Deliveries</h3>
                      <div className="space-y-2">
                        {activeSubscriptions.map(sub => (
                          <div key={sub.id} className="p-3 bg-green-50 rounded-lg border border-green-200">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-sm text-gray-900">{sub.deliveryDay}</p>
                                <p className="text-xs text-gray-600">{sub.deliveryZone}</p>
                              </div>
                              <div className="w-2 h-2 bg-[#00B207] rounded-full" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Past Subscriptions */}
          {pastSubscriptions.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Past Subscriptions</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pastSubscriptions.map((subscription) => (
                  <Card key={subscription.id} className="rounded-xl border-none shadow-sm opacity-75">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg text-gray-600">
                            {subscription.deliveryDay} Delivery
                          </CardTitle>
                          <p className="text-sm text-gray-500 flex items-center mt-1">
                            <MapPin className="w-3 h-3 mr-1" />
                            {subscription.deliveryZone}
                          </p>
                        </div>
                        <Badge className={getStatusColor(subscription.status)}>
                          Cancelled
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <p className="text-sm text-gray-600 mb-2">
                            {subscription.items.length} items • {formatPrice(calculateSubscriptionTotal(subscription.items))}/week
                          </p>
                          <p className="text-xs text-gray-500">
                            Active: {formatDate(subscription.startDate)}
                          </p>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full border-[#00B207] text-[#00B207] hover:bg-green-50"
                          onClick={() => handleReactivateSubscription(subscription.id)}
                        >
                          <Check className="w-4 h-4 mr-2" />
                          Reactivate
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
