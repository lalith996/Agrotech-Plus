import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/router"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Plus, Minus, ShoppingCart } from "lucide-react"

interface Product {
  id: string
  name: string
  category: string
  description: string
  images: string[]
  basePrice: number
  unit: string
  farmer: {
    farmName: string
    location: string
    user: {
      name: string
    }
  }
}

interface SubscriptionItem {
  productId: string
  quantity: number
  frequency: string
  product?: Product
}

interface DeliveryZone {
  id: string
  name: string
  description?: string
  slots: Array<{
    id: string
    dayOfWeek: number
    startTime: string
    endTime: string
    maxOrders: number
    availableCapacity?: number
    isAvailable?: boolean
  }>
}

const DAYS_OF_WEEK = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"
]

export default function CreateSubscription() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [deliveryZones, setDeliveryZones] = useState<DeliveryZone[]>([])
  const [selectedItems, setSelectedItems] = useState<SubscriptionItem[]>([])
  const [deliveryZone, setDeliveryZone] = useState("")
  const [deliveryDay, setDeliveryDay] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin")
      return
    }

    if (status === "authenticated") {
      fetchData()
    }
  }, [status, router])

  const fetchData = async () => {
    try {
      const [productsResponse, zonesResponse] = await Promise.all([
        fetch("/api/products"),
        fetch("/api/delivery-zones")
      ])

      if (!productsResponse.ok || !zonesResponse.ok) {
        throw new Error("Failed to fetch data")
      }

      const [productsData, zonesData] = await Promise.all([
        productsResponse.json(),
        zonesResponse.json()
      ])

      setProducts(productsData.products)
      setDeliveryZones(zonesData.zones)
    } catch (error) {
      // console.error("Error fetching data:", error)
      setError("Failed to load data")
    } finally {
      setIsLoading(false)
    }
  }

  const addToSubscription = (product: Product) => {
    const existingItem = selectedItems.find(item => item.productId === product.id)
    
    if (existingItem) {
      setSelectedItems(items =>
        items.map(item =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      )
    } else {
      setSelectedItems(items => [
        ...items,
        {
          productId: product.id,
          quantity: 1,
          frequency: "weekly",
          product,
        }
      ])
    }
  }

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      setSelectedItems(items => items.filter(item => item.productId !== productId))
    } else {
      setSelectedItems(items =>
        items.map(item =>
          item.productId === productId
            ? { ...item, quantity }
            : item
        )
      )
    }
  }

  const calculateTotal = () => {
    return selectedItems.reduce((total, item) => {
      return total + (item.product!.basePrice * item.quantity)
    }, 0)
  }

  const handleCreateSubscription = async () => {
    if (selectedItems.length === 0) {
      setError("Please add at least one product to your subscription")
      return
    }

    if (!deliveryZone || !deliveryDay) {
      setError("Please select delivery zone and day")
      return
    }

    setIsCreating(true)
    setError("")

    try {
      const subscriptionData = {
        deliveryZone,
        deliveryDay,
        startDate: new Date(),
        items: selectedItems.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          frequency: item.frequency,
        })),
      }

      const response = await fetch("/api/subscriptions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(subscriptionData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || "Failed to create subscription")
      }

      router.push("/subscriptions")
    } catch (error) {
      setError(error instanceof Error ? error.message : "Something went wrong")
    } finally {
      setIsCreating(false)
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(price)
  }

  if (status === "loading" || isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
            <div className="h-96 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => router.back()} className="pl-0">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Subscription</h1>
        <p className="text-gray-600">
          Build your weekly fresh produce delivery subscription
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Products Selection */}
        <div className="lg:col-span-2">
          <h2 className="text-xl font-semibold mb-4">Select Products</h2>
          <div className="space-y-4">
            {products.map((product) => {
              const selectedItem = selectedItems.find(item => item.productId === product.id)
              const quantity = selectedItem?.quantity || 0

              return (
                <Card key={product.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-4">
                      <div className="w-16 h-16 relative overflow-hidden rounded-lg bg-gray-100 flex-shrink-0">
                        {product.images.length > 0 ? (
                          <Image
                            src={product.images[0]}
                            alt={product.name}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            🥬
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-semibold">{product.name}</h3>
                            <p className="text-sm text-gray-600">{product.farmer.farmName}</p>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-green-600">
                              {formatPrice(product.basePrice)}
                            </span>
                            <span className="text-sm text-gray-500 ml-1">
                              per {product.unit}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <Badge variant="secondary" className="text-xs">
                            {product.category}
                          </Badge>
                          
                          <div className="flex items-center space-x-2">
                            {quantity > 0 ? (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => updateQuantity(product.id, quantity - 1)}
                                >
                                  <Minus className="w-4 h-4" />
                                </Button>
                                <span className="w-8 text-center">{quantity}</span>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => updateQuantity(product.id, quantity + 1)}
                                >
                                  <Plus className="w-4 h-4" />
                                </Button>
                              </>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => addToSubscription(product)}
                              >
                                <Plus className="w-4 h-4 mr-1" />
                                Add
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>

        {/* Subscription Summary */}
        <div className="lg:col-span-1">
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle className="flex items-center">
                <ShoppingCart className="w-5 h-5 mr-2" />
                Subscription Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Delivery Settings */}
              <div className="space-y-3">
                <div>
                  <Label htmlFor="deliveryZone">Delivery Zone</Label>
                  <Select value={deliveryZone} onValueChange={setDeliveryZone}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select zone" />
                    </SelectTrigger>
                    <SelectContent>
                      {deliveryZones.map((zone) => (
                        <SelectItem key={zone.id} value={zone.name}>
                          {zone.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="deliveryDay">Delivery Day</Label>
                  <Select value={deliveryDay} onValueChange={setDeliveryDay}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select day" />
                    </SelectTrigger>
                    <SelectContent>
                      {deliveryZones
                        .find(zone => zone.name === deliveryZone)
                        ?.slots.map((slot) => (
                          <SelectItem 
                            key={slot.id} 
                            value={DAYS_OF_WEEK[slot.dayOfWeek]}
                            disabled={slot.availableCapacity === 0}
                          >
                            {DAYS_OF_WEEK[slot.dayOfWeek]} ({slot.startTime} - {slot.endTime})
                            {slot.availableCapacity !== undefined && (
                              <span className="text-xs text-gray-500 ml-2">
                                {slot.availableCapacity} slots left
                              </span>
                            )}
                          </SelectItem>
                        )) || []}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Selected Items */}
              <div>
                <h4 className="font-medium mb-2">Selected Items ({selectedItems.length})</h4>
                {selectedItems.length === 0 ? (
                  <p className="text-sm text-gray-500">No items selected</p>
                ) : (
                  <div className="space-y-2">
                    {selectedItems.map((item) => (
                      <div key={item.productId} className="flex justify-between text-sm">
                        <span className="text-gray-600">
                          {item.quantity}x {item.product!.name}
                        </span>
                        <span className="font-medium">
                          {formatPrice(item.product!.basePrice * item.quantity)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Total */}
              {selectedItems.length > 0 && (
                <div className="border-t pt-3">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">Weekly Total</span>
                    <span className="font-bold text-green-600 text-lg">
                      {formatPrice(calculateTotal())}
                    </span>
                  </div>
                </div>
              )}

              {error && (
                <div className="text-red-600 text-sm">{error}</div>
              )}

              <Button
                onClick={handleCreateSubscription}
                disabled={isCreating || selectedItems.length === 0}
                className="w-full"
              >
                {isCreating ? "Creating..." : "Create Subscription"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}