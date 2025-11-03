import { signOut } from 'next-auth/react'
import Link from 'next/link'

interface User {
  id: string
  email: string
  name?: string | null
  role: string
}

export default function AdminDashboard({ user }: { user: User }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-green-600">AgroTrack+ Admin</h1>
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
            <h3 className="text-gray-600 mb-2">Total Users</h3>
            <p className="text-3xl font-bold text-green-600">1,234</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow">
            <h3 className="text-gray-600 mb-2">Active Farmers</h3>
            <p className="text-3xl font-bold text-blue-600">456</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow">
            <h3 className="text-gray-600 mb-2">Total Orders</h3>
            <p className="text-3xl font-bold text-purple-600">789</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-xl font-bold mb-4">Admin Actions</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <Link href="/admin/users" className="p-4 border-2 border-gray-200 rounded-lg hover:border-green-600 transition-colors">
              <h3 className="font-semibold mb-2">👥 Manage Users</h3>
              <p className="text-sm text-gray-600">View and manage all users</p>
            </Link>
            <Link href="/admin/farmers" className="p-4 border-2 border-gray-200 rounded-lg hover:border-green-600 transition-colors">
              <h3 className="font-semibold mb-2">🌾 Manage Farmers</h3>
              <p className="text-sm text-gray-600">Approve and manage farmers</p>
            </Link>
            <Link href="/admin/products" className="p-4 border-2 border-gray-200 rounded-lg hover:border-green-600 transition-colors">
              <h3 className="font-semibold mb-2">📦 Manage Products</h3>
              <p className="text-sm text-gray-600">View and manage products</p>
            </Link>
            <Link href="/admin/orders" className="p-4 border-2 border-gray-200 rounded-lg hover:border-green-600 transition-colors">
              <h3 className="font-semibold mb-2">🛒 Manage Orders</h3>
              <p className="text-sm text-gray-600">View and process orders</p>
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
