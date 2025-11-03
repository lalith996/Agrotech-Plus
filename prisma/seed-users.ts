import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding demo users...')

  // Create Admin User
  const admin = await prisma.users.upsert({
    where: { email: 'admin@agrotrack.com' },
    update: {},
    create: {
      id: 'admin_1',
      email: 'admin@agrotrack.com',
      name: 'Admin User',
      role: 'ADMIN',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  })
  console.log('✓ Admin user created:', admin.email)

  // Create Farmer User
  const farmer = await prisma.users.upsert({
    where: { email: 'farmer@agrotrack.com' },
    update: {},
    create: {
      id: 'farmer_1',
      email: 'farmer@agrotrack.com',
      name: 'John Farmer',
      role: 'FARMER',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  })
  console.log('✓ Farmer user created:', farmer.email)

  // Create Farmer Profile
  await prisma.farmers.upsert({
    where: { userId: farmer.id },
    update: {},
    create: {
      id: 'farmer_profile_1',
      userId: farmer.id,
      farmName: "John's Organic Farm",
      location: 'Bangalore, Karnataka',
      description: 'Certified organic farm producing fresh vegetables',
      isApproved: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  })
  console.log('✓ Farmer profile created')

  // Create Customer User
  const customer = await prisma.users.upsert({
    where: { email: 'customer@agrotrack.com' },
    update: {},
    create: {
      id: 'customer_1',
      email: 'customer@agrotrack.com',
      name: 'Jane Customer',
      role: 'CUSTOMER',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  })
  console.log('✓ Customer user created:', customer.email)

  // Create Customer Profile
  await prisma.customers.upsert({
    where: { userId: customer.id },
    update: {},
    create: {
      id: 'customer_profile_1',
      userId: customer.id,
      phone: '+91 98765 43210',
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  })
  console.log('✓ Customer profile created')

  console.log('\n✅ Demo users seeded successfully!')
  console.log('\nYou can now sign in with:')
  console.log('- admin@agrotrack.com (Admin)')
  console.log('- farmer@agrotrack.com (Farmer)')
  console.log('- customer@agrotrack.com (Customer)')
  console.log('\nPassword: any password works (for demo)')
}

main()
  .catch((e) => {
    console.error('Error seeding users:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
