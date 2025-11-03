import { motion } from "framer-motion"
import Link from "next/link"
import { MainLayout } from "@/components/layout/main-layout"
import { 
  Target, 
  Eye, 
  Users, 
  ShoppingBag, 
  MapPin,
  Leaf,
  Heart,
  Award,
  Shield,
  TrendingUp
} from "lucide-react"

const stats = [
  { label: "Active Farmers", value: "500+", icon: Users },
  { label: "Organic Products", value: "2,000+", icon: ShoppingBag },
  { label: "Happy Customers", value: "10,000+", icon: Heart },
  { label: "Cities Served", value: "25+", icon: MapPin },
]

const timeline = [
  {
    year: "2020",
    title: "The Beginning",
    description: "Started with a vision to connect farmers directly with consumers in Bangalore."
  },
  {
    year: "2021",
    title: "Expansion",
    description: "Grew to 100+ farmers and launched our organic certification program."
  },
  {
    year: "2022",
    title: "Going Digital",
    description: "Launched our mobile app and introduced subscription services."
  },
  {
    year: "2023",
    title: "Regional Growth",
    description: "Expanded to 15 cities across South India with cold chain logistics."
  },
  {
    year: "2024",
    title: "Innovation",
    description: "Introduced AI-powered quality control and blockchain traceability."
  },
  {
    year: "2025",
    title: "Nationwide Impact",
    description: "Serving 25+ cities with 500+ farmers, making organic food accessible to all."
  },
]

const team = [
  {
    name: "Priya Sharma",
    role: "Founder & CEO",
    bio: "15 years in agricultural technology and sustainable farming",
    image: "https://ui-avatars.com/api/?name=Priya+Sharma&background=00B207&color=fff&size=200"
  },
  {
    name: "Rajesh Kumar",
    role: "Chief Technology Officer",
    bio: "Tech innovator passionate about farm-to-table solutions",
    image: "https://ui-avatars.com/api/?name=Rajesh+Kumar&background=00B207&color=fff&size=200"
  },
  {
    name: "Anjali Desai",
    role: "Head of Operations",
    bio: "Expert in supply chain and logistics management",
    image: "https://ui-avatars.com/api/?name=Anjali+Desai&background=00B207&color=fff&size=200"
  },
  {
    name: "Vikram Patel",
    role: "Head of Farmer Relations",
    bio: "Building strong partnerships with farming communities",
    image: "https://ui-avatars.com/api/?name=Vikram+Patel&background=00B207&color=fff&size=200"
  },
]

const values = [
  {
    icon: Leaf,
    title: "100% Organic",
    description: "All our products are certified organic and pesticide-free"
  },
  {
    icon: Heart,
    title: "Farm Fresh",
    description: "Delivered within 24 hours of harvest for maximum freshness"
  },
  {
    icon: MapPin,
    title: "Local Sourcing",
    description: "Supporting local farmers and reducing carbon footprint"
  },
  {
    icon: Shield,
    title: "Transparent",
    description: "Complete traceability from farm to your doorstep"
  },
]

export default function AboutPage() {
  return (
    <MainLayout>
      <div className="bg-white">
        {/* Hero Section */}
        <section className="relative bg-gradient-to-br from-green-50 to-white py-16 md:py-24">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="max-w-3xl mx-auto text-center"
            >
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[#00B207] mb-6">
                <Leaf className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                About AgroTrack+
              </h1>
              <p className="text-xl text-gray-600 leading-relaxed">
                Connecting farmers and consumers for a healthier, more sustainable future. 
                We're on a mission to make fresh, organic produce accessible to everyone.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-16 border-b">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
              {stats.map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="text-center"
                >
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-50 mb-4">
                    <stat.icon className="w-8 h-8 text-[#00B207]" />
                  </div>
                  <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                    {stat.value}
                  </h3>
                  <p className="text-gray-600 text-sm md:text-base">{stat.label}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Mission & Vision */}
        <section className="py-16 md:py-20">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-2 gap-8 md:gap-12 max-w-6xl mx-auto">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="bg-gradient-to-br from-green-50 to-white rounded-2xl p-8 md:p-10 shadow-lg"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#00B207] mb-6">
                  <Target className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
                  Our Mission
                </h2>
                <p className="text-gray-600 leading-relaxed">
                  To revolutionize the agricultural supply chain by connecting farmers directly 
                  with consumers, ensuring fair prices for farmers and fresh, organic produce 
                  for families. We believe in sustainable farming practices that protect our 
                  planet while nourishing our communities.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="bg-gradient-to-br from-blue-50 to-white rounded-2xl p-8 md:p-10 shadow-lg"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-600 mb-6">
                  <Eye className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
                  Our Vision
                </h2>
                <p className="text-gray-600 leading-relaxed">
                  To create a future where every household has access to fresh, affordable, 
                  organic produce while empowering farmers with fair compensation and cutting-edge 
                  technology. We envision a transparent, sustainable food system that benefits 
                  everyone in the supply chain.
                </p>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Our Story Timeline */}
        <section className="py-16 md:py-20 bg-gray-50">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Our Story
              </h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                From a small startup to a nationwide movement for sustainable agriculture
              </p>
            </motion.div>

            <div className="max-w-4xl mx-auto">
              {timeline.map((item, index) => (
                <motion.div
                  key={item.year}
                  initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="relative mb-8 last:mb-0"
                >
                  <div className="flex items-start gap-6">
                    <div className="flex-shrink-0 w-24 text-right">
                      <span className="text-2xl font-bold text-[#00B207]">{item.year}</span>
                    </div>
                    <div className="relative flex-shrink-0">
                      <div className="w-4 h-4 rounded-full bg-[#00B207] border-4 border-white shadow-lg" />
                      {index !== timeline.length - 1 && (
                        <div className="absolute top-4 left-1/2 w-0.5 h-full bg-green-200 -translate-x-1/2" />
                      )}
                    </div>
                    <div className="flex-1 bg-white rounded-xl p-6 shadow-md">
                      <h3 className="text-xl font-bold text-gray-900 mb-2">
                        {item.title}
                      </h3>
                      <p className="text-gray-600">{item.description}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Meet the Team */}
        <section className="py-16 md:py-20">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Meet the Team
              </h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Passionate individuals dedicated to transforming agriculture
              </p>
            </motion.div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
              {team.map((member, index) => (
                <motion.div
                  key={member.name}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow"
                >
                  <div className="aspect-square bg-gradient-to-br from-green-100 to-green-50">
                    <img
                      src={member.image}
                      alt={member.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-1">
                      {member.name}
                    </h3>
                    <p className="text-[#00B207] font-medium mb-3">{member.role}</p>
                    <p className="text-gray-600 text-sm">{member.bio}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Values Section */}
        <section className="py-16 md:py-20 bg-gradient-to-br from-green-50 to-white">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Our Values
              </h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                The principles that guide everything we do
              </p>
            </motion.div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 max-w-6xl mx-auto">
              {values.map((value, index) => (
                <motion.div
                  key={value.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="bg-white rounded-2xl p-8 text-center shadow-lg hover:shadow-xl transition-all hover:-translate-y-1"
                >
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-50 mb-4">
                    <value.icon className="w-8 h-8 text-[#00B207]" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">
                    {value.title}
                  </h3>
                  <p className="text-gray-600">{value.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 md:py-20 bg-[#00B207] text-white">
          <div className="container mx-auto px-4 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="max-w-2xl mx-auto"
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Join Our Movement
              </h2>
              <p className="text-green-50 mb-8 text-lg">
                Be part of the revolution in sustainable agriculture. Start your journey to healthier living today.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/products"
                  className="inline-flex items-center justify-center px-8 py-3 bg-white text-[#00B207] rounded-full font-semibold hover:bg-green-50 transition-colors"
                >
                  Shop Now
                </Link>
                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center px-8 py-3 bg-transparent border-2 border-white text-white rounded-full font-semibold hover:bg-white hover:text-[#00B207] transition-colors"
                >
                  Contact Us
                </Link>
              </div>
            </motion.div>
          </div>
        </section>
      </div>
    </MainLayout>
  )
}
