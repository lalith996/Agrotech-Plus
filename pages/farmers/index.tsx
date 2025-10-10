import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { 
  Search, 
  MapPin, 
  Award, 
  Star,
  ChevronDown,
  ChevronRight,
  Map as MapIcon,
  User
} from "lucide-react"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

interface Farmer {
  id: string
  farmName: string
  location: string
  user: {
    name: string
  }
}

const LOCATIONS = ["Bangalore North", "Bangalore South", "Bangalore East", "Bangalore West"]

const FARMER_IMAGES = [
  "https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1566616213894-2d4e1baee5d8?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1592982537447-7440770cbfc9?w=400&h=400&fit=crop",
]

const MOCK_CERTIFICATIONS = [
  { name: "Organic India", color: "bg-green-100 text-green-800" },
  { name: "USDA Organic", color: "bg-blue-100 text-blue-800" },
  { name: "EU Organic", color: "bg-purple-100 text-purple-800" },
  { name: "Pesticide-Free", color: "bg-yellow-100 text-yellow-800" },
]

export default function FarmersDirectory() {
  const [farmers, setFarmers] = useState<Farmer[]>([])
  const [filteredFarmers, setFilteredFarmers] = useState<Farmer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [showMapView, setShowMapView] = useState(false)
  
  const [selectedLocations, setSelectedLocations] = useState<string[]>([])
  
  const [filtersOpen, setFiltersOpen] = useState({
    location: true,
  })

  useEffect(() => {
    fetchFarmers()
  }, [])

  useEffect(() => {
    filterFarmers()
  }, [farmers, searchTerm, selectedLocations])

  const fetchFarmers = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/farmers")
      if (!response.ok) throw new Error("Failed to fetch farmers")
      
      const result = await response.json()
      setFarmers(result.farmers || [])
    } catch (error) {
      // console.error("Error fetching farmers:", error)
      setFarmers([])
    } finally {
      setIsLoading(false)
    }
  }

  const filterFarmers = () => {
    let filtered = [...farmers]

    if (searchTerm) {
      filtered = filtered.filter(
        (farmer) =>
          farmer.farmName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          farmer.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          farmer.location.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (selectedLocations.length > 0) {
      filtered = filtered.filter((farmer) =>
        selectedLocations.some((loc) => farmer.location.toLowerCase().includes(loc.toLowerCase()))
      )
    }

    setFilteredFarmers(filtered)
  }

  const handleLocationToggle = (location: string) => {
    setSelectedLocations((prev) =>
      prev.includes(location) ? prev.filter((l) => l !== location) : [...prev, location]
    )
  }

  const clearAllFilters = () => {
    setSelectedLocations([])
    setSearchTerm("")
  }

  const getRating = (farmerId: string) => {
    return (farmerId.charCodeAt(0) % 5) + 1
  }

  const getFarmerImage = (farmerId: string) => {
    const index = farmerId.charCodeAt(0) % FARMER_IMAGES.length
    return FARMER_IMAGES[index]
  }

  const getFarmerCertifications = (farmerId: string) => {
    const count = (farmerId.charCodeAt(0) % 3) + 1
    return MOCK_CERTIFICATIONS.slice(0, count)
  }

  const activeFiltersCount = selectedLocations.length

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-[#00B207] to-green-600 text-white py-16">
        <div className="container mx-auto px-4">
          <div className="flex items-center text-sm mb-6 opacity-90">
            <Link href="/" className="hover:text-white transition-colors">
              Home
            </Link>
            <ChevronRight className="w-4 h-4 mx-2" />
            <span className="font-medium">Farmers</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold mb-4">Meet Our Farmers</h1>
          <p className="text-xl text-green-50 mb-8 max-w-2xl">
            Connect directly with local organic farmers who grow fresh, sustainable produce
          </p>

          <div className="max-w-3xl">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input
                type="text"
                placeholder="Search by farmer name, farm, or location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 h-14 rounded-full bg-white text-gray-900"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto py-8 px-4">
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

                <Collapsible
                  open={filtersOpen.location}
                  onOpenChange={(open) => setFiltersOpen((prev) => ({ ...prev, location: open }))}
                >
                  <CollapsibleTrigger className="flex items-center justify-between w-full py-3 border-b">
                    <span className="font-semibold text-gray-900">Location</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${filtersOpen.location ? "rotate-180" : ""}`} />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-4 space-y-3">
                    {LOCATIONS.map((location) => (
                      <label key={location} className="flex items-center space-x-3 cursor-pointer">
                        <Checkbox
                          checked={selectedLocations.includes(location)}
                          onCheckedChange={() => handleLocationToggle(location)}
                        />
                        <span className="text-sm text-gray-700">{location}</span>
                      </label>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              </div>
            </Card>
          </aside>

          <main className="flex-1">
            <div className="bg-white rounded-xl p-4 mb-6 flex items-center justify-between flex-wrap gap-4">
              <div className="text-sm text-gray-600">
                Showing <span className="font-semibold text-gray-900">{filteredFarmers.length}</span> farmers
              </div>

              <Button
                variant="outline"
                onClick={() => setShowMapView(!showMapView)}
                className="flex items-center gap-2"
              >
                <MapIcon className="w-4 h-4" />
                {showMapView ? "List View" : "Map View"}
              </Button>
            </div>

            {showMapView ? (
              <Card className="p-16 text-center">
                <MapIcon className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Map View Coming Soon</h3>
                <p className="text-gray-600">
                  We're working on an interactive map to help you find farmers near you.
                </p>
              </Card>
            ) : isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <div className="aspect-square bg-gray-200 rounded-t-xl"></div>
                    <CardContent className="p-6">
                      <div className="h-4 bg-gray-200 rounded mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredFarmers.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-24 h-24 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <Search className="w-12 h-12 text-gray-400" />
                </div>
                <h3 className="text-xl font-medium text-gray-900 mb-2">No farmers found</h3>
                <p className="text-gray-600 mb-6">
                  Try adjusting your search or filter criteria.
                </p>
                <Button onClick={clearAllFilters} className="bg-[#00B207] hover:bg-[#00B207]/90">
                  Clear Filters
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredFarmers.map((farmer) => {
                  const rating = getRating(farmer.id)
                  const certifications = getFarmerCertifications(farmer.id)
                  
                  return (
                    <Card key={farmer.id} className="group overflow-hidden hover:shadow-xl transition-all duration-300 rounded-xl">
                      <div className="aspect-square relative overflow-hidden bg-gray-100">
                        <Image
                          src={getFarmerImage(farmer.id)}
                          alt={farmer.user.name}
                          fill
                          className="object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                      </div>

                      <CardContent className="p-6">
                        <h3 className="font-bold text-xl mb-1 text-gray-900">
                          {farmer.user.name}
                        </h3>
                        
                        <p className="text-[#00B207] font-semibold mb-2">
                          {farmer.farmName}
                        </p>

                        <div className="flex items-center text-gray-600 mb-3">
                          <MapPin className="w-4 h-4 mr-1" />
                          <span className="text-sm">{farmer.location}</span>
                        </div>

                        <div className="flex flex-wrap gap-2 mb-4">
                          {certifications.map((cert) => (
                            <Badge key={cert.name} className={`${cert.color} text-xs`} variant="secondary">
                              <Award className="w-3 h-3 mr-1" />
                              {cert.name}
                            </Badge>
                          ))}
                        </div>

                        <div className="flex items-center gap-1 mb-4">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 ${
                                i < rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                              }`}
                            />
                          ))}
                          <span className="text-sm text-gray-600 ml-2">({rating}.0)</span>
                        </div>

                        <Link href={`/farmers/${farmer.id}`}>
                          <Button className="w-full bg-[#00B207] hover:bg-[#00B207]/90 rounded-full">
                            View Profile
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}
