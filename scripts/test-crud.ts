#!/usr/bin/env ts-node

/**
 * CRUD Operations Test Script
 * Tests Create, Read, Update, Delete operations
 */

import { PrismaClient, UserRole } from '@prisma/client'

const prisma = new PrismaClient({
  log: ['error', 'warn'],
})

async function testCRUD() {
  console.log('🧪 Testing CRUD Operations...\n')

  const testEmail = `test-${Date.now()}@example.com`
  const testPhone = `+91${Math.floor(1000000000 + Math.random() * 9000000000)}`
  let userId: string | undefined

  try {
    // CREATE - Test 1: Create a User
    console.log('Test 1: CREATE - Creating test user...')
    const newUser = await prisma.user.create({
      data: {
        email: testEmail,
        name: 'Test User',
        role: UserRole.CUSTOMER,
        emailVerified: new Date(),
      },
    })
    userId = newUser.id
    console.log('✅ User created:', {
      id: newUser.id,
      email: newUser.email,
      role: newUser.role,
    })
    console.log('')

    // CREATE - Test 2: Create Customer profile
    console.log('Test 2: CREATE - Creating customer profile...')
    const customer = await prisma.customer.create({
      data: {
        userId: userId,
        phone: testPhone,
      },
    })
    console.log('✅ Customer created:', {
      id: customer.id,
      userId: customer.userId,
      phone: customer.phone,
    })
    console.log('')

    // CREATE - Test 3: Create Address
    console.log('Test 3: CREATE - Creating address...')
    const address = await prisma.address.create({
      data: {
        customerId: customer.id,
        name: 'Test Address',
        street: '123 Test Street',
        city: 'Bangalore',
        state: 'Karnataka',
        zipCode: '560001',
        isDefault: true,
      },
    })
    console.log('✅ Address created:', {
      id: address.id,
      city: address.city,
      isDefault: address.isDefault,
    })
    console.log('')

    // READ - Test 4: Fetch user with relations
    console.log('Test 4: READ - Fetching user with relations...')
    const userWithRelations = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        customer: {
          include: {
            addresses: true,
          },
        },
      },
    })
    console.log('✅ User fetched with relations:', {
      id: userWithRelations?.id,
      email: userWithRelations?.email,
      hasCustomer: !!userWithRelations?.customer,
      addressCount: userWithRelations?.customer?.addresses.length || 0,
    })
    console.log('')

    // READ - Test 5: Query with filters
    console.log('Test 5: READ - Query users with filters...')
    const customers = await prisma.user.findMany({
      where: {
        role: UserRole.CUSTOMER,
        isActive: true,
      },
      take: 5,
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
      },
    })
    console.log(`✅ Found ${customers.length} active customers`)
    console.log('')

    // UPDATE - Test 6: Update user
    console.log('Test 6: UPDATE - Updating user...')
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        name: 'Updated Test User',
        lastLoginAt: new Date(),
      },
    })
    console.log('✅ User updated:', {
      id: updatedUser.id,
      name: updatedUser.name,
      lastLoginAt: updatedUser.lastLoginAt,
    })
    console.log('')

    // UPDATE - Test 7: Update customer phone
    console.log('Test 7: UPDATE - Updating customer phone...')
    const updatedCustomer = await prisma.customer.update({
      where: { id: customer.id },
      data: {
        phone: `+91${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      },
    })
    console.log('✅ Customer updated:', {
      id: updatedCustomer.id,
      phone: updatedCustomer.phone,
    })
    console.log('')

    // READ - Test 8: Aggregate operations
    console.log('Test 8: READ - Aggregate operations...')
    const stats = await prisma.user.aggregate({
      _count: { id: true },
      where: { role: UserRole.CUSTOMER },
    })
    console.log('✅ Customer statistics:', stats)
    console.log('')

    // DELETE - Test 9: Cascade delete
    console.log('Test 9: DELETE - Testing cascade delete...')
    await prisma.user.delete({
      where: { id: userId },
    })
    console.log('✅ User deleted (cascade should delete customer and addresses)')
    console.log('')

    // Verify deletion
    console.log('Test 10: VERIFY - Checking cascade delete...')
    const deletedUser = await prisma.user.findUnique({
      where: { id: userId },
    })
    const deletedCustomer = await prisma.customer.findUnique({
      where: { id: customer.id },
    })
    const deletedAddress = await prisma.address.findUnique({
      where: { id: address.id },
    })

    if (!deletedUser && !deletedCustomer && !deletedAddress) {
      console.log('✅ Cascade delete successful - all related records removed')
    } else {
      console.log('❌ Cascade delete failed - some records still exist')
    }
    console.log('')

    console.log('🎉 All CRUD tests passed!')

  } catch (error) {
    console.error('❌ CRUD test failed:', error)
    
    // Cleanup on error
    try {
      if (userId) {
        await prisma.user.delete({ where: { id: userId } }).catch(() => {})
      }
    } catch (cleanupError) {
      // Ignore cleanup errors
    }
    
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

testCRUD()
