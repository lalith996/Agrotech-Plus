import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { UserRole } from '@prisma/client'
import { z } from 'zod'

const qcSubmissionSchema = z.object({
    farmerDeliveryId: z.string(),
    productId: z.string(),
    acceptedQuantity: z.number().min(0),
    rejectedQuantity: z.number().min(0),
    rejectionReasons: z.array(z.string()),
    photos: z.array(z.string()),
    notes: z.string().optional()
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' })
    }

    try {
        const session = await getServerSession(req, res, authOptions)

        if (!session?.user) {
            return res.status(401).json({ message: 'Unauthorized' })
        }

        // Check if user has permission to submit QC results
        if (session.user.role !== UserRole.ADMIN && session.user.role !== UserRole.OPERATIONS) {
            return res.status(403).json({ message: 'Insufficient permissions' })
        }

        // Validate request body
        const validationResult = qcSubmissionSchema.safeParse(req.body)
        if (!validationResult.success) {
            return res.status(400).json({
                success: false,
                message: 'Invalid request data',
                errors: validationResult.error.errors
            })
        }

        const {
            farmerDeliveryId,
            productId,
            acceptedQuantity,
            rejectedQuantity,
            rejectionReasons,
            photos,
            notes
        } = validationResult.data

        // For now, we'll create a simplified QC result without complex relations
        // This would be expanded when the full schema is implemented
        const mockDelivery = {
            id: farmerDeliveryId,
            expectedQuantity: 100, // Mock value
            status: 'DELIVERED'
        }

        // Validate quantities
        const totalQuantity = acceptedQuantity + rejectedQuantity
        if (totalQuantity !== mockDelivery.expectedQuantity) {
            return res.status(400).json({
                success: false,
                message: `Total quantity (${totalQuantity}) must equal expected quantity (${mockDelivery.expectedQuantity})`
            })
        }

        // Calculate acceptance rate for farmer insights
        const acceptanceRate = totalQuantity > 0 ? (acceptedQuantity / totalQuantity) * 100 : 0

        // Mock QC result creation - would use actual Prisma operations when schema is ready
        const qcResult = {
            id: `qc-${Date.now()}`,
            farmerDeliveryId,
            productId,
            acceptedQuantity,
            rejectedQuantity,
            rejectionReasons,
            photos,
            notes: notes || '',
            inspectedBy: session.user.id,
            inspectedAt: new Date(),
            acceptanceRate: acceptanceRate.toFixed(1)
        }

        // Log for development purposes
        // console.log('QC Result created:', qcResult)

        // Send notification to farmer if there are quality issues
        if (rejectionReasons.length > 0 || acceptanceRate < 90) {
            // console.log(`QC Alert: Low acceptance rate: ${acceptanceRate.toFixed(1)}%`)
        }

        return res.status(200).json({
            success: true,
            message: 'QC result submitted successfully',
            qcResult: {
                id: qcResult.id,
                acceptedQuantity,
                rejectedQuantity,
                acceptanceRate: acceptanceRate.toFixed(1),
                rejectionReasons,
                photos: photos.length,
                notes
            }
        })

    } catch (error) {
        // console.error('Error submitting QC result:', error)
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        })
    }
}