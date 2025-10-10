import { useState, useEffect } from "react"
import { useRouter } from "next/router"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { useCartStore } from "@/lib/stores/cart-store"
import { useWishlistStore } from "@/lib/stores/wishlist-store"
import {
  ChevronRight,
  Heart,
  ShoppingCart,
  Share2,
  Minus,
  Plus,
  Star,
  MapPin,
  Award,
  Truck,
  Maximize2,
  X,
  Facebook,
  Twitter,
  Copy,
  MessageCircle,
  CheckCircle
} from "lucide-react"
import { toast } from "sonner"

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
    location: string
    description?: string
    user: {
      name: string
    }
    certifications: Array<{
      id: string
      name: string
      issuedBy: string
      issuedDate: string
      expiryDate?: string
    }>
  }
}

interface TrustStatement {
  farmGate: number
  logistics: number
  platform: number
  quality: number
  packaging: number
  total: number
}

interface ProductResponse {
  product: Product
  trustStatement: TrustStatement
}

interface Review {
  id: string
  userName: string
  rating: number
  comment: string
  date: string
  helpful: number
}

const mockReviews: Review[] = [
  {
    id: "1",
    userName: "Priya Sharma",
    rating: 5,
    comment: "Excellent quality! Fresh and organic. Delivered on time.",
    date: "2024-03-15",
    helpful: 12
  },
  {
    id: "2",
    userName: "Rahul Verma",
    rating: 4,
    comment: "Good product, slightly expensive but worth it for the quality.",
    date: "2024-03-10",
    helpful: 8
  },
  {
    id: "3",
    userName: "Anjali Patel",
    rating: 5,
    comment: "Best organic vegetables I've bought online. Highly recommend!",
    date: "2024-03-05",
    helpful: 15
  }
]

export default function ProductDetail() {
  const router = useRouter()
  const { id } = router.query
  const [data, setData] = useState<ProductResponse | null>(null)
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedImage, setSelectedImage] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const [isFullscreenGallery, setIsFullscreenGallery] = useState(false)
  const [isImageZoomed, setIsImageZoomed] = useState(false)
  
  const { addItem: addToCart } = useCartStore()
  const { addItem: addToWishlist, removeItem: removeFromWishlist, isInWishlist } = useWishlistStore()

  useEffect(() => {
    if (id) {
      fetchProduct()
    }
  }, [id])

  const fetchProduct = async () => {
    try {
      const response = await fetch(`/api/products/${id}`)
      if (!response.ok) throw new Error("Failed to fetch product")
      
      const result = await response.json()
      setData(result)
      
      if (result.product.category) {
        fetchRelatedProducts(result.product.category, result.product.id)
      }
    } catch (error) {
      // console.error("Error fetching product:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchRelatedProducts = async (category: string, currentProductId: string) => {
    try {
      const response = await fetch(`/api/products?category=${category}&limit=6`)
      if (response.ok) {
        const result = await response.json()
        const filtered = result.products?.filter((p: Product) => p.id !== currentProductId).slice(0, 6) || []
        setRelatedProducts(filtered)
      }
    } catch (error) {
      // console.error("Error fetching related products:", error)
    }
  }

  const handleWishlistToggle = () => {
    if (!data) return
    const { product } = data

    if (isInWishlist(product.id)) {
      removeFromWishlist(product.id)
      toast.success(`${product.name} removed from wishlist`)
    } else {
      addToWishlist({
        id: product.id,
        productId: product.id,
        name: product.name,
        price: product.basePrice,
        image: product.images[0],
        farmer: {
          name: product.farmer.user.name,
          farmName: product.farmer.farmName,
        },
        unit: product.unit,
      })
      toast.success(`${product.name} added to wishlist!`)
    }
  }

  const handleAddToCart = () => {
    if (!data) return
    const { product } = data

    addToCart({
      id: `${product.id}-${Date.now()}`,
      productId: product.id,
      name: product.name,
      price: product.basePrice,
      quantity,
      image: product.images[0],
      farmer: {
        name: product.farmer.user.name,
        farmName: product.farmer.farmName,
      },
      unit: product.unit,
    })

    toast.success(`${product.name} added to cart!`, {
      description: `${quantity} ${product.unit} added successfully`
    })
  }

  const handleShare = async (platform: string) => {
    if (!data) return
    const url = window.location.href
    const text = `Check out ${data.product.name} on AgroTrack+`

    if (platform === "copy") {
      await navigator.clipboard.writeText(url)
      toast.success("Link copied to clipboard!")
    } else if (platform === "whatsapp") {
      window.open(`https://wa.me/?text=${encodeURIComponent(text + " " + url)}`, "_blank")
    } else if (platform === "facebook") {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, "_blank")
    } else if (platform === "twitter") {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, "_blank")
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

  const calculateRatingDistribution = () => {
    const dist = { 5: 60, 4: 25, 3: 10, 2: 3, 1: 2 }
    return dist
  }

  const avgRating = 4.5

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="aspect-square bg-gray-200 rounded-xl"></div>
            <div className="space-y-4">
              <div className="h-8 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-20 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center py-16">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Product Not Found</h1>
          <p className="text-gray-600 mb-6">The product you're looking for doesn't exist.</p>
          <Link href="/products">
            <Button className="bg-[#00B207] hover:bg-[#00B207]/90">Back to Products</Button>
          </Link>
        </div>
      </div>
    )
  }

  const { product, trustStatement } = data

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-6 px-4">
        <div className="flex items-center text-sm text-gray-600 mb-6">
          <Link href="/" className="hover:text-[#00B207] transition-colors">
            Home
          </Link>
          <ChevronRight className="w-4 h-4 mx-2" />
          <Link href="/products" className="hover:text-[#00B207] transition-colors">
            Products
          </Link>
          <ChevronRight className="w-4 h-4 mx-2" />
          <Link href={`/products?category=${product.category}`} className="hover:text-[#00B207] transition-colors">
            {product.category}
          </Link>
          <ChevronRight className="w-4 h-4 mx-2" />
          <span className="text-gray-900 font-medium">{product.name}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          <div className="space-y-4">
            <div className="relative aspect-square overflow-hidden rounded-xl bg-gray-100 group">
              {product.images.length > 0 ? (
                <>
                  <Image
                    src={product.images[selectedImage]}
                    alt={product.name}
                    fill
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    className={`object-cover transition-transform duration-300 ${
                      isImageZoomed ? "scale-150 cursor-zoom-out" : "cursor-zoom-in"
                    }`}
                    onClick={() => setIsImageZoomed(!isImageZoomed)}
                  />
                  <button
                    onClick={() => setIsFullscreenGallery(true)}
                    className="absolute top-4 right-4 p-2 bg-white rounded-lg shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Maximize2 className="w-5 h-5" />
                  </button>
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center text-gray-400">
                    <div className="w-24 h-24 mx-auto bg-gray-200 rounded-full flex items-center justify-center mb-4">
                      🥬
                    </div>
                    <p>No image available</p>
                  </div>
                </div>
              )}
            </div>

            {product.images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {product.images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                      selectedImage === index ? "border-[#00B207] scale-105" : "border-gray-200"
                    }`}
                  >
                    <Image
                      src={image}
                      alt={`${product.name} ${index + 1}`}
                      width={80}
                      height={80}
                      className="object-cover w-full h-full"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-3">{product.name}</h1>
              
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-5 h-5 ${
                        i < Math.floor(avgRating) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-gray-600">
                  {avgRating} ({mockReviews.length} reviews)
                </span>
              </div>

              <div className="flex items-baseline gap-3 mb-4">
                <span className="text-4xl font-bold text-[#00B207]">
                  {formatPrice(product.basePrice)}
                </span>
                <span className="text-gray-500">/ {product.unit}</span>
              </div>

              <p className="text-gray-600 mb-4">{product.description}</p>

              <div className="flex items-center gap-2 mb-4">
                {product.isActive ? (
                  <>
                    <CheckCircle className="w-5 h-5 text-[#00B207]" />
                    <span className="text-[#00B207] font-medium">In Stock</span>
                  </>
                ) : (
                  <>
                    <X className="w-5 h-5 text-red-500" />
                    <span className="text-red-500 font-medium">Out of Stock</span>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2 mb-4 text-sm text-gray-600">
                <span className="font-medium">Sold by:</span>
                <Link href={`/farmer/${product.farmer.id}`} className="text-[#00B207] hover:underline">
                  {product.farmer.farmName}
                </Link>
              </div>

              <div className="flex items-center gap-2 mb-6">
                <Badge variant="secondary" className="bg-gray-100">
                  SKU: {product.id.slice(0, 8).toUpperCase()}
                </Badge>
                <Badge variant="secondary" className="bg-[#00B207]/10 text-[#00B207]">
                  {product.category}
                </Badge>
              </div>
            </div>

            <div className="border-t pt-6">
              <label className="text-sm font-medium text-gray-700 block mb-3">
                Quantity
              </label>
              <div className="flex items-center gap-4 mb-6">
                <div className="flex items-center border rounded-full">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="h-12 w-12 rounded-full"
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <span className="text-lg font-medium w-16 text-center">{quantity}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setQuantity(quantity + 1)}
                    className="h-12 w-12 rounded-full"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={handleAddToCart}
                  disabled={!product.isActive}
                  className="w-full h-14 bg-[#00B207] hover:bg-[#00B207]/90 text-white text-lg rounded-full"
                >
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  Add to Cart
                </Button>

                <Button
                  onClick={handleWishlistToggle}
                  variant="outline"
                  className="w-full h-14 rounded-full"
                >
                  <Heart
                    className={`w-5 h-5 mr-2 ${
                      isInWishlist(product.id) ? "fill-red-500 text-red-500" : ""
                    }`}
                  />
                  {isInWishlist(product.id) ? "Remove from Wishlist" : "Add to Wishlist"}
                </Button>
              </div>

              <div className="mt-6 p-4 bg-blue-50 rounded-xl flex items-center gap-3">
                <Truck className="w-6 h-6 text-blue-600" />
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Free delivery</span> on orders above ₹500
                </p>
              </div>

              <div className="mt-6">
                <p className="text-sm font-medium text-gray-700 mb-3">Share:</p>
                <div className="flex gap-2">
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => handleShare("whatsapp")}
                    className="rounded-full"
                  >
                    <MessageCircle className="w-5 h-5 text-green-600" />
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => handleShare("facebook")}
                    className="rounded-full"
                  >
                    <Facebook className="w-5 h-5 text-blue-600" />
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => handleShare("twitter")}
                    className="rounded-full"
                  >
                    <Twitter className="w-5 h-5 text-sky-500" />
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => handleShare("copy")}
                    className="rounded-full"
                  >
                    <Copy className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <Tabs defaultValue="description" className="mb-12">
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger value="description">Description</TabsTrigger>
            <TabsTrigger value="nutrition">Nutrition Info</TabsTrigger>
            <TabsTrigger value="reviews">Reviews</TabsTrigger>
            <TabsTrigger value="farmer">Farmer Info</TabsTrigger>
          </TabsList>

          <TabsContent value="description">
            <Card>
              <CardContent className="p-8">
                <h3 className="text-2xl font-bold mb-4">Product Description</h3>
                <p className="text-gray-600 leading-relaxed">{product.description}</p>
                
                <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold mb-3">Product Details</h4>
                    <ul className="space-y-2 text-gray-600">
                      <li className="flex justify-between">
                        <span>Category:</span>
                        <span className="font-medium">{product.category}</span>
                      </li>
                      <li className="flex justify-between">
                        <span>Unit:</span>
                        <span className="font-medium">{product.unit}</span>
                      </li>
                      <li className="flex justify-between">
                        <span>Farm:</span>
                        <span className="font-medium">{product.farmer.farmName}</span>
                      </li>
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-3">Trust Statement</h4>
                    <ul className="space-y-2 text-gray-600 text-sm">
                      <li className="flex justify-between">
                        <span>Farm Gate Price:</span>
                        <span className="font-medium">{formatPrice(trustStatement.farmGate)}</span>
                      </li>
                      <li className="flex justify-between">
                        <span>Logistics:</span>
                        <span className="font-medium">{formatPrice(trustStatement.logistics)}</span>
                      </li>
                      <li className="flex justify-between">
                        <span>Platform Fee:</span>
                        <span className="font-medium">{formatPrice(trustStatement.platform)}</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="nutrition">
            <Card>
              <CardContent className="p-8">
                <h3 className="text-2xl font-bold mb-4">Nutrition Information</h3>
                <p className="text-gray-600 mb-6">Per 100g serving</p>
                <table className="w-full">
                  <tbody className="divide-y">
                    <tr>
                      <td className="py-3 text-gray-700">Energy</td>
                      <td className="py-3 text-right font-medium">25 kcal</td>
                    </tr>
                    <tr>
                      <td className="py-3 text-gray-700">Protein</td>
                      <td className="py-3 text-right font-medium">1.5g</td>
                    </tr>
                    <tr>
                      <td className="py-3 text-gray-700">Carbohydrates</td>
                      <td className="py-3 text-right font-medium">4.5g</td>
                    </tr>
                    <tr>
                      <td className="py-3 text-gray-700">Fiber</td>
                      <td className="py-3 text-right font-medium">2.1g</td>
                    </tr>
                    <tr>
                      <td className="py-3 text-gray-700">Vitamin C</td>
                      <td className="py-3 text-right font-medium">45mg</td>
                    </tr>
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reviews">
            <Card>
              <CardContent className="p-8">
                <div className="flex items-start justify-between mb-8">
                  <div>
                    <h3 className="text-2xl font-bold mb-2">Customer Reviews</h3>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-5 h-5 ${
                              i < Math.floor(avgRating) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-lg font-medium">{avgRating} out of 5</span>
                    </div>
                  </div>
                  <Button className="bg-[#00B207] hover:bg-[#00B207]/90">Write a Review</Button>
                </div>

                <div className="mb-8">
                  <h4 className="font-semibold mb-4">Rating Distribution</h4>
                  {[5, 4, 3, 2, 1].map((rating) => {
                    const dist = calculateRatingDistribution()
                    const percentage = dist[rating as keyof typeof dist] || 0
                    return (
                      <div key={rating} className="flex items-center gap-3 mb-2">
                        <span className="text-sm w-12">{rating} star</span>
                        <Progress value={percentage} className="flex-1" />
                        <span className="text-sm text-gray-600 w-12">{percentage}%</span>
                      </div>
                    )
                  })}
                </div>

                <div className="space-y-6">
                  {mockReviews.map((review) => (
                    <div key={review.id} className="border-b pb-6 last:border-0">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h5 className="font-semibold">{review.userName}</h5>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex items-center">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-4 h-4 ${
                                    i < review.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-sm text-gray-500">{formatDate(review.date)}</span>
                          </div>
                        </div>
                      </div>
                      <p className="text-gray-600 mb-3">{review.comment}</p>
                      <button className="text-sm text-gray-500 hover:text-gray-700">
                        Helpful ({review.helpful})
                      </button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="farmer">
            <Card>
              <CardContent className="p-8">
                <div className="flex items-start gap-6 mb-6">
                  <div className="w-24 h-24 rounded-full bg-[#00B207]/10 flex items-center justify-center">
                    <MapPin className="w-12 h-12 text-[#00B207]" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold mb-2">{product.farmer.farmName}</h3>
                    <p className="text-gray-600 mb-2">
                      <MapPin className="w-4 h-4 inline mr-1" />
                      {product.farmer.location}
                    </p>
                    {product.farmer.description && (
                      <p className="text-gray-600">{product.farmer.description}</p>
                    )}
                  </div>
                </div>

                {product.farmer.certifications.length > 0 && (
                  <div className="mt-6">
                    <h4 className="font-semibold mb-4 flex items-center">
                      <Award className="w-5 h-5 mr-2 text-[#00B207]" />
                      Certifications
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {product.farmer.certifications.map((cert) => (
                        <div key={cert.id} className="border rounded-xl p-4 bg-gray-50">
                          <h5 className="font-medium mb-1">{cert.name}</h5>
                          <p className="text-sm text-gray-600">Issued by: {cert.issuedBy}</p>
                          <p className="text-sm text-gray-600">
                            {formatDate(cert.issuedDate)}
                            {cert.expiryDate && ` - ${formatDate(cert.expiryDate)}`}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {relatedProducts.length > 0 && (
          <div>
            <h2 className="text-3xl font-bold mb-6">You May Also Like</h2>
            <div className="overflow-x-auto pb-4">
              <div className="flex gap-6">
                {relatedProducts.map((relatedProduct) => (
                  <Card key={relatedProduct.id} className="flex-shrink-0 w-64 hover:shadow-xl transition-shadow">
                    <Link href={`/products/${relatedProduct.id}`}>
                      <div className="aspect-square relative overflow-hidden rounded-t-xl bg-gray-100">
                        {relatedProduct.images.length > 0 ? (
                          <Image
                            src={relatedProduct.images[0]}
                            alt={relatedProduct.name}
                            fill
                            sizes="256px"
                            className="object-cover hover:scale-110 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <div className="text-gray-400">🥬</div>
                          </div>
                        )}
                      </div>
                    </Link>
                    <CardContent className="p-4">
                      <Badge variant="secondary" className="mb-2 text-xs">
                        {relatedProduct.category}
                      </Badge>
                      <Link href={`/products/${relatedProduct.id}`}>
                        <h3 className="font-semibold mb-1 hover:text-[#00B207] transition-colors line-clamp-1">
                          {relatedProduct.name}
                        </h3>
                      </Link>
                      <p className="text-sm text-gray-600 mb-2">{relatedProduct.farmer.farmName}</p>
                      <div className="flex items-center gap-1 mb-2">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3 h-3 ${
                              i < 4 ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                            }`}
                          />
                        ))}
                      </div>
                      <div className="text-xl font-bold text-[#00B207]">
                        {formatPrice(relatedProduct.basePrice)}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {isFullscreenGallery && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center">
          <button
            onClick={() => setIsFullscreenGallery(false)}
            className="absolute top-4 right-4 p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>
          <div className="max-w-5xl w-full px-4">
            <div className="relative aspect-square">
              <Image
                src={product.images[selectedImage]}
                alt={product.name}
                fill
                sizes="(max-width: 1200px) 100vw, 1200px"
                className="object-contain"
              />
            </div>
            {product.images.length > 1 && (
              <div className="flex gap-2 mt-4 justify-center">
                {product.images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`w-16 h-16 rounded-lg overflow-hidden border-2 ${
                      selectedImage === index ? "border-[#00B207]" : "border-white/20"
                    }`}
                  >
                    <Image
                      src={image}
                      alt={`${product.name} ${index + 1}`}
                      width={64}
                      height={64}
                      className="object-cover w-full h-full"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
