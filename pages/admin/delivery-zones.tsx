import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/router"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Plus, MapPin, Clock, Users } from "lucide-react"
import { UserRole } from "@prisma/client"

interface DeliverySlot {
  id: string
  dayOfWeek: number
  startTime: string
  endTime: string
  maxOrders: number
  isActive: boolean
}

interface DeliveryZone {
  id: string
  name: string
  description?: string
  isActive: boolean
  slots: DeliverySlot[]
}

const DAYS_OF_WEEK = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"
]

export default function DeliveryZones() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [zones, setZones] = useState<DeliveryZone[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateZoneOpen, setIsCreateZoneOpen] = useState(false)
  const [isCreateSlotOpen, setIsCreateSlotOpen] = useState(false)
  const [selectedZoneId, setSelectedZoneId] = useState("")

  // Zone form state
  const [zoneForm, setZoneForm] = useState({
    name: "",
    description: "",
  })

  // Slot form state
  const [slotForm, setSlotForm] = useState({
    dayOfWeek: "",
    startTime: "",
    endTime: "",
    maxOrders: "50",
  })

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin")
      return
    }

    if (status === "authenticated") {
      if (session.user.role !== UserRole.ADMIN && session.user.role !== UserRole.OPERATIONS) {
        router.push("/")
        return
      }
      fetchZones()
    }
  }, [status, session, router])

  const fetchZones = async () => {
    try {
      const response = await fetch("/api/delivery-zones")
      if (!response.ok) throw new Error("Failed to fetch zones")
      const data = await response.json()
      setZones(data.zones)
    } catch (error) {
      // console.error("Error fetching zones:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateZone = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch("/api/delivery-zones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(zoneForm),
      })

      if (!response.ok) throw new Error("Failed to create zone")

      setIsCreateZoneOpen(false)
      setZoneForm({ name: "", description: "" })
      fetchZones()
    } catch (error) {
      // console.error("Error creating zone:", error)
    }
  }

  const handleCreateSlot = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch(`/api/delivery-zones/${selectedZoneId}/slots`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...slotForm,
          dayOfWeek: parseInt(slotForm.dayOfWeek),
          maxOrders: parseInt(slotForm.maxOrders),
        }),
      })

      if (!response.ok) throw new Error("Failed to create slot")

      setIsCreateSlotOpen(false)
      setSlotForm({ dayOfWeek: "", startTime: "", endTime: "", maxOrders: "50" })
      fetchZones()
    } catch (error) {
      // console.error("Error creating slot:", error)
    }
  }

  if (status === "loading" || isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Delivery Zones</h1>
          <p className="text-gray-600">Manage delivery zones and time slots</p>
        </div>
        <Dialog open={isCreateZoneOpen} onOpenChange={setIsCreateZoneOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Zone
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Delivery Zone</DialogTitle>
              <DialogDescription>
                Add a new delivery zone for customer orders
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateZone} className="space-y-4">
              <div>
                <Label htmlFor="zoneName">Zone Name</Label>
                <Input
                  id="zoneName"
                  value={zoneForm.name}
                  onChange={(e) => setZoneForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Central Bangalore"
                  required
                />
              </div>
              <div>
                <Label htmlFor="zoneDescription">Description</Label>
                <Textarea
                  id="zoneDescription"
                  value={zoneForm.description}
                  onChange={(e) => setZoneForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Optional description of the zone coverage"
                  rows={3}
                />
              </div>
              <Button type="submit" className="w-full">Create Zone</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {zones.map((zone) => (
          <Card key={zone.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center">
                    <MapPin className="w-5 h-5 mr-2" />
                    {zone.name}
                  </CardTitle>
                  {zone.description && (
                    <CardDescription className="mt-1">
                      {zone.description}
                    </CardDescription>
                  )}
                </div>
                <Badge variant={zone.isActive ? "default" : "secondary"}>
                  {zone.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2 flex items-center">
                    <Clock className="w-4 h-4 mr-2" />
                    Time Slots ({zone.slots.length})
                  </h4>
                  {zone.slots.length === 0 ? (
                    <p className="text-sm text-gray-500">No slots configured</p>
                  ) : (
                    <div className="space-y-2">
                      {zone.slots.slice(0, 3).map((slot) => (
                        <div key={slot.id} className="flex justify-between text-sm">
                          <span>{DAYS_OF_WEEK[slot.dayOfWeek]}</span>
                          <span>{slot.startTime} - {slot.endTime}</span>
                          <span className="text-gray-500">
                            <Users className="w-3 h-3 inline mr-1" />
                            {slot.maxOrders}
                          </span>
                        </div>
                      ))}
                      {zone.slots.length > 3 && (
                        <p className="text-xs text-gray-500">
                          +{zone.slots.length - 3} more slots
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <Dialog 
                  open={isCreateSlotOpen && selectedZoneId === zone.id} 
                  onOpenChange={(open) => {
                    setIsCreateSlotOpen(open)
                    if (open) setSelectedZoneId(zone.id)
                  }}
                >
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Time Slot
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Time Slot</DialogTitle>
                      <DialogDescription>
                        Create a new delivery time slot for {zone.name}
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateSlot} className="space-y-4">
                      <div>
                        <Label htmlFor="dayOfWeek">Day of Week</Label>
                        <Select 
                          value={slotForm.dayOfWeek} 
                          onValueChange={(value) => setSlotForm(prev => ({ ...prev, dayOfWeek: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select day" />
                          </SelectTrigger>
                          <SelectContent>
                            {DAYS_OF_WEEK.map((day, index) => (
                              <SelectItem key={index} value={index.toString()}>
                                {day}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="startTime">Start Time</Label>
                          <Input
                            id="startTime"
                            type="time"
                            value={slotForm.startTime}
                            onChange={(e) => setSlotForm(prev => ({ ...prev, startTime: e.target.value }))}
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="endTime">End Time</Label>
                          <Input
                            id="endTime"
                            type="time"
                            value={slotForm.endTime}
                            onChange={(e) => setSlotForm(prev => ({ ...prev, endTime: e.target.value }))}
                            required
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="maxOrders">Max Orders</Label>
                        <Input
                          id="maxOrders"
                          type="number"
                          min="1"
                          value={slotForm.maxOrders}
                          onChange={(e) => setSlotForm(prev => ({ ...prev, maxOrders: e.target.value }))}
                          required
                        />
                      </div>
                      <Button type="submit" className="w-full">Create Slot</Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}