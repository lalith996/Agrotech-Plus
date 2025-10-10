import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/router"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { FarmerLayout } from "@/components/farmer/farmer-layout"
import { Plus, Edit, Eye, Package, Trash2 } from "lucide-react"
import { UserRole } from "@prisma/client"

interface Product {
  id: string
  name: string
  category: string
  description?: string
  images: string[]
  basePrice: number
  unit: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

const categories = [
  { value: "all", label: "All Products" },
  { value: "Vegetables", label: "Vegetables" },
  { value: "Fruits", label: "Fruits" },
  { value: "Dairy", label: "Dairy" },
]

export default function FarmerProducts() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState("all")

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
      fetchProducts()
    }
  }, [status, session, router])

  const fetchProducts = async () => {
    try {
      const response = await fetch("/api/farmer/products")
      if (!response.ok) throw new Error("Failed to fetch products")
      const data = await response.json()
      setProducts(data.products)
    } catch (error) {
      // console.error("Error fetching products:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const toggleProductStatus = async (productId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/farmer/products/${productId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      })

      if (!response.ok) throw new Error("Failed to update product")
      
      setProducts(products.map(product => 
        product.id === productId ? { ...product, isActive } : product
      ))
    } catch (error) {
      // console.error("Error updating product:", error)
    }
  }

  const handleDeleteProduct = (productId: string, productName: string) => {
    // console.log(`Delete product requested - ID: ${productId}, Name: ${productName}`)
  }

  const handleEditProduct = (productId: string) => {
    // console.log(`Edit product requested - ID: ${productId}`)
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

  const filteredProducts = selectedCategory === "all"
    ? products
    : products.filter(product => product.category === selectedCategory)

  if (status === "loading" || isLoading) {
    return (
      <FarmerLayout>
        <div className="container mx-auto py-8 px-4">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-64 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </FarmerLayout>
    )
  }

  return (
    <FarmerLayout>
      <div className="container mx-auto py-8 px-4 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">My Products</h1>
            <p className="text-gray-600">Manage your product listings and availability</p>
          </div>
          <Link href="/farmer/products/new">
            <Button className="bg-[#00B207] hover:bg-green-700 rounded-xl">
              <Plus className="w-4 h-4 mr-2" />
              Add Product
            </Button>
          </Link>
        </div>

        {/* Category Filter Tabs */}
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="mb-8">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid rounded-xl">
            {categories.map((category) => (
              <TabsTrigger 
                key={category.value} 
                value={category.value}
                className="rounded-lg data-[state=active]:bg-[#00B207] data-[state=active]:text-white"
              >
                {category.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-24 h-24 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Package className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {selectedCategory === "all" ? "No products yet" : `No ${selectedCategory.toLowerCase()} products`}
            </h3>
            <p className="text-gray-600 mb-6">
              {selectedCategory === "all" 
                ? "Start by adding your first product to begin selling on AgroTrack+."
                : `Add ${selectedCategory.toLowerCase()} products to see them here.`
              }
            </p>
            <Link href="/farmer/products/new">
              <Button className="bg-[#00B207] hover:bg-green-700 rounded-xl">
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Product
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((product) => (
              <Card key={product.id} className="overflow-hidden rounded-xl shadow-sm hover:shadow-md transition-shadow">
                <div className="aspect-square relative bg-gray-100">
                  {product.images.length > 0 ? (
                    <Image
                      src={product.images[0]}
                      alt={product.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <div className="text-center">
                        <Package className="w-12 h-12 mx-auto mb-2" />
                        <p className="text-sm">No image</p>
                      </div>
                    </div>
                  )}
                  <div className="absolute top-3 right-3">
                    <Badge 
                      variant={product.isActive ? "default" : "secondary"}
                      className={product.isActive ? "bg-[#00B207]" : ""}
                    >
                      {product.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
                
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{product.name}</CardTitle>
                      <CardDescription>{product.category}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-4">
                    {product.description && (
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {product.description}
                      </p>
                    )}
                    
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-xl font-bold text-[#00B207]">
                          {formatPrice(product.basePrice)}
                        </span>
                        <span className="text-sm text-gray-500 ml-1">
                          per {product.unit}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={product.isActive}
                          onCheckedChange={(checked) => toggleProductStatus(product.id, checked)}
                        />
                        <span className="text-sm text-gray-600">
                          {product.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </div>

                    <div className="text-xs text-gray-500">
                      Created: {formatDate(product.createdAt)}
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-2">
                      <Link href={`/products/${product.id}`} className="col-span-1">
                        <Button variant="outline" size="sm" className="w-full rounded-lg">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </Link>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="col-span-1 rounded-lg"
                        onClick={() => handleEditProduct(product.id)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="col-span-1 rounded-lg text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDeleteProduct(product.id, product.name)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </FarmerLayout>
  )
}
