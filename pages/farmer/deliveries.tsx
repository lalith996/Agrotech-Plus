import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/router"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, Package, MapPin, Clock, AlertCircle } from "lucide-react"
import { UserRole } from "@prisma/client"

interface DeliveryRequirement {
  id: string
  deliveryDate: string
  status: string
  notes?: string
  products: Array<{
    id: string
    name: string
    requiredQuantity: number
    unit: string
    specifications?: string
  }>
}

export default function FarmerDeliveries() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [deliveries, setDeliveries] = useState<DeliveryRequirement[]>([])
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
      fetchDeliveries()
    }
  }, [status, session, router])

  const fetchDeliveries = async () => {
    try {
      const response = await fetch("/api/farmer/deliveries")
      if (!response.ok) throw new Error("Failed to fetch deliveries")
      const data = await response.json()
      setDeliveries(data.deliveries)
    } catch (error) {
      // console.error("Error fetching deliveries:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled":
        return "bg-blue-100 text-blue-800"
      case "confirmed":
        return "bg-green-100 text-green-800"
      case "overdue":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const isUpcoming = (dateString: string) => {
    const deliveryDate = new Date(dateString)
    const now = new Date()
    const diffTime = deliveryDate.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays <= 2 && diffDays >= 0
  }

  if (status === "loading" || isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Delivery Requirements</h1>
        <p className="text-gray-600">Your upcoming delivery obligations and requirements</p>
      </div>

      {deliveries.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-24 h-24 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Package className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No delivery requirements</h3>
          <p className="text-gray-600">You don't have any scheduled deliveries at the moment.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {deliveries.map((delivery) => (
            <Card key={delivery.id} className={`${isUpcoming(delivery.deliveryDate) ? 'border-orange-200 bg-orange-50' : ''}`}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center space-x-2">
                      <Calendar className="w-5 h-5" />
                      <span>{formatDate(delivery.deliveryDate)}</span>
                      {isUpcoming(delivery.deliveryDate) && (
                        <AlertCircle className="w-5 h-5 text-orange-600" />
                      )}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Delivery ID: {delivery.id.slice(-8).toUpperCase()}
                    </CardDescription>
                  </div>
                  <Badge className={getStatusColor(delivery.status)}>
                    {delivery.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-3 flex items-center">
                      <Package className="w-4 h-4 mr-2" />
                      Required Products ({delivery.products.length})
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {delivery.products.map((product) => (
                        <div key={product.id} className="border rounded-lg p-3">
                          <div className="flex justify-between items-start mb-2">
                            <h5 className="font-medium">{product.name}</h5>
                            <span className="text-sm font-semibold text-green-600">
                              {product.requiredQuantity} {product.unit}
                            </span>
                          </div>
                          {product.specifications && (
                            <p className="text-sm text-gray-600">{product.specifications}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {delivery.notes && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <h5 className="font-medium text-blue-900 mb-1">Special Instructions</h5>
                      <p className="text-sm text-blue-800">{delivery.notes}</p>
                    </div>
                  )}

                  {isUpcoming(delivery.deliveryDate) && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                      <div className="flex items-center space-x-2">
                        <AlertCircle className="w-4 h-4 text-orange-600" />
                        <span className="font-medium text-orange-900">Upcoming Delivery</span>
                      </div>
                      <p className="text-sm text-orange-800 mt-1">
                        This delivery is scheduled within the next 48 hours. Please ensure all products are ready.
                      </p>
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-3 border-t">
                    <div className="flex items-center text-sm text-gray-600">
                      <Clock className="w-4 h-4 mr-1" />
                      <span>Delivery window: 9:00 AM - 12:00 PM</span>
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">
                        Contact Operations
                      </Button>
                      {delivery.status === "scheduled" && (
                        <Button size="sm">
                          Confirm Ready
                        </Button>
                      )}
                    </div>
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