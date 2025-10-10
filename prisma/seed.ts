import { PrismaClient, UserRole, SubscriptionStatus, OrderStatus } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // console.log('🌱 Starting seed...')

  // Create admin user
  const adminUser = await prisma.user.create({
    data: {
      name: 'Admin User',
      email: 'admin@agrotrack.com',
      role: UserRole.ADMIN,
    },
  })

  // Create operations user
  const opsUser = await prisma.user.create({
    data: {
      name: 'Operations Manager',
      email: 'ops@agrotrack.com',
      role: UserRole.OPERATIONS,
    },
  })

  // Create sample farmers
  const farmer1User = await prisma.user.create({
    data: {
      name: 'Green Valley Farm',
      email: 'farmer1@agrotrack.com',
      role: UserRole.FARMER,
    },
  })

  const farmer1 = await prisma.farmer.create({
    data: {
      userId: farmer1User.id,
      farmName: 'Green Valley Organic Farm',
      location: 'Bangalore Rural, Karnataka',
      description: 'Certified organic farm specializing in leafy greens and seasonal vegetables.',
      phone: '+91-9876543210',
      isApproved: true,
    },
  })

  const farmer2User = await prisma.user.create({
    data: {
      name: 'Sunrise Farms',
      email: 'farmer2@agrotrack.com',
      role: UserRole.FARMER,
    },
  })

  const farmer2 = await prisma.farmer.create({
    data: {
      userId: farmer2User.id,
      farmName: 'Sunrise Organic Farms',
      location: 'Mysore, Karnataka',
      description: 'Family-owned farm growing traditional vegetables and herbs using sustainable practices.',
      phone: '+91-9876543211',
      isApproved: true,
    },
  })

  // Create certifications for farmers
  await prisma.certification.createMany({
    data: [
      {
        farmerId: farmer1.id,
        name: 'Organic Certification',
        issuedBy: 'India Organic Certification Agency',
        issuedDate: new Date('2023-01-15'),
        expiryDate: new Date('2026-01-15'),
      },
      {
        farmerId: farmer2.id,
        name: 'Organic Certification',
        issuedBy: 'APEDA Organic',
        issuedDate: new Date('2023-03-20'),
        expiryDate: new Date('2026-03-20'),
      },
    ],
  })

  // Create sample products
  const products = await prisma.product.createMany({
    data: [
      {
        name: 'Fresh Spinach',
        category: 'Leafy Greens',
        description: 'Organic spinach grown without pesticides, rich in iron and vitamins.',
        basePrice: 40.0,
        unit: 'bunch',
        farmerId: farmer1.id,
        images: ['/images/products/spinach.jpg'],
      },
      {
        name: 'Organic Tomatoes',
        category: 'Vegetables',
        description: 'Vine-ripened organic tomatoes, perfect for cooking and salads.',
        basePrice: 60.0,
        unit: 'kg',
        farmerId: farmer1.id,
        images: ['/images/products/tomatoes.jpg'],
      },
      {
        name: 'Fresh Coriander',
        category: 'Herbs',
        description: 'Aromatic fresh coriander leaves, essential for Indian cooking.',
        basePrice: 20.0,
        unit: 'bunch',
        farmerId: farmer2.id,
        images: ['/images/products/coriander.jpg'],
      },
      {
        name: 'Organic Carrots',
        category: 'Vegetables',
        description: 'Sweet and crunchy organic carrots, rich in beta-carotene.',
        basePrice: 50.0,
        unit: 'kg',
        farmerId: farmer2.id,
        images: ['/images/products/carrots.jpg'],
      },
      {
        name: 'Mixed Salad Greens',
        category: 'Leafy Greens',
        description: 'Fresh mix of lettuce, arugula, and baby spinach.',
        basePrice: 80.0,
        unit: 'pack',
        farmerId: farmer1.id,
        images: ['/images/products/salad-mix.jpg'],
      },
    ],
  })

  // Create sample customers
  const customer1User = await prisma.user.create({
    data: {
      name: 'Priya Sharma',
      email: 'priya@example.com',
      role: UserRole.CUSTOMER,
    },
  })

  const customer1 = await prisma.customer.create({
    data: {
      userId: customer1User.id,
      phone: '+91-9876543212',
    },
  })

  const customer2User = await prisma.user.create({
    data: {
      name: 'Rajesh Kumar',
      email: 'rajesh@example.com',
      role: UserRole.CUSTOMER,
    },
  })

  const customer2 = await prisma.customer.create({
    data: {
      userId: customer2User.id,
      phone: '+91-9876543213',
    },
  })

  // Create addresses for customers
  await prisma.address.createMany({
    data: [
      {
        customerId: customer1.id,
        name: 'Home',
        street: '123 MG Road',
        city: 'Bangalore',
        state: 'Karnataka',
        zipCode: '560001',
        isDefault: true,
      },
      {
        customerId: customer2.id,
        name: 'Home',
        street: '456 Brigade Road',
        city: 'Bangalore',
        state: 'Karnataka',
        zipCode: '560025',
        isDefault: true,
      },
    ],
  })

  // Get created products for subscriptions
  const createdProducts = await prisma.product.findMany()

  // Create sample subscriptions
  const subscription1 = await prisma.subscription.create({
    data: {
      customerId: customer1.id,
      deliveryZone: 'Central Bangalore',
      deliveryDay: 'Tuesday',
      status: SubscriptionStatus.ACTIVE,
      startDate: new Date('2024-01-01'),
    },
  })

  const subscription2 = await prisma.subscription.create({
    data: {
      customerId: customer2.id,
      deliveryZone: 'East Bangalore',
      deliveryDay: 'Thursday',
      status: SubscriptionStatus.ACTIVE,
      startDate: new Date('2024-01-15'),
    },
  })

  // Create subscription items
  await prisma.subscriptionItem.createMany({
    data: [
      {
        subscriptionId: subscription1.id,
        productId: createdProducts[0].id, // Spinach
        quantity: 2,
        frequency: 'weekly',
      },
      {
        subscriptionId: subscription1.id,
        productId: createdProducts[1].id, // Tomatoes
        quantity: 1,
        frequency: 'weekly',
      },
      {
        subscriptionId: subscription2.id,
        productId: createdProducts[2].id, // Coriander
        quantity: 1,
        frequency: 'weekly',
      },
      {
        subscriptionId: subscription2.id,
        productId: createdProducts[3].id, // Carrots
        quantity: 1,
        frequency: 'weekly',
      },
    ],
  })

  // Create sample orders
  const customer1Address = await prisma.address.findFirst({
    where: { customerId: customer1.id },
  })

  const customer2Address = await prisma.address.findFirst({
    where: { customerId: customer2.id },
  })

  if (customer1Address && customer2Address) {
    const order1 = await prisma.order.create({
      data: {
        customerId: customer1.id,
        subscriptionId: subscription1.id,
        addressId: customer1Address.id,
        deliverySlot: '9:00 AM - 12:00 PM',
        status: OrderStatus.DELIVERED,
        totalAmount: 140.0,
        deliveryDate: new Date('2024-01-02'),
      },
    })

    const order2 = await prisma.order.create({
      data: {
        customerId: customer2.id,
        subscriptionId: subscription2.id,
        addressId: customer2Address.id,
        deliverySlot: '2:00 PM - 5:00 PM',
        status: OrderStatus.CONFIRMED,
        totalAmount: 70.0,
        deliveryDate: new Date('2024-01-18'),
      },
    })

    // Create order items
    await prisma.orderItem.createMany({
      data: [
        {
          orderId: order1.id,
          productId: createdProducts[0].id,
          quantity: 2,
          price: 40.0,
        },
        {
          orderId: order1.id,
          productId: createdProducts[1].id,
          quantity: 1,
          price: 60.0,
        },
        {
          orderId: order2.id,
          productId: createdProducts[2].id,
          quantity: 1,
          price: 20.0,
        },
        {
          orderId: order2.id,
          productId: createdProducts[3].id,
          quantity: 1,
          price: 50.0,
        },
      ],
    })
  }

  // console.log('✅ Seed completed successfully!')
  // console.log('📧 Admin: admin@agrotrack.com')
  // console.log('📧 Operations: ops@agrotrack.com')
  // console.log('📧 Farmer 1: farmer1@agrotrack.com')
  // console.log('📧 Farmer 2: farmer2@agrotrack.com')
  // console.log('📧 Customer 1: priya@example.com')
  // console.log('📧 Customer 2: rajesh@example.com')
}

main()
  .catch((e) => {
    // console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })