import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import { useEffect } from 'react'
import Head from 'next/head'
import AdminDashboard from '@/components/dashboards/AdminDashboard'
import FarmerDashboard from '@/components/dashboards/FarmerDashboard'
import CustomerDashboard from '@/components/dashboards/CustomerDashboard'

export default function Dashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  const renderDashboard = () => {
    switch (session.user.role) {
      case 'ADMIN':
        return <AdminDashboard user={session.user} />
      case 'FARMER':
        return <FarmerDashboard user={session.user} />
      case 'CUSTOMER':
        return <CustomerDashboard user={session.user} />
      default:
        return <CustomerDashboard user={session.user} />
    }
  }

  return (
    <>
      <Head>
        <title>Dashboard - AgroTrack+</title>
      </Head>
      {renderDashboard()}
    </>
  )
}
