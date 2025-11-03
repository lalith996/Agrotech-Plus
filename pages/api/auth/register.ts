import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { name, email, password, role } = req.body

    // Validate input
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    // Check if user exists
    const existingUser = await prisma.users.findUnique({
      where: { email }
    })

    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user
    const user = await prisma.users.create({
      data: {
        id: `user_${Date.now()}`,
        email,
        name,
        role: role || 'CUSTOMER',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    })

    // Create role-specific profile
    if (role === 'FARMER') {
      await prisma.farmers.create({
        data: {
          id: `farmer_${Date.now()}`,
          userId: user.id,
          farmName: `${name}'s Farm`,
          location: 'Not specified',
          isApproved: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      })
    } else if (role === 'CUSTOMER') {
      await prisma.customers.create({
        data: {
          id: `customer_${Date.now()}`,
          userId: user.id,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      })
    }

    return res.status(201).json({ 
      message: 'User created successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    })
  } catch (error) {
    console.error('Registration error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
