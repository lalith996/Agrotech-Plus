import Head from 'next/head'
import Link from 'next/link'

export default function Home() {
  return (
    <>
      <Head>
        <title>AgroTrack+ - Farm to Table Platform</title>
        <meta name="description" content="Connecting farmers directly with consumers" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-green-50 to-white">
        {/* Header */}
        <header className="bg-white shadow-sm">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-green-600">AgroTrack+</h1>
              <nav className="flex gap-6 items-center">
                <Link href="/products" className="text-gray-700 hover:text-green-600">
                  Products
                </Link>
                <Link href="/about" className="text-gray-700 hover:text-green-600">
                  About
                </Link>
                <Link href="/contact" className="text-gray-700 hover:text-green-600">
                  Contact
                </Link>
                <Link href="/auth/signin" className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                  Sign In
                </Link>
              </nav>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <main className="container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-5xl font-bold text-gray-900 mb-6">
              Fresh Organic Produce
              <br />
              <span className="text-green-600">Farm to Your Table</span>
            </h2>
            <p className="text-xl text-gray-600 mb-8">
              Connecting local farmers directly with consumers for the freshest organic produce
            </p>
            <div className="flex gap-4 justify-center">
              <Link
                href="/products"
                className="px-8 py-3 bg-green-600 text-white rounded-full font-semibold hover:bg-green-700 transition-colors"
              >
                Shop Now
              </Link>
              <Link
                href="/about"
                className="px-8 py-3 bg-white text-green-600 border-2 border-green-600 rounded-full font-semibold hover:bg-green-50 transition-colors"
              >
                Learn More
              </Link>
            </div>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-8 mt-20">
            <div className="bg-white p-8 rounded-2xl shadow-lg text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🌱</span>
              </div>
              <h3 className="text-xl font-bold mb-2">100% Organic</h3>
              <p className="text-gray-600">
                All products are certified organic and pesticide-free
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-lg text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🚚</span>
              </div>
              <h3 className="text-xl font-bold mb-2">Fast Delivery</h3>
              <p className="text-gray-600">
                Fresh produce delivered within 24 hours of harvest
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-lg text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">👨‍🌾</span>
              </div>
              <h3 className="text-xl font-bold mb-2">Support Farmers</h3>
              <p className="text-gray-600">
                Direct connection ensures fair prices for local farmers
              </p>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="bg-gray-900 text-white py-8 mt-20">
          <div className="container mx-auto px-4 text-center">
            <p>&copy; 2025 AgroTrack+. All rights reserved.</p>
            <p className="text-gray-400 mt-2">Connecting farmers and consumers for a sustainable future</p>
          </div>
        </footer>
      </div>
    </>
  )
}
