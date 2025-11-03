import { signOut } from 'next-auth/react'
import Link from 'next/link'

interface User {
  id: string
  email: string
  name?: string | null
  role: string
}

export default function FarmerDashboard({ user }: { user: User }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-green-600">Farmer Dashboard</h1>
            <p className="text-sm text-gray-600">Welcome, {user.name}</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Sign Out
          </button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow">
            <h3 className="text-gray-600 mb-2">My Products</h3>
            <p className="text-3xl font-bold text-green-600">12</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow">
            <h3 className="text-gray-600 mb-2">Pending Orders</h3>
            <p className="text-3xl font-bold text-orange-600">5</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow">
            <h3 className="text-gray-600 mb-2">Total Earnings</h3>
            <p className="text-3xl font-bold text-blue-600">₹45,000</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-xl font-bold mb-4">Farmer Actions</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <Link href="/farmer/products" className="p-4 border-2 border-gray-200 rounded-lg hover:border-green-600 transition-colors">
              <h3 className="font-semibold mb-2">🌾 My Products</h3>
              <p className="text-sm text-gray-600">Manage your product listings</p>
            </Link>
            <Link href="/farmer/orders" className="p-4 border-2 border-gray-200 rounded-lg hover:border-green-600 transition-colors">
              <h3 className="font-semibold mb-2">📦 Orders</h3>
              <p className="text-sm text-gray-600">View and fulfill orders</p>
            </Link>
            <Link href="/farmer/inventory" className="p-4 border-2 border-gray-200 rounded-lg hover:border-green-600 transition-colors">
              <h3 className="font-semibold mb-2">📊 Inventory</h3>
              <p className="text-sm text-gray-600">Manage your inventory</p>
            </Link>
            <Link href="/farmer/earnings" className="p-4 border-2 border-gray-200 rounded-lg hover:border-green-600 transition-colors">
              <h3 className="font-semibold mb-2">💰 Earnings</h3>
              <p className="text-sm text-gray-600">View your earnings</p>
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
