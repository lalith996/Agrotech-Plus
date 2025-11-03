import Head from 'next/head'
import Link from 'next/link'

const products = [
  { id: 1, name: 'Organic Tomatoes', price: '₹60/kg', image: '🍅' },
  { id: 2, name: 'Fresh Spinach', price: '₹40/kg', image: '🥬' },
  { id: 3, name: 'Organic Carrots', price: '₹50/kg', image: '🥕' },
  { id: 4, name: 'Fresh Lettuce', price: '₹45/kg', image: '🥗' },
  { id: 5, name: 'Organic Potatoes', price: '₹35/kg', image: '🥔' },
  { id: 6, name: 'Fresh Broccoli', price: '₹80/kg', image: '🥦' },
]

export default function Products() {
  return (
    <>
      <Head>
        <title>Products - AgroTrack+</title>
      </Head>

      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <Link href="/" className="text-2xl font-bold text-green-600">
                AgroTrack+
              </Link>
              <nav className="flex gap-6">
                <Link href="/" className="text-gray-700 hover:text-green-600">
                  Home
                </Link>
                <Link href="/products" className="text-green-600 font-semibold">
                  Products
                </Link>
                <Link href="/about" className="text-gray-700 hover:text-green-600">
                  About
                </Link>
              </nav>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">Our Products</h1>
          
          <div className="grid md:grid-cols-3 gap-6">
            {products.map((product) => (
              <div key={product.id} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
                <div className="h-48 bg-gradient-to-br from-green-100 to-green-50 flex items-center justify-center">
                  <span className="text-8xl">{product.image}</span>
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold mb-2">{product.name}</h3>
                  <p className="text-2xl text-green-600 font-bold mb-4">{product.price}</p>
                  <button className="w-full py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                    Add to Cart
                  </button>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </>
  )
}
