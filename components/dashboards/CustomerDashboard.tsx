import { signOut } from 'next-auth/react'
import Link from 'next/link'

interface User {
  id: string
  email: string
  name?: string | null
  role: string
}

export default function CustomerDashboard({ user }: { user: User }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-green-600">My Dashboard</h1>
            <p className="text-sm text-gray-600">Welcome back, {user.name}</p>
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
            <h3 className="text-gray-600 mb-2">My Orders</h3>
            <p className="text-3xl font-bold text-green-600">8</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow">
            <h3 className="text-gray-600 mb-2">Wishlist Items</h3>
            <p className="text-3xl font-bold text-pink-600">15</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow">
            <h3 className="text-gray-600 mb-2">Total Spent</h3>
            <p className="text-3xl font-bold text-blue-600">₹12,500</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <Link href="/products" className="p-4 border-2 border-gray-200 rounded-lg hover:border-green-600 transition-colors">
              <h3 className="font-semibold mb-2">🛒 Shop Products</h3>
              <p className="text-sm text-gray-600">Browse fresh organic produce</p>
            </Link>
            <Link href="/customer/orders" className="p-4 border-2 border-gray-200 rounded-lg hover:border-green-600 transition-colors">
              <h3 className="font-semibold mb-2">📦 My Orders</h3>
              <p className="text-sm text-gray-600">Track your orders</p>
            </Link>
            <Link href="/customer/wishlist" className="p-4 border-2 border-gray-200 rounded-lg hover:border-green-600 transition-colors">
              <h3 className="font-semibold mb-2">❤️ Wishlist</h3>
              <p className="text-sm text-gray-600">View saved items</p>
            </Link>
            <Link href="/customer/profile" className="p-4 border-2 border-gray-200 rounded-lg hover:border-green-600 transition-colors">
              <h3 className="font-semibold mb-2">👤 Profile</h3>
              <p className="text-sm text-gray-600">Manage your account</p>
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-xl font-bold mb-4">Recent Orders</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-semibold">Order #1234</p>
                <p className="text-sm text-gray-600">Organic Tomatoes, Fresh Spinach</p>
              </div>
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">Delivered</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-semibold">Order #1233</p>
                <p className="text-sm text-gray-600">Fresh Carrots, Broccoli</p>
              </div>
              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">In Transit</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
