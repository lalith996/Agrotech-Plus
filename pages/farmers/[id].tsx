import { useState, useEffect } from "react"
import { useRouter } from "next/router"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useCartStore } from "@/lib/stores/cart-store"
import { 
  MapPin, 
  Award, 
  Star,
  Phone,
  Mail,
  Package,
  Calendar,
  Users,
  ChevronRight,
  ShoppingCart
} from "lucide-react"
import { toast } from "sonner"

interface Farmer {
  id: string
  farmName: string
  location: string
  user: {
    name: string
  }
}

interface Product {
  id: string
  name: string
  category: string
  description: string
  images: string[]
  basePrice: number
  unit: string
  isActive: boolean
  farmer: {
    id: string
    farmName: string
    user: {
      name: string
    }
  }
}

const FARMER_IMAGES = [
  "https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?w=800&h=800&fit=crop",
  "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=800&h=800&fit=crop",
  "https://images.unsplash.com/photo-1566616213894-2d4e1baee5d8?w=800&h=800&fit=crop",
  "https://images.unsplash.com/photo-1592982537447-7440770cbfc9?w=800&h=800&fit=crop",
]

const MOCK_CERTIFICATIONS = [
  { 
    name: "Organic India", 
    color: "bg-green-100 text-green-800",
    icon: "🇮🇳",
    description: "Certified by Organic India Standards"
  },
  { 
    name: "USDA Organic", 
    color: "bg-blue-100 text-blue-800",
    icon: "🇺🇸",
    description: "United States Department of Agriculture Organic"
  },
  { 
    name: "EU Organic", 
    color: "bg-purple-100 text-purple-800",
    icon: "🇪🇺",
    description: "European Union Organic Certification"
  },
  { 
    name: "Pesticide-Free", 
    color: "bg-yellow-100 text-yellow-800",
    icon: "🌿",
    description: "100% Pesticide Free Farming"
  },
]

const FARMER_BIOS = [
  "With over 15 years of experience in organic farming, I'm passionate about growing healthy, sustainable produce for my community. Our farm follows traditional farming methods combined with modern sustainable practices to ensure the highest quality products.",
  "I started farming as a way to provide fresh, chemical-free produce to my family and neighbors. Today, our farm is a thriving organic operation dedicated to sustainable agriculture and community health.",
  "Growing up on my family's farm, I learned the importance of respecting the land and growing food naturally. We're committed to organic practices and delivering the freshest produce to our customers.",
  "Our farm has been in the family for three generations. We pride ourselves on our organic certifications and commitment to sustainable farming practices that benefit both our customers and the environment.",
]

export default function FarmerProfile() {
  const router = useRouter()
  const { id } = router.query
  
  const [farmer, setFarmer] = useState<Farmer | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [relatedFarmers, setRelatedFarmers] = useState<Farmer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  const { addItem: addToCart } = useCartStore()

  useEffect(() => {
    if (id) {
      fetchFarmerData()
    }
  }, [id])

  const fetchFarmerData = async () => {
    setIsLoading(true)
    try {
      const [farmersRes, productsRes] = await Promise.all([
        fetch("/api/farmers"),
        fetch(`/api/products?farmerId=${id}`)
      ])

      if (farmersRes.ok) {
        const farmersData = await farmersRes.json()
        const currentFarmer = farmersData.farmers?.find((f: Farmer) => f.id === id)
        setFarmer(currentFarmer || null)
        
        const others = farmersData.farmers?.filter((f: Farmer) => f.id !== id).slice(0, 3) || []
        setRelatedFarmers(others)
      }

      if (productsRes.ok) {
        const productsData = await productsRes.json()
        setProducts(productsData.products || [])
      }
    } catch (error) {
      // console.error("Error fetching farmer data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const getRating = (farmerId: string) => {
    return (farmerId.charCodeAt(0) % 5) + 1
  }

  const getFarmerImage = (farmerId: string) => {
    const index = farmerId.charCodeAt(0) % FARMER_IMAGES.length
    return FARMER_IMAGES[index]
  }

  const getFarmerBio = (farmerId: string) => {
    const index = farmerId.charCodeAt(0) % FARMER_BIOS.length
    return FARMER_BIOS[index]
  }

  const getFarmerCertifications = (farmerId: string) => {
    const count = (farmerId.charCodeAt(0) % 3) + 1
    return MOCK_CERTIFICATIONS.slice(0, count)
  }

  const getYearsFarming = (farmerId: string) => {
    return ((farmerId.charCodeAt(0) % 20) + 5)
  }

  const getCustomersServed = (farmerId: string) => {
    return ((farmerId.charCodeAt(0) % 500) + 100)
  }

  const handleAddToCart = (product: Product) => {
    addToCart({
      id: `${product.id}-${Date.now()}`,
      productId: product.id,
      name: product.name,
      price: product.basePrice,
      quantity: 1,
      image: product.images[0],
      farmer: {
        name: product.farmer.user.name,
        farmName: product.farmer.farmName,
      },
      unit: product.unit,
    })
    toast.success(`${product.name} added to cart!`)
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(price)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="h-96 bg-gray-200 animate-pulse"></div>
        <div className="container mx-auto py-8 px-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card className="p-6 animate-pulse">
                <div className="h-6 bg-gray-200 rounded mb-4 w-1/3"></div>
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!farmer) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Farmer Not Found</h2>
          <p className="text-gray-600 mb-6">The farmer you're looking for doesn't exist.</p>
          <Link href="/farmers">
            <Button className="bg-[#00B207] hover:bg-[#00B207]/90">Back to Farmers</Button>
          </Link>
        </div>
      </div>
    )
  }

  const rating = getRating(farmer.id)
  const certifications = getFarmerCertifications(farmer.id)
  const yearsFarming = getYearsFarming(farmer.id)
  const customersServed = getCustomersServed(farmer.id)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-[#00B207] to-green-600 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="flex items-center text-sm mb-6 opacity-90">
            <Link href="/" className="hover:text-white transition-colors">
              Home
            </Link>
            <ChevronRight className="w-4 h-4 mx-2" />
            <Link href="/farmers" className="hover:text-white transition-colors">
              Farmers
            </Link>
            <ChevronRight className="w-4 h-4 mx-2" />
            <span className="font-medium">{farmer.user.name}</span>
          </div>

          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-xl">
              <Image
                src={getFarmerImage(farmer.id)}
                alt={farmer.user.name}
                fill
                sizes="128px"
                className="object-cover"
              />
            </div>

            <div className="flex-1">
              <h1 className="text-4xl font-bold mb-2">{farmer.user.name}</h1>
              <p className="text-2xl text-green-50 mb-3">{farmer.farmName}</p>
              
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full">
                  <MapPin className="w-4 h-4" />
                  <span>{farmer.location}</span>
                </div>

                <div className="flex items-center gap-1 bg-white/20 px-4 py-2 rounded-full">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${
                        i < rating ? "fill-yellow-400 text-yellow-400" : "text-white/50"
                      }`}
                    />
                  ))}
                  <span className="ml-2">({rating}.0)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto py-8 px-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardContent className="p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">About {farmer.user.name}</h2>
                <p className="text-gray-700 leading-relaxed">{getFarmerBio(farmer.id)}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Award className="w-6 h-6 text-[#00B207]" />
                  Certifications
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {certifications.map((cert) => (
                    <div key={cert.name} className={`${cert.color} p-4 rounded-xl`}>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-3xl">{cert.icon}</span>
                        <h3 className="font-semibold">{cert.name}</h3>
                      </div>
                      <p className="text-sm opacity-80">{cert.description}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <Package className="w-6 h-6 text-[#00B207]" />
                  Products from {farmer.farmName}
                </h2>
                
                {products.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No products available at the moment
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {products.map((product) => (
                      <Card key={product.id} className="group overflow-hidden hover:shadow-lg transition-all duration-300">
                        <Link href={`/products/${product.id}`}>
                          <div className="aspect-square relative overflow-hidden bg-gray-100">
                            {product.images.length > 0 ? (
                              <Image
                                src={product.images[0]}
                                alt={product.name}
                                fill
                                sizes="(max-width: 640px) 100vw, 50vw"
                                className="object-cover group-hover:scale-110 transition-transform duration-500"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400">
                                <Package className="w-16 h-16" />
                              </div>
                            )}
                          </div>
                        </Link>

                        <CardContent className="p-4">
                          <Badge variant="secondary" className="mb-2 text-xs bg-gray-100">
                            {product.category}
                          </Badge>
                          
                          <Link href={`/products/${product.id}`}>
                            <h3 className="font-semibold text-lg mb-1 hover:text-[#00B207] transition-colors line-clamp-1">
                              {product.name}
                            </h3>
                          </Link>
                          
                          <p className="text-2xl font-bold text-[#00B207] mb-3">
                            {formatPrice(product.basePrice)}
                            <span className="text-sm text-gray-600 font-normal">/{product.unit}</span>
                          </p>

                          <Button
                            onClick={() => handleAddToCart(product)}
                            className="w-full bg-[#00B207] hover:bg-[#00B207]/90 rounded-full"
                          >
                            <ShoppingCart className="w-4 h-4 mr-2" />
                            Add to Cart
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {relatedFarmers.length > 0 && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Other Farmers You May Like</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {relatedFarmers.map((relatedFarmer) => (
                      <Link key={relatedFarmer.id} href={`/farmers/${relatedFarmer.id}`}>
                        <Card className="group overflow-hidden hover:shadow-lg transition-all duration-300">
                          <div className="aspect-square relative overflow-hidden bg-gray-100">
                            <Image
                              src={getFarmerImage(relatedFarmer.id)}
                              alt={relatedFarmer.user.name}
                              fill
                              sizes="(max-width: 640px) 100vw, 33vw"
                              className="object-cover group-hover:scale-110 transition-transform duration-500"
                            />
                          </div>
                          <CardContent className="p-4">
                            <h3 className="font-semibold mb-1">{relatedFarmer.user.name}</h3>
                            <p className="text-sm text-[#00B207]">{relatedFarmer.farmName}</p>
                            <div className="flex items-center text-gray-600 mt-2">
                              <MapPin className="w-3 h-3 mr-1" />
                              <span className="text-xs">{relatedFarmer.location}</span>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Farm Statistics</h2>
                
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-4 bg-green-50 rounded-xl">
                    <div className="w-12 h-12 bg-[#00B207] rounded-full flex items-center justify-center">
                      <Package className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Products</p>
                      <p className="text-2xl font-bold text-gray-900">{products.length}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-xl">
                    <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                      <Calendar className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Years Farming</p>
                      <p className="text-2xl font-bold text-gray-900">{yearsFarming}+</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-4 bg-purple-50 rounded-xl">
                    <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Customers Served</p>
                      <p className="text-2xl font-bold text-gray-900">{customersServed}+</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Contact Information</h2>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Phone className="w-5 h-5 text-[#00B207]" />
                    <div>
                      <p className="text-sm text-gray-600">Phone</p>
                      <p className="font-medium text-gray-900">+91 98765 43210</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Mail className="w-5 h-5 text-[#00B207]" />
                    <div>
                      <p className="text-sm text-gray-600">Email</p>
                      <p className="font-medium text-gray-900">{farmer.user.name.toLowerCase().replace(/\s+/g, '')}@farm.com</p>
                    </div>
                  </div>
                </div>

                <Button className="w-full mt-4 bg-[#00B207] hover:bg-[#00B207]/90 rounded-full">
                  <Mail className="w-4 h-4 mr-2" />
                  Send Message
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
