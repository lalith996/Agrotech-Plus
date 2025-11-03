import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { UserRole } from '@prisma/client'
import { z } from 'zod'
import fs from 'fs/promises'
import path from 'path'
import { withCSRF, adminCSRF } from '@/lib/csrf-middleware'
import { logInfo, logError } from '@/lib/logger'

// Settings validation schema
const settingsSchema = z.object({
  general: z.object({
    siteName: z.string().min(1).max(100),
    siteDescription: z.string().max(500),
    contactEmail: z.string().email(),
    supportPhone: z.string().max(20),
    timezone: z.string(),
    currency: z.string().length(3),
    language: z.string().length(2)
  }),
  business: z.object({
    defaultMarkup: z.number().min(0).max(100),
    minimumOrderValue: z.number().min(0),
    deliveryFee: z.number().min(0),
    freeDeliveryThreshold: z.number().min(0),
    taxRate: z.number().min(0).max(50),
    processingDays: z.number().min(0).max(30)
  }),
  notifications: z.object({
    emailEnabled: z.boolean(),
    smsEnabled: z.boolean(),
    pushEnabled: z.boolean(),
    orderConfirmation: z.boolean(),
    deliveryUpdates: z.boolean(),
    paymentAlerts: z.boolean(),
    lowInventoryAlerts: z.boolean(),
    farmerNotifications: z.boolean()
  }),
  delivery: z.object({
    maxDeliveryDistance: z.number().min(1).max(100),
    deliveryTimeSlots: z.array(z.string()),
    advanceBookingDays: z.number().min(1).max(30),
    sameDayDeliveryEnabled: z.boolean(),
    deliveryInstructions: z.string().max(500)
  }),
  security: z.object({
    sessionTimeout: z.number().min(5).max(480),
    passwordMinLength: z.number().min(6).max(50),
    requireTwoFactor: z.boolean(),
    allowedFileTypes: z.array(z.string()),
    maxFileSize: z.number().min(1).max(100),
    rateLimitRequests: z.number().min(10).max(1000),
    rateLimitWindow: z.number().min(1).max(60)
  }),
  integrations: z.object({
    paymentProvider: z.string(),
    emailProvider: z.string(),
    smsProvider: z.string(),
    storageProvider: z.string(),
    analyticsEnabled: z.boolean()
  })
})

const SETTINGS_FILE_PATH = path.join(process.cwd(), 'data', 'settings.json')

// Ensure data directory exists
async function ensureDataDirectory() {
  const dataDir = path.join(process.cwd(), 'data')
  try {
    await fs.access(dataDir)
  } catch {
    await fs.mkdir(dataDir, { recursive: true })
  }
}

// Load settings from file
async function loadSettings() {
  try {
    await ensureDataDirectory()
    const data = await fs.readFile(SETTINGS_FILE_PATH, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    // Return default settings if file doesn't exist
    return {
      general: {
        siteName: 'AgroTrack+',
        siteDescription: 'Fresh produce delivery platform connecting farmers and customers',
        contactEmail: 'support@agrotrack.com',
        supportPhone: '+1 (555) 123-4567',
        timezone: 'America/Los_Angeles',
        currency: 'USD',
        language: 'en'
      },
      business: {
        defaultMarkup: 15,
        minimumOrderValue: 25,
        deliveryFee: 5.99,
        freeDeliveryThreshold: 75,
        taxRate: 8.5,
        processingDays: 2
      },
      notifications: {
        emailEnabled: true,
        smsEnabled: true,
        pushEnabled: true,
        orderConfirmation: true,
        deliveryUpdates: true,
        paymentAlerts: true,
        lowInventoryAlerts: true,
        farmerNotifications: true
      },
      delivery: {
        maxDeliveryDistance: 25,
        deliveryTimeSlots: ['9:00 AM - 12:00 PM', '12:00 PM - 3:00 PM', '3:00 PM - 6:00 PM'],
        advanceBookingDays: 7,
        sameDayDeliveryEnabled: false,
        deliveryInstructions: 'Please leave packages at the front door if no one is home.'
      },
      security: {
        sessionTimeout: 30,
        passwordMinLength: 8,
        requireTwoFactor: false,
        allowedFileTypes: ['jpg', 'jpeg', 'png', 'pdf', 'csv'],
        maxFileSize: 10,
        rateLimitRequests: 100,
        rateLimitWindow: 15
      },
      integrations: {
        paymentProvider: 'stripe',
        emailProvider: 'sendgrid',
        smsProvider: 'twilio',
        storageProvider: 'aws-s3',
        analyticsEnabled: true
      }
    }
  }
}

// Save settings to file
async function saveSettings(settings: any) {
  await ensureDataDirectory()
  await fs.writeFile(SETTINGS_FILE_PATH, JSON.stringify(settings, null, 2))
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions)
    
    if (!session?.user) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    // Check if user has admin permissions
    if (session.user.role !== UserRole.ADMIN && session.user.role !== UserRole.OPERATIONS) {
      return res.status(403).json({ message: 'Insufficient permissions' })
    }

    if (req.method === 'GET') {
      // Get current settings
      const settings = await loadSettings()
      return res.status(200).json({
        success: true,
        settings
      })
    }

    if (req.method === 'POST') {
      // Update settings
      const validationResult = settingsSchema.safeParse(req.body)
      
      if (!validationResult.success) {
        return res.status(400).json({
          success: false,
          message: 'Invalid settings data',
          errors: validationResult.error.errors
        })
      }

      const settings = validationResult.data

      // Save settings
      await saveSettings(settings)

      // Log the settings change
      logInfo('Admin settings updated', {
        userId: session.user.id,
        email: session.user.email,
        timestamp: new Date().toISOString(),
      })

      return res.status(200).json({
        success: true,
        message: 'Settings updated successfully',
        settings
      })
    }

    if (req.method === 'PUT') {
      // Update specific setting section
      const { section, data } = req.body

      if (!section || !data) {
        return res.status(400).json({
          success: false,
          message: 'Section and data are required'
        })
      }

      const currentSettings = await loadSettings()
      
      // Validate the section exists
      if (!(section in currentSettings)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid settings section'
        })
      }

      // Update the specific section
      currentSettings[section] = { ...currentSettings[section], ...data }

      // Validate the updated settings
      const validationResult = settingsSchema.safeParse(currentSettings)
      
      if (!validationResult.success) {
        return res.status(400).json({
          success: false,
          message: 'Invalid settings data',
          errors: validationResult.error.errors
        })
      }

      // Save updated settings
      await saveSettings(currentSettings)

      return res.status(200).json({
        success: true,
        message: `${section} settings updated successfully`,
        settings: currentSettings
      })
    }

    if (req.method === 'DELETE') {
      // Reset settings to defaults
      const defaultSettings = {
        general: {
          siteName: 'AgroTrack+',
          siteDescription: 'Fresh produce delivery platform connecting farmers and customers',
          contactEmail: 'support@agrotrack.com',
          supportPhone: '+1 (555) 123-4567',
          timezone: 'America/Los_Angeles',
          currency: 'USD',
          language: 'en'
        },
        business: {
          defaultMarkup: 15,
          minimumOrderValue: 25,
          deliveryFee: 5.99,
          freeDeliveryThreshold: 75,
          taxRate: 8.5,
          processingDays: 2
        },
        notifications: {
          emailEnabled: true,
          smsEnabled: true,
          pushEnabled: true,
          orderConfirmation: true,
          deliveryUpdates: true,
          paymentAlerts: true,
          lowInventoryAlerts: true,
          farmerNotifications: true
        },
        delivery: {
          maxDeliveryDistance: 25,
          deliveryTimeSlots: ['9:00 AM - 12:00 PM', '12:00 PM - 3:00 PM', '3:00 PM - 6:00 PM'],
          advanceBookingDays: 7,
          sameDayDeliveryEnabled: false,
          deliveryInstructions: 'Please leave packages at the front door if no one is home.'
        },
        security: {
          sessionTimeout: 30,
          passwordMinLength: 8,
          requireTwoFactor: false,
          allowedFileTypes: ['jpg', 'jpeg', 'png', 'pdf', 'csv'],
          maxFileSize: 10,
          rateLimitRequests: 100,
          rateLimitWindow: 15
        },
        integrations: {
          paymentProvider: 'stripe',
          emailProvider: 'sendgrid',
          smsProvider: 'twilio',
          storageProvider: 'aws-s3',
          analyticsEnabled: true
        }
      }

      await saveSettings(defaultSettings)

      return res.status(200).json({
        success: true,
        message: 'Settings reset to defaults',
        settings: defaultSettings
      })
    }

    return res.status(405).json({ message: 'Method not allowed' })

  } catch (error) {
    logError('Error handling settings request', error instanceof Error ? error : new Error(String(error)), {
      userId: req.headers['user-id'],
      method: req.method,
    })
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    })
  }
}

// Export with CSRF protection for admin mutations
export default withCSRF(handler, adminCSRF)