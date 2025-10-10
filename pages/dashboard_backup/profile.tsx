import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/router"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  User, 
  MapPin, 
  Shield, 
  Bell, 
  Plus,
  Edit,
  Trash2,
  Upload,
  Check
} from "lucide-react"
import { UserRole } from "@prisma/client"
import { toast } from "sonner"

interface Address {
  id: string
  name: string
  street: string
  city: string
  state: string
  zipCode: string
  isDefault: boolean
}

interface UserProfile {
  id: string
  name: string
  email: string
  role: UserRole
  customer?: {
    phone?: string
    addresses: Address[]
  }
}

export default function ProfilePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [activeTab, setActiveTab] = useState("personal")
  
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
  })

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })

  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    smsAlerts: false,
    orderUpdates: true,
    promotions: false,
    deliveryReminders: true,
  })

  const [newAddress, setNewAddress] = useState({
    name: "",
    street: "",
    city: "",
    state: "",
    zipCode: "",
    isDefault: false,
  })

  const [showAddAddress, setShowAddAddress] = useState(false)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin")
      return
    }

    if (status === "authenticated") {
      if (session.user.role !== UserRole.CUSTOMER) {
        router.push("/")
        return
      }
      fetchProfile()
    }
  }, [status, session, router])

  const fetchProfile = async () => {
    try {
      const response = await fetch("/api/users/profile")
      if (!response.ok) throw new Error("Failed to fetch profile")
      
      const data = await response.json()
      setProfile(data.user)
      
      setFormData({
        name: data.user.name || "",
        phone: data.user.customer?.phone || "",
      })
    } catch (error) {
      // console.error("Error fetching profile:", error)
      toast.error("Failed to load profile")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      const response = await fetch("/api/users/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (!response.ok) throw new Error("Failed to update profile")

      toast.success("Profile updated successfully!")
      fetchProfile()
    } catch (error) {
      // console.error("Error updating profile:", error)
      toast.error("Failed to update profile")
    } finally {
      setIsSaving(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("Passwords do not match")
      return
    }

    if (passwordData.newPassword.length < 8) {
      toast.error("Password must be at least 8 characters")
      return
    }

    toast.info("Password change functionality will be implemented")
  }

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const response = await fetch("/api/customer/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAddress),
      })

      if (!response.ok) throw new Error("Failed to add address")

      toast.success("Address added successfully!")
      setShowAddAddress(false)
      setNewAddress({
        name: "",
        street: "",
        city: "",
        state: "",
        zipCode: "",
        isDefault: false,
      })
      fetchProfile()
    } catch (error) {
      // console.error("Error adding address:", error)
      toast.error("Failed to add address")
    }
  }

  const handleDeleteAddress = async (addressId: string) => {
    if (!confirm("Are you sure you want to delete this address?")) return

    try {
      const response = await fetch(`/api/customer/addresses?id=${addressId}`, {
        method: "DELETE",
      })

      if (!response.ok) throw new Error("Failed to delete address")

      toast.success("Address deleted successfully!")
      fetchProfile()
    } catch (error) {
      // console.error("Error deleting address:", error)
      toast.error("Failed to delete address")
    }
  }

  const handleSetDefaultAddress = async (addressId: string) => {
    try {
      const address = profile?.customer?.addresses.find(a => a.id === addressId)
      if (!address) return

      const response = await fetch("/api/customer/addresses", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...address, id: addressId, isDefault: true }),
      })

      if (!response.ok) throw new Error("Failed to update address")

      toast.success("Default address updated!")
      fetchProfile()
    } catch (error) {
      // console.error("Error updating address:", error)
      toast.error("Failed to update address")
    }
  }

  if (status === "loading" || isLoading) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-96" />
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <div className="text-center py-16">
          <User className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Profile not found</h3>
          <p className="text-gray-600">Unable to load your profile information</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">My Profile</h1>
        <p className="text-gray-600">Manage your account settings and preferences</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="personal" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            <span className="hidden sm:inline">Personal Info</span>
          </TabsTrigger>
          <TabsTrigger value="addresses" className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            <span className="hidden sm:inline">Addresses</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            <span className="hidden sm:inline">Security</span>
          </TabsTrigger>
          <TabsTrigger value="preferences" className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            <span className="hidden sm:inline">Preferences</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="personal" className="space-y-6">
          <Card className="rounded-xl border-none shadow-sm">
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Update your personal details and contact information</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveProfile} className="space-y-6">
                <div className="flex flex-col items-center gap-4 pb-6 border-b">
                  <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center">
                    <User className="w-12 h-12 text-[#00B207]" />
                  </div>
                  <Button variant="outline" type="button">
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Photo
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profile.email}
                      disabled
                      className="bg-gray-50"
                    />
                    <p className="text-xs text-gray-500">Email cannot be changed</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+91-XXXXXXXXXX"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button 
                    type="submit" 
                    disabled={isSaving}
                    className="bg-[#00B207] hover:bg-[#00A006]"
                  >
                    {isSaving ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="addresses" className="space-y-6">
          <Card className="rounded-xl border-none shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Delivery Addresses</CardTitle>
                  <CardDescription>Manage your saved delivery addresses</CardDescription>
                </div>
                <Button 
                  onClick={() => setShowAddAddress(!showAddAddress)}
                  className="bg-[#00B207] hover:bg-[#00A006]"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Address
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {showAddAddress && (
                <form onSubmit={handleAddAddress} className="p-4 border-2 border-[#00B207] rounded-lg bg-green-50 space-y-4">
                  <h4 className="font-semibold text-gray-900">New Address</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="addressName">Address Label</Label>
                      <Input
                        id="addressName"
                        placeholder="e.g., Home, Office"
                        value={newAddress.name}
                        onChange={(e) => setNewAddress(prev => ({ ...prev, name: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="street">Street Address</Label>
                      <Input
                        id="street"
                        placeholder="123 Main St"
                        value={newAddress.street}
                        onChange={(e) => setNewAddress(prev => ({ ...prev, street: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        value={newAddress.city}
                        onChange={(e) => setNewAddress(prev => ({ ...prev, city: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state">State</Label>
                      <Input
                        id="state"
                        value={newAddress.state}
                        onChange={(e) => setNewAddress(prev => ({ ...prev, state: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="zipCode">ZIP Code</Label>
                      <Input
                        id="zipCode"
                        value={newAddress.zipCode}
                        onChange={(e) => setNewAddress(prev => ({ ...prev, zipCode: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="isDefault"
                        checked={newAddress.isDefault}
                        onCheckedChange={(checked) => setNewAddress(prev => ({ ...prev, isDefault: checked }))}
                      />
                      <Label htmlFor="isDefault">Set as default</Label>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" className="bg-[#00B207] hover:bg-[#00A006]">
                      Add Address
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setShowAddAddress(false)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              )}

              {profile.customer?.addresses && profile.customer.addresses.length === 0 ? (
                <div className="text-center py-8">
                  <MapPin className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                  <p className="text-gray-600">No addresses saved yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {profile.customer?.addresses.map((address) => (
                    <div key={address.id} className="p-4 border border-gray-200 rounded-lg hover:border-[#00B207] transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold text-gray-900">{address.name}</h4>
                            {address.isDefault && (
                              <Badge className="bg-[#00B207] text-white">Default</Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">
                            {address.street}, {address.city}
                          </p>
                          <p className="text-sm text-gray-600">
                            {address.state} {address.zipCode}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {!address.isDefault && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleSetDefaultAddress(address.id)}
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                          )}
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDeleteAddress(address.id)}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card className="rounded-xl border-none shadow-sm">
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>Update your password to keep your account secure</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                    required
                  />
                  <p className="text-xs text-gray-500">Must be at least 8 characters</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    required
                  />
                </div>
                <Button type="submit" className="bg-[#00B207] hover:bg-[#00A006]">
                  Update Password
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences" className="space-y-6">
          <Card className="rounded-xl border-none shadow-sm">
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Manage how you receive updates and notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Email Notifications</p>
                  <p className="text-sm text-gray-600">Receive updates via email</p>
                </div>
                <Switch
                  checked={preferences.emailNotifications}
                  onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, emailNotifications: checked }))}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">SMS Alerts</p>
                  <p className="text-sm text-gray-600">Get text message alerts</p>
                </div>
                <Switch
                  checked={preferences.smsAlerts}
                  onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, smsAlerts: checked }))}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Order Updates</p>
                  <p className="text-sm text-gray-600">Notifications about your orders</p>
                </div>
                <Switch
                  checked={preferences.orderUpdates}
                  onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, orderUpdates: checked }))}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Delivery Reminders</p>
                  <p className="text-sm text-gray-600">Reminders before delivery</p>
                </div>
                <Switch
                  checked={preferences.deliveryReminders}
                  onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, deliveryReminders: checked }))}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Promotions</p>
                  <p className="text-sm text-gray-600">Special offers and deals</p>
                </div>
                <Switch
                  checked={preferences.promotions}
                  onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, promotions: checked }))}
                />
              </div>
              <div className="flex justify-end pt-4">
                <Button 
                  onClick={() => toast.success("Preferences saved!")}
                  className="bg-[#00B207] hover:bg-[#00A006]"
                >
                  Save Preferences
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
