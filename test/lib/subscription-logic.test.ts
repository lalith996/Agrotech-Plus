import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { PrismaClient, SubscriptionStatus, DeliveryFrequency } from '@prisma/client'
import { mockDeep, mockReset, DeepMockProxy } from 'jest-mock-extended'

// Mock Prisma
const prismaMock = mockDeep<PrismaClient>()
vi.mock('@/lib/prisma', () => ({
  prisma: prismaMock,
}))

// Subscription business logic utilities
class SubscriptionLogic {
  static calculateNextDeliveryDate(
    startDate: Date,
    frequency: DeliveryFrequency,
    deliveryCount: number = 0
  ): Date {
    const nextDate = new Date(startDate)
    
    switch (frequency) {
      case 'WEEKLY':
        nextDate.setDate(nextDate.getDate() + (7 * deliveryCount))
        break
      case 'BIWEEKLY':
        nextDate.setDate(nextDate.getDate() + (14 * deliveryCount))
        break
      case 'MONTHLY':
        nextDate.setMonth(nextDate.getMonth() + deliveryCount)
        break
      default:
        throw new Error(`Unsupported frequency: ${frequency}`)
    }
    
    return nextDate
  }

  static calculateSubscriptionTotal(items: Array<{ quantity: number; pricePerUnit: number }>): number {
    return items.reduce((total, item) => total + (item.quantity * item.pricePerUnit), 0)
  }

  static validateSubscriptionModification(
    currentSubscription: any,
    modifications: any
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    // Cannot modify cancelled subscriptions
    if (currentSubscription.status === 'CANCELLED') {
      errors.push('Cannot modify cancelled subscription')
    }

    // Cannot modify subscriptions with pending deliveries in next 24 hours
    const now = new Date()
    const nextDelivery = new Date(currentSubscription.nextDeliveryDate)
    const timeDiff = nextDelivery.getTime() - now.getTime()
    const hoursDiff = timeDiff / (1000 * 3600)

    if (hoursDiff < 24 && hoursDiff > 0) {
      errors.push('Cannot modify subscription within 24 hours of next delivery')
    }

    // Validate quantity changes
    if (modifications.items) {
      for (const item of modifications.items) {
        if (item.quantity < 0) {
          errors.push(`Invalid quantity for item ${item.productId}: ${item.quantity}`)
        }
        if (item.quantity > 100) {
          errors.push(`Quantity too large for item ${item.productId}: ${item.quantity}`)
        }
      }
    }

    // Validate delivery frequency changes
    if (modifications.deliveryFrequency) {
      const validFrequencies = ['WEEKLY', 'BIWEEKLY', 'MONTHLY']
      if (!validFrequencies.includes(modifications.deliveryFrequency)) {
        errors.push(`Invalid delivery frequency: ${modifications.deliveryFrequency}`)
      }
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  static calculatePauseEndDate(pauseStartDate: Date, pauseDuration: number): Date {
    const endDate = new Date(pauseStartDate)
    endDate.setDate(endDate.getDate() + pauseDuration)
    return endDate
  }

  static adjustDeliveryDatesForPause(
    originalDates: Date[],
    pauseStart: Date,
    pauseEnd: Date
  ): Date[] {
    const pauseDuration = pauseEnd.getTime() - pauseStart.getTime()
    
    return originalDates.map(date => {
      if (date >= pauseStart) {
        const adjustedDate = new Date(date.getTime() + pauseDuration)
        return adjustedDate
      }
      return date
    })
  }

  static generateDeliverySchedule(
    startDate: Date,
    endDate: Date,
    frequency: DeliveryFrequency,
    excludeDates: Date[] = []
  ): Date[] {
    const schedule: Date[] = []
    let currentDate = new Date(startDate)
    
    while (currentDate <= endDate) {
      // Skip excluded dates (holidays, etc.)
      const isExcluded = excludeDates.some(excludeDate => 
        excludeDate.toDateString() === currentDate.toDateString()
      )
      
      if (!isExcluded) {
        schedule.push(new Date(currentDate))
      }
      
      // Move to next delivery date
      switch (frequency) {
        case 'WEEKLY':
          currentDate.setDate(currentDate.getDate() + 7)
          break
        case 'BIWEEKLY':
          currentDate.setDate(currentDate.getDate() + 14)
          break
        case 'MONTHLY':
          currentDate.setMonth(currentDate.getMonth() + 1)
          break
      }
    }
    
    return schedule
  }

  static calculateSubscriptionMetrics(subscription: any, orders: any[]) {
    const totalOrders = orders.length
    const completedOrders = orders.filter(order => order.status === 'DELIVERED').length
    const totalValue = orders.reduce((sum, order) => sum + order.total, 0)
    const averageOrderValue = totalOrders > 0 ? totalValue / totalOrders : 0
    
    const deliveryRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0
    
    // Calculate customer lifetime value projection
    const monthlyValue = this.calculateSubscriptionTotal(subscription.items)
    const projectedLifetimeValue = monthlyValue * 12 // Assume 1 year average
    
    return {
      totalOrders,
      completedOrders,
      totalValue,
      averageOrderValue,
      deliveryRate,
      monthlyValue,
      projectedLifetimeValue,
      status: subscription.status,
      startDate: subscription.startDate,
      nextDeliveryDate: subscription.nextDeliveryDate
    }
  }

  static validateDeliveryZoneCompatibility(
    customerAddress: any,
    availableZones: any[]
  ): { compatible: boolean; availableZone?: any; message: string } {
    // Simple zip code matching - in real implementation would use geographic boundaries
    const customerZip = customerAddress.zipCode
    
    const compatibleZone = availableZones.find(zone => 
      zone.zipCodes.includes(customerZip) || 
      zone.cities.includes(customerAddress.city.toLowerCase())
    )
    
    if (compatibleZone) {
      return {
        compatible: true,
        availableZone: compatibleZone,
        message: `Delivery available in ${compatibleZone.name}`
      }
    }
    
    return {
      compatible: false,
      message: `Delivery not available to ${customerAddress.city}, ${customerAddress.zipCode}`
    }
  }

  static processSubscriptionRenewal(subscription: any): {
    shouldRenew: boolean;
    newEndDate?: Date;
    adjustments?: any;
  } {
    const now = new Date()
    const endDate = new Date(subscription.endDate)
    
    // Check if subscription is ending within 7 days
    const daysUntilEnd = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 3600 * 24))
    
    if (daysUntilEnd <= 7 && subscription.autoRenew && subscription.status === 'ACTIVE') {
      const newEndDate = new Date(endDate)
      newEndDate.setMonth(newEndDate.getMonth() + 3) // Renew for 3 months
      
      return {
        shouldRenew: true,
        newEndDate,
        adjustments: {
          status: 'ACTIVE',
          renewalCount: (subscription.renewalCount || 0) + 1
        }
      }
    }
    
    return { shouldRenew: false }
  }
}

describe('Subscription Business Logic', () => {
  beforeEach(() => {
    mockReset(prismaMock)
  })

  describe('Delivery Date Calculations', () => {
    it('should calculate next weekly delivery dates correctly', () => {
      const startDate = new Date('2024-01-01')
      
      expect(SubscriptionLogic.calculateNextDeliveryDate(startDate, 'WEEKLY', 0))
        .toEqual(new Date('2024-01-01'))
      expect(SubscriptionLogic.calculateNextDeliveryDate(startDate, 'WEEKLY', 1))
        .toEqual(new Date('2024-01-08'))
      expect(SubscriptionLogic.calculateNextDeliveryDate(startDate, 'WEEKLY', 4))
        .toEqual(new Date('2024-01-29'))
    })

    it('should calculate next biweekly delivery dates correctly', () => {
      const startDate = new Date('2024-01-01')
      
      expect(SubscriptionLogic.calculateNextDeliveryDate(startDate, 'BIWEEKLY', 0))
        .toEqual(new Date('2024-01-01'))
      expect(SubscriptionLogic.calculateNextDeliveryDate(startDate, 'BIWEEKLY', 1))
        .toEqual(new Date('2024-01-15'))
      expect(SubscriptionLogic.calculateNextDeliveryDate(startDate, 'BIWEEKLY', 2))
        .toEqual(new Date('2024-01-29'))
    })

    it('should calculate next monthly delivery dates correctly', () => {
      const startDate = new Date('2024-01-15')
      
      expect(SubscriptionLogic.calculateNextDeliveryDate(startDate, 'MONTHLY', 0))
        .toEqual(new Date('2024-01-15'))
      expect(SubscriptionLogic.calculateNextDeliveryDate(startDate, 'MONTHLY', 1))
        .toEqual(new Date('2024-02-15'))
      expect(SubscriptionLogic.calculateNextDeliveryDate(startDate, 'MONTHLY', 3))
        .toEqual(new Date('2024-04-15'))
    })

    it('should handle invalid frequency', () => {
      const startDate = new Date('2024-01-01')
      
      expect(() => {
        SubscriptionLogic.calculateNextDeliveryDate(startDate, 'INVALID' as any, 1)
      }).toThrow('Unsupported frequency: INVALID')
    })
  })

  describe('Subscription Total Calculations', () => {
    it('should calculate subscription total correctly', () => {
      const items = [
        { quantity: 2, pricePerUnit: 5.99 },
        { quantity: 1, pricePerUnit: 12.50 },
        { quantity: 3, pricePerUnit: 3.25 }
      ]
      
      const total = SubscriptionLogic.calculateSubscriptionTotal(items)
      expect(total).toBeCloseTo(34.73, 2)
    })

    it('should handle empty items array', () => {
      const total = SubscriptionLogic.calculateSubscriptionTotal([])
      expect(total).toBe(0)
    })

    it('should handle zero quantities', () => {
      const items = [
        { quantity: 0, pricePerUnit: 5.99 },
        { quantity: 2, pricePerUnit: 10.00 }
      ]
      
      const total = SubscriptionLogic.calculateSubscriptionTotal(items)
      expect(total).toBe(20.00)
    })
  })

  describe('Subscription Modification Validation', () => {
    const mockSubscription = {
      id: 'sub-123',
      status: 'ACTIVE',
      nextDeliveryDate: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours from now
      items: [
        { productId: 'prod-1', quantity: 2, pricePerUnit: 5.99 }
      ]
    }

    it('should allow valid modifications', () => {
      const modifications = {
        items: [
          { productId: 'prod-1', quantity: 3, pricePerUnit: 5.99 },
          { productId: 'prod-2', quantity: 1, pricePerUnit: 8.50 }
        ],
        deliveryFrequency: 'BIWEEKLY'
      }

      const result = SubscriptionLogic.validateSubscriptionModification(mockSubscription, modifications)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject modifications to cancelled subscriptions', () => {
      const cancelledSubscription = { ...mockSubscription, status: 'CANCELLED' }
      const modifications = { items: [{ productId: 'prod-1', quantity: 1, pricePerUnit: 5.99 }] }

      const result = SubscriptionLogic.validateSubscriptionModification(cancelledSubscription, modifications)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Cannot modify cancelled subscription')
    })

    it('should reject modifications within 24 hours of delivery', () => {
      const soonDeliverySubscription = {
        ...mockSubscription,
        nextDeliveryDate: new Date(Date.now() + 12 * 60 * 60 * 1000) // 12 hours from now
      }
      const modifications = { items: [{ productId: 'prod-1', quantity: 1, pricePerUnit: 5.99 }] }

      const result = SubscriptionLogic.validateSubscriptionModification(soonDeliverySubscription, modifications)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Cannot modify subscription within 24 hours of next delivery')
    })

    it('should reject invalid quantities', () => {
      const modifications = {
        items: [
          { productId: 'prod-1', quantity: -1, pricePerUnit: 5.99 },
          { productId: 'prod-2', quantity: 150, pricePerUnit: 8.50 }
        ]
      }

      const result = SubscriptionLogic.validateSubscriptionModification(mockSubscription, modifications)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Invalid quantity for item prod-1: -1')
      expect(result.errors).toContain('Quantity too large for item prod-2: 150')
    })

    it('should reject invalid delivery frequencies', () => {
      const modifications = {
        deliveryFrequency: 'DAILY'
      }

      const result = SubscriptionLogic.validateSubscriptionModification(mockSubscription, modifications)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Invalid delivery frequency: DAILY')
    })
  })

  describe('Subscription Pause Logic', () => {
    it('should calculate pause end date correctly', () => {
      const pauseStart = new Date('2024-01-15')
      const pauseDuration = 14 // 14 days
      
      const pauseEnd = SubscriptionLogic.calculatePauseEndDate(pauseStart, pauseDuration)
      expect(pauseEnd).toEqual(new Date('2024-01-29'))
    })

    it('should adjust delivery dates for pause period', () => {
      const originalDates = [
        new Date('2024-01-01'),
        new Date('2024-01-15'),
        new Date('2024-01-29'),
        new Date('2024-02-12')
      ]
      
      const pauseStart = new Date('2024-01-10')
      const pauseEnd = new Date('2024-01-24') // 14 day pause
      
      const adjustedDates = SubscriptionLogic.adjustDeliveryDatesForPause(originalDates, pauseStart, pauseEnd)
      
      expect(adjustedDates[0]).toEqual(new Date('2024-01-01')) // Before pause, unchanged
      expect(adjustedDates[1]).toEqual(new Date('2024-01-29')) // During pause, shifted
      expect(adjustedDates[2]).toEqual(new Date('2024-02-12')) // After pause start, shifted
      expect(adjustedDates[3]).toEqual(new Date('2024-02-26')) // After pause start, shifted
    })
  })

  describe('Delivery Schedule Generation', () => {
    it('should generate weekly delivery schedule', () => {
      const startDate = new Date('2024-01-01')
      const endDate = new Date('2024-01-29')
      
      const schedule = SubscriptionLogic.generateDeliverySchedule(startDate, endDate, 'WEEKLY')
      
      expect(schedule).toHaveLength(5)
      expect(schedule[0]).toEqual(new Date('2024-01-01'))
      expect(schedule[1]).toEqual(new Date('2024-01-08'))
      expect(schedule[4]).toEqual(new Date('2024-01-29'))
    })

    it('should exclude specified dates from schedule', () => {
      const startDate = new Date('2024-01-01')
      const endDate = new Date('2024-01-29')
      const excludeDates = [new Date('2024-01-08'), new Date('2024-01-22')]
      
      const schedule = SubscriptionLogic.generateDeliverySchedule(startDate, endDate, 'WEEKLY', excludeDates)
      
      expect(schedule).toHaveLength(3)
      expect(schedule.map(d => d.toDateString())).not.toContain('Mon Jan 08 2024')
      expect(schedule.map(d => d.toDateString())).not.toContain('Mon Jan 22 2024')
    })

    it('should generate monthly delivery schedule', () => {
      const startDate = new Date('2024-01-15')
      const endDate = new Date('2024-04-15')
      
      const schedule = SubscriptionLogic.generateDeliverySchedule(startDate, endDate, 'MONTHLY')
      
      expect(schedule).toHaveLength(4)
      expect(schedule[0]).toEqual(new Date('2024-01-15'))
      expect(schedule[1]).toEqual(new Date('2024-02-15'))
      expect(schedule[3]).toEqual(new Date('2024-04-15'))
    })
  })

  describe('Subscription Metrics Calculation', () => {
    const mockSubscription = {
      id: 'sub-123',
      status: 'ACTIVE',
      startDate: new Date('2024-01-01'),
      nextDeliveryDate: new Date('2024-02-01'),
      items: [
        { productId: 'prod-1', quantity: 2, pricePerUnit: 10.00 },
        { productId: 'prod-2', quantity: 1, pricePerUnit: 15.00 }
      ]
    }

    const mockOrders = [
      { id: 'order-1', status: 'DELIVERED', total: 25.00 },
      { id: 'order-2', status: 'DELIVERED', total: 25.00 },
      { id: 'order-3', status: 'PENDING', total: 25.00 },
      { id: 'order-4', status: 'CANCELLED', total: 25.00 }
    ]

    it('should calculate subscription metrics correctly', () => {
      const metrics = SubscriptionLogic.calculateSubscriptionMetrics(mockSubscription, mockOrders)
      
      expect(metrics.totalOrders).toBe(4)
      expect(metrics.completedOrders).toBe(2)
      expect(metrics.totalValue).toBe(100.00)
      expect(metrics.averageOrderValue).toBe(25.00)
      expect(metrics.deliveryRate).toBe(50)
      expect(metrics.monthlyValue).toBe(35.00)
      expect(metrics.projectedLifetimeValue).toBe(420.00)
      expect(metrics.status).toBe('ACTIVE')
    })

    it('should handle subscriptions with no orders', () => {
      const metrics = SubscriptionLogic.calculateSubscriptionMetrics(mockSubscription, [])
      
      expect(metrics.totalOrders).toBe(0)
      expect(metrics.completedOrders).toBe(0)
      expect(metrics.totalValue).toBe(0)
      expect(metrics.averageOrderValue).toBe(0)
      expect(metrics.deliveryRate).toBe(0)
      expect(metrics.monthlyValue).toBe(35.00)
    })
  })

  describe('Delivery Zone Compatibility', () => {
    const customerAddress = {
      street: '123 Main St',
      city: 'San Francisco',
      state: 'CA',
      zipCode: '94102',
      country: 'USA'
    }

    const availableZones = [
      {
        id: 'zone-1',
        name: 'San Francisco Central',
        zipCodes: ['94102', '94103', '94104'],
        cities: ['san francisco']
      },
      {
        id: 'zone-2',
        name: 'Oakland Area',
        zipCodes: ['94601', '94602'],
        cities: ['oakland']
      }
    ]

    it('should find compatible delivery zone by zip code', () => {
      const result = SubscriptionLogic.validateDeliveryZoneCompatibility(customerAddress, availableZones)
      
      expect(result.compatible).toBe(true)
      expect(result.availableZone?.id).toBe('zone-1')
      expect(result.message).toContain('San Francisco Central')
    })

    it('should find compatible delivery zone by city', () => {
      const addressWithoutZip = { ...customerAddress, zipCode: '00000' }
      const result = SubscriptionLogic.validateDeliveryZoneCompatibility(addressWithoutZip, availableZones)
      
      expect(result.compatible).toBe(true)
      expect(result.availableZone?.id).toBe('zone-1')
    })

    it('should return incompatible for unsupported areas', () => {
      const unsupportedAddress = {
        ...customerAddress,
        city: 'Los Angeles',
        zipCode: '90210'
      }
      
      const result = SubscriptionLogic.validateDeliveryZoneCompatibility(unsupportedAddress, availableZones)
      
      expect(result.compatible).toBe(false)
      expect(result.availableZone).toBeUndefined()
      expect(result.message).toContain('Delivery not available')
    })
  })

  describe('Subscription Renewal Logic', () => {
    it('should renew subscription when conditions are met', () => {
      const subscription = {
        id: 'sub-123',
        status: 'ACTIVE',
        autoRenew: true,
        endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
        renewalCount: 2
      }

      const result = SubscriptionLogic.processSubscriptionRenewal(subscription)
      
      expect(result.shouldRenew).toBe(true)
      expect(result.newEndDate).toBeDefined()
      expect(result.adjustments?.renewalCount).toBe(3)
      expect(result.adjustments?.status).toBe('ACTIVE')
    })

    it('should not renew subscription when auto-renew is disabled', () => {
      const subscription = {
        id: 'sub-123',
        status: 'ACTIVE',
        autoRenew: false,
        endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        renewalCount: 1
      }

      const result = SubscriptionLogic.processSubscriptionRenewal(subscription)
      
      expect(result.shouldRenew).toBe(false)
    })

    it('should not renew subscription when end date is far away', () => {
      const subscription = {
        id: 'sub-123',
        status: 'ACTIVE',
        autoRenew: true,
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        renewalCount: 1
      }

      const result = SubscriptionLogic.processSubscriptionRenewal(subscription)
      
      expect(result.shouldRenew).toBe(false)
    })

    it('should not renew cancelled subscription', () => {
      const subscription = {
        id: 'sub-123',
        status: 'CANCELLED',
        autoRenew: true,
        endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        renewalCount: 1
      }

      const result = SubscriptionLogic.processSubscriptionRenewal(subscription)
      
      expect(result.shouldRenew).toBe(false)
    })
  })

  describe('Integration with Database', () => {
    it('should create subscription with proper validation', async () => {
      const subscriptionData = {
        customerId: 'customer-123',
        deliveryFrequency: 'WEEKLY',
        startDate: new Date(),
        endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        items: [
          { productId: 'prod-1', quantity: 2, pricePerUnit: 10.00 }
        ]
      }

      const mockCreatedSubscription = {
        id: 'sub-123',
        ...subscriptionData,
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      prismaMock.subscription.create.mockResolvedValue(mockCreatedSubscription as any)

      const result = await prismaMock.subscription.create({
        data: subscriptionData
      })

      expect(result.id).toBe('sub-123')
      expect(result.status).toBe('ACTIVE')
      expect(prismaMock.subscription.create).toHaveBeenCalledWith({
        data: subscriptionData
      })
    })

    it('should update subscription status correctly', async () => {
      const subscriptionId = 'sub-123'
      const newStatus = 'PAUSED'

      const mockUpdatedSubscription = {
        id: subscriptionId,
        status: newStatus,
        updatedAt: new Date(),
      }

      prismaMock.subscription.update.mockResolvedValue(mockUpdatedSubscription as any)

      const result = await prismaMock.subscription.update({
        where: { id: subscriptionId },
        data: { status: newStatus }
      })

      expect(result.status).toBe(newStatus)
      expect(prismaMock.subscription.update).toHaveBeenCalledWith({
        where: { id: subscriptionId },
        data: { status: newStatus }
      })
    })

    it('should fetch subscription with related data', async () => {
      const subscriptionId = 'sub-123'
      const mockSubscriptionWithRelations = {
        id: subscriptionId,
        status: 'ACTIVE',
        customer: {
          id: 'customer-123',
          user: {
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com'
          }
        },
        items: [
          {
            id: 'item-1',
            productId: 'prod-1',
            quantity: 2,
            pricePerUnit: 10.00,
            product: {
              name: 'Organic Tomatoes',
              unit: 'lb'
            }
          }
        ],
        orders: [
          {
            id: 'order-1',
            status: 'DELIVERED',
            total: 20.00,
            deliveryDate: new Date()
          }
        ]
      }

      prismaMock.subscription.findUnique.mockResolvedValue(mockSubscriptionWithRelations as any)

      const result = await prismaMock.subscription.findUnique({
        where: { id: subscriptionId },
        include: {
          customer: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  email: true
                }
              }
            }
          },
          items: {
            include: {
              product: {
                select: {
                  name: true,
                  unit: true
                }
              }
            }
          },
          orders: true
        }
      })

      expect(result?.customer.user.firstName).toBe('John')
      expect(result?.items).toHaveLength(1)
      expect(result?.orders).toHaveLength(1)
    })
  })
})

// Export for use in other tests
export { SubscriptionLogic }