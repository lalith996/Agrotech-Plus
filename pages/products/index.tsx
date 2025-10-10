import { useState, useEffect } from "react"
import { useRouter } from "next/router"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Slider } from "@/components/ui/slider"
import { QuickViewModal } from "@/components/products/quick-view-modal"
import { useCartStore } from "@/lib/stores/cart-store"
import { useWishlistStore } from "@/lib/stores/wishlist-store"
import { 
  Search, 
  Heart, 
  ShoppingCart, 
  Eye, 
  Grid3x3, 
  List, 
  ChevronRight, 
  Star,
  ChevronDown,
  X
} from "lucide-react"
import { toast } from "sonner"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

interface Product {
  id: string
  name: string
  category: string
  description: string
  images: string[]
  basePrice: number
  unit: string
  isActive: boolean
  rating: number
  farmer: {
    id: string
    farmName: string
    location: string
    user: {
      name: string
    }
  }
}

interface ProductsResponse {
  products: Product[]
  categories: string[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

interface Farmer {
  id: string
  farmName: string
  location: string
}

export default function Products() {
  const router = useRouter()
  const [data, setData] = useState<ProductsResponse | null>(null)
  const [farmers, setFarmers] = useState<Farmer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [priceRange, setPriceRange] = useState([0, 1000])
  const [selectedFarmers, setSelectedFarmers] = useState<string[]>([])
  const [availabilityFilter, setAvailabilityFilter] = useState<string>("all")
  const [ratingFilter, setRatingFilter] = useState<number>(0)
  
  const [sortBy, setSortBy] = useState("featured")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [currentPage, setCurrentPage] = useState(1)
  
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null)
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false)
  
  const { addItem: addToCart } = useCartStore()
  const { addItem: addToWishlist, removeItem: removeFromWishlist, isInWishlist } = useWishlistStore()

  const [filtersOpen, setFiltersOpen] = useState({
    category: true,
    price: true,
    farmer: true,
    availability: true,
    rating: true,
  })

  useEffect(() => {
    fetchProducts()
    fetchFarmers()
  }, [selectedCategories, priceRange, selectedFarmers, availabilityFilter, ratingFilter, sortBy, currentPage])

  const fetchProducts = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      
      if (searchTerm) params.append("search", searchTerm)
      selectedCategories.forEach(cat => params.append("categories[]", cat))
      selectedFarmers.forEach(farmerId => params.append("farmerIds[]", farmerId))
      
      if (availabilityFilter !== "all") {
        params.append("availability", availabilityFilter)
      }
      
      if (priceRange[0] > 0) params.append("minPrice", priceRange[0].toString())
      if (priceRange[1] < 1000) params.append("maxPrice", priceRange[1].toString())
      
      if (ratingFilter > 0) {
        params.append("minRating", ratingFilter.toString())
      }
      
      params.append("page", currentPage.toString())
      params.append("limit", "12")

      const response = await fetch(`/api/products?${params.toString()}`)
      if (!response.ok) throw new Error("Failed to fetch products")
      
      const result = await response.json()
      
      let products = result.products || []
      
      if (sortBy === "price_low") {
        products.sort((a: Product, b: Product) => a.basePrice - b.basePrice)
      } else if (sortBy === "price_high") {
        products.sort((a: Product, b: Product) => b.basePrice - a.basePrice)
      } else if (sortBy === "newest") {
        products.sort((a: Product, b: Product) => 
          new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        )
      }
      
      setData({
        ...result,
        products,
      })
    } catch (error) {
      // console.error("Error fetching products:", error)
      setData({ products: [], categories: [], pagination: { page: 1, limit: 12, total: 0, pages: 0 } })
    } finally {
      setIsLoading(false)
    }
  }

  const fetchFarmers = async () => {
    try {
      const response = await fetch('/api/farmers')
      if (!response.ok) {
        setFarmers([])
        return
      }
      const result = await response.json()
      setFarmers(result.farmers?.map((f: any) => ({
        id: f.id,
        farmName: f.farmName,
        location: f.location
      })) || [])
    } catch (error) {
      // console.error("Error fetching farmers:", error)
      setFarmers([])
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchProducts()
  }

  const handleCategoryToggle = (category: string) => {
    setSelectedCategories(prev =>
      prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]
    )
  }

  const handleFarmerToggle = (farmerId: string) => {
    setSelectedFarmers(prev =>
      prev.includes(farmerId) ? prev.filter(f => f !== farmerId) : [...prev, farmerId]
    )
  }

  const clearAllFilters = () => {
    setSelectedCategories([])
    setPriceRange([0, 1000])
    setSelectedFarmers([])
    setAvailabilityFilter("all")
    setRatingFilter(0)
    setSearchTerm("")
  }

  const handleWishlistToggle = (product: Product) => {
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

  const handleQuickView = (product: Product) => {
    setQuickViewProduct(product)
    setIsQuickViewOpen(true)
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

  const activeFiltersCount = selectedCategories.length + selectedFarmers.length + 
    (availabilityFilter !== "all" ? 1 : 0) + (ratingFilter > 0 ? 1 : 0)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-6 px-4">
        <div className="flex items-center text-sm text-gray-600 mb-6">
          <Link href="/" className="hover:text-[#00B207] transition-colors">
            Home
          </Link>
          <ChevronRight className="w-4 h-4 mx-2" />
          <span className="text-gray-900 font-medium">Products</span>
        </div>

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Fresh Organic Products</h1>
          <p className="text-gray-600">
            Discover fresh, organic produce directly from local farmers
          </p>
        </div>

        <div className="flex gap-6">
          <aside className="hidden lg:block w-80 flex-shrink-0">
            <Card className="sticky top-6">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-bold text-gray-900">Filters</h2>
                  {activeFiltersCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearAllFilters}
                      className="text-[#00B207] hover:text-[#00B207]/80"
                    >
                      Clear All ({activeFiltersCount})
                    </Button>
                  )}
                </div>

                <Collapsible open={filtersOpen.category} onOpenChange={(open) => setFiltersOpen(prev => ({ ...prev, category: open }))}>
                  <CollapsibleTrigger className="flex items-center justify-between w-full py-3 border-b">
                    <span className="font-semibold text-gray-900">Categories</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${filtersOpen.category ? 'rotate-180' : ''}`} />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-4 space-y-3">
                    {["All", "Vegetables", "Fruits", "Dairy", "Organic"].map((category) => (
                      <label key={category} className="flex items-center space-x-3 cursor-pointer">
                        <Checkbox
                          checked={category === "All" ? selectedCategories.length === 0 : selectedCategories.includes(category)}
                          onCheckedChange={() => category === "All" ? setSelectedCategories([]) : handleCategoryToggle(category)}
                        />
                        <span className="text-sm text-gray-700">{category}</span>
                      </label>
                    ))}
                  </CollapsibleContent>
                </Collapsible>

                <Collapsible open={filtersOpen.price} onOpenChange={(open) => setFiltersOpen(prev => ({ ...prev, price: open }))}>
                  <CollapsibleTrigger className="flex items-center justify-between w-full py-3 border-b">
                    <span className="font-semibold text-gray-900">Price Range</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${filtersOpen.price ? 'rotate-180' : ''}`} />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-4">
                    <div className="space-y-4">
                      <Slider
                        value={priceRange}
                        onValueChange={setPriceRange}
                        min={0}
                        max={1000}
                        step={10}
                        className="w-full"
                      />
                      <div className="flex items-center justify-between text-sm text-gray-600">
                        <span>{formatPrice(priceRange[0])}</span>
                        <span>{formatPrice(priceRange[1])}</span>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {farmers.length > 0 && (
                  <Collapsible open={filtersOpen.farmer} onOpenChange={(open) => setFiltersOpen(prev => ({ ...prev, farmer: open }))}>
                    <CollapsibleTrigger className="flex items-center justify-between w-full py-3 border-b">
                      <span className="font-semibold text-gray-900">Farmers</span>
                      <ChevronDown className={`w-4 h-4 transition-transform ${filtersOpen.farmer ? 'rotate-180' : ''}`} />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-4 space-y-3 max-h-48 overflow-y-auto">
                      {farmers.slice(0, 10).map((farmer) => (
                        <label key={farmer.id} className="flex items-center space-x-3 cursor-pointer">
                          <Checkbox
                            checked={selectedFarmers.includes(farmer.id)}
                            onCheckedChange={() => handleFarmerToggle(farmer.id)}
                          />
                          <span className="text-sm text-gray-700">{farmer.farmName}</span>
                        </label>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                )}

                <Collapsible open={filtersOpen.availability} onOpenChange={(open) => setFiltersOpen(prev => ({ ...prev, availability: open }))}>
                  <CollapsibleTrigger className="flex items-center justify-between w-full py-3 border-b">
                    <span className="font-semibold text-gray-900">Availability</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${filtersOpen.availability ? 'rotate-180' : ''}`} />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-4 space-y-3">
                    {["all", "in_stock", "out_of_stock"].map((option) => (
                      <label key={option} className="flex items-center space-x-3 cursor-pointer">
                        <Checkbox
                          checked={availabilityFilter === option}
                          onCheckedChange={() => setAvailabilityFilter(option)}
                        />
                        <span className="text-sm text-gray-700">
                          {option === "all" ? "All Products" : option === "in_stock" ? "In Stock" : "Out of Stock"}
                        </span>
                      </label>
                    ))}
                  </CollapsibleContent>
                </Collapsible>

                <Collapsible open={filtersOpen.rating} onOpenChange={(open) => setFiltersOpen(prev => ({ ...prev, rating: open }))}>
                  <CollapsibleTrigger className="flex items-center justify-between w-full py-3 border-b">
                    <span className="font-semibold text-gray-900">Rating</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${filtersOpen.rating ? 'rotate-180' : ''}`} />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-4 space-y-3">
                    {[4, 3, 2, 1].map((rating) => (
                      <label key={rating} className="flex items-center space-x-3 cursor-pointer">
                        <Checkbox
                          checked={ratingFilter === rating}
                          onCheckedChange={() => setRatingFilter(rating === ratingFilter ? 0 : rating)}
                        />
                        <div className="flex items-center">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 ${
                                i < rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                              }`}
                            />
                          ))}
                          <span className="text-sm text-gray-700 ml-2">{rating}+ stars</span>
                        </div>
                      </label>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              </div>
            </Card>
          </aside>

          <main className="flex-1">
            <form onSubmit={handleSearch} className="mb-6">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                  type="text"
                  placeholder="Search for products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 h-12 rounded-full"
                />
              </div>
            </form>

            <div className="bg-white rounded-xl p-4 mb-6 flex items-center justify-between flex-wrap gap-4">
              <div className="text-sm text-gray-600">
                Showing <span className="font-semibold text-gray-900">{data?.products.length || 0}</span> products
              </div>
              
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Button
                    variant={viewMode === "grid" ? "default" : "outline"}
                    size="icon"
                    onClick={() => setViewMode("grid")}
                    className={viewMode === "grid" ? "bg-[#00B207] hover:bg-[#00B207]/90" : ""}
                  >
                    <Grid3x3 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === "list" ? "default" : "outline"}
                    size="icon"
                    onClick={() => setViewMode("list")}
                    className={viewMode === "list" ? "bg-[#00B207] hover:bg-[#00B207]/90" : ""}
                  >
                    <List className="w-4 h-4" />
                  </Button>
                </div>

                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="featured">Featured</SelectItem>
                    <SelectItem value="price_low">Price: Low to High</SelectItem>
                    <SelectItem value="price_high">Price: High to Low</SelectItem>
                    <SelectItem value="newest">Newest</SelectItem>
                    <SelectItem value="rating">Rating</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {isLoading ? (
              <div className={`grid ${viewMode === "grid" ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "grid-cols-1"} gap-6`}>
                {Array.from({ length: 8 }).map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <div className={`${viewMode === "grid" ? "aspect-square" : "h-48"} bg-gray-200 rounded-t-xl`}></div>
                    <CardContent className="p-4">
                      <div className="h-4 bg-gray-200 rounded mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : data?.products.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-24 h-24 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <Search className="w-12 h-12 text-gray-400" />
                </div>
                <h3 className="text-xl font-medium text-gray-900 mb-2">No products found</h3>
                <p className="text-gray-600 mb-6">
                  Try adjusting your search or filter criteria.
                </p>
                <Button onClick={clearAllFilters} className="bg-[#00B207] hover:bg-[#00B207]/90">
                  Clear Filters
                </Button>
              </div>
            ) : (
              <>
                <div className={`grid ${viewMode === "grid" ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "grid-cols-1"} gap-6`}>
                  {data?.products.map((product) => (
                    <Card key={product.id} className="group relative overflow-hidden hover:shadow-xl transition-all duration-300 rounded-xl">
                      <div className="absolute top-3 right-3 z-10 flex flex-col gap-2">
                        <button
                          onClick={() => handleWishlistToggle(product)}
                          className="p-2 bg-white rounded-full shadow-md hover:bg-gray-50 transition-colors"
                        >
                          <Heart
                            className={`w-5 h-5 transition-colors ${
                              isInWishlist(product.id) ? "fill-red-500 text-red-500" : "text-gray-600"
                            }`}
                          />
                        </button>
                        <button
                          onClick={() => handleQuickView(product)}
                          className="p-2 bg-white rounded-full shadow-md hover:bg-gray-50 transition-colors"
                        >
                          <Eye className="w-5 h-5 text-gray-600" />
                        </button>
                      </div>

                      {product.category === "Organic" && (
                        <Badge className="absolute top-3 left-3 z-10 bg-[#00B207] text-white">
                          Organic
                        </Badge>
                      )}

                      <Link href={`/products/${product.id}`}>
                        <div className={`${viewMode === "grid" ? "aspect-square" : "h-48"} relative overflow-hidden bg-gray-100`}>
                          {product.images.length > 0 ? (
                            <Image
                              src={product.images[0]}
                              alt={product.name}
                              fill
                              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
                              className="object-cover group-hover:scale-110 transition-transform duration-500"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              <div className="text-center">
                                <div className="w-16 h-16 mx-auto bg-gray-200 rounded-full flex items-center justify-center mb-2">
                                  🥬
                                </div>
                                <p className="text-sm">No image</p>
                              </div>
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
                        
                        <p className="text-sm text-gray-600 mb-2">
                          by {product.farmer.farmName}
                        </p>

                        <div className="flex items-center gap-1 mb-3">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 ${
                                i < product.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                              }`}
                            />
                          ))}
                          <span className="text-xs text-gray-500 ml-1">({product.rating}.0)</span>
                        </div>

                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <span className="text-xl font-bold text-[#00B207]">
                              {formatPrice(product.basePrice)}
                            </span>
                            <span className="text-sm text-gray-500 ml-1">/ {product.unit}</span>
                          </div>
                        </div>

                        <Button
                          onClick={() => handleAddToCart(product)}
                          className="w-full bg-[#00B207] hover:bg-[#00B207]/90 text-white opacity-0 group-hover:opacity-100 transition-opacity rounded-full"
                        >
                          <ShoppingCart className="w-4 h-4 mr-2" />
                          Add to Cart
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {data && data.pagination.pages > 1 && (
                  <div className="mt-10 flex justify-center">
                    <div className="flex gap-2">
                      {Array.from({ length: data.pagination.pages }, (_, i) => i + 1).map((page) => (
                        <Button
                          key={page}
                          variant={page === currentPage ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                          className={page === currentPage ? "bg-[#00B207] hover:bg-[#00B207]/90" : ""}
                        >
                          {page}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>

      <QuickViewModal
        product={quickViewProduct}
        isOpen={isQuickViewOpen}
        onClose={() => {
          setIsQuickViewOpen(false)
          setQuickViewProduct(null)
        }}
      />
    </div>
  )
}
