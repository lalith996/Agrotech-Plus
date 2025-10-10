import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db-optimization';
import { FileUploadService } from '@/lib/file-upload';
import multer from 'multer';
import { promisify } from 'util';

// Configure multer for memory storage
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 25 * 1024 * 1024, // 25MB max per file
        files: 20 // Max 20 files (photos + audio)
    }
});

const uploadMiddleware = promisify(upload.any());

export const config = {
    api: {
        bodyParser: false,
    },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const session = await getServerSession(req, res, authOptions);

        if (!session?.user?.id) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Parse multipart form data
        await uploadMiddleware(req as any, res as any);

        const files = (req as any).files as Express.Multer.File[];
        const inspectionDataStr = (req as any).body.inspectionData;

        if (!inspectionDataStr) {
            return res.status(400).json({ error: 'Missing inspection data' });
        }

        let inspectionData;
        try {
            inspectionData = JSON.parse(inspectionDataStr);
        } catch (error) {
            return res.status(400).json({ error: 'Invalid inspection data format' });
        }

        const {
            farmerDeliveryId,
            productId,
            farmerId,
            actualQuantity,
            acceptedQuantity,
            rejectedQuantity,
            rejectionReasons,
            qualityScore,
            notes,
            geolocation,
            signature,
            timestamp,
            deviceId
        } = inspectionData;

        // Validate required fields
        if (!farmerDeliveryId || !productId || !farmerId) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Process uploaded files
        const photoFiles = files.filter(f => f.fieldname.startsWith('photo_'));
        const audioFiles = files.filter(f => f.fieldname.startsWith('audio_'));

        // Upload photos to storage
        const photoUrls: string[] = [];
        for (const photoFile of photoFiles) {
            try {
                const uploadResult = await FileUploadService.uploadFile(
                    photoFile.buffer,
                    photoFile.originalname,
                    photoFile.mimetype,
                    {
                        category: 'qc_photo',
                        entityType: 'qc_result',
                        entityId: farmerDeliveryId,
                        userId: session.user.id
                    }
                );

                if (uploadResult.success && uploadResult.file) {
                    photoUrls.push(uploadResult.file.url);
                }
            } catch (error) {
                // console.error('Photo upload error:', error);
                // Continue with other photos even if one fails
            }
        }

        // Upload audio files to storage
        const audioUrls: string[] = [];
        for (const audioFile of audioFiles) {
            try {
                const uploadResult = await FileUploadService.uploadFile(
                    audioFile.buffer,
                    audioFile.originalname,
                    audioFile.mimetype,
                    {
                        category: 'audio_note',
                        entityType: 'qc_result',
                        entityId: farmerDeliveryId,
                        userId: session.user.id
                    }
                );

                if (uploadResult.success && uploadResult.file) {
                    audioUrls.push(uploadResult.file.url);
                }
            } catch (error) {
                // console.error('Audio upload error:', error);
                // Continue with other audio files even if one fails
            }
        }

        // Create QC offline entry record
        const qcOfflineEntry = await prisma.qCOfflineEntry.create({
            data: {
                deviceId,
                farmerDeliveryId,
                productId,
                farmerId,
                expectedQuantity: actualQuantity, // We don't have expected from offline, use actual
                acceptedQuantity,
                rejectedQuantity,
                rejectionReasons,
                photos: photoUrls,
                audioNotes: audioUrls,
                inspectorId: session.user.id,
                notes,
                geolocation: geolocation ? {
                    latitude: geolocation.latitude,
                    longitude: geolocation.longitude,
                    timestamp: new Date(geolocation.timestamp)
                } : undefined,
                signature,
                synced: true,
                timestamp: new Date(timestamp)
            }
        });

        // Try to create a regular QC result if the farmer delivery exists
        try {
            const farmerDelivery = await prisma.farmerDelivery.findUnique({
                where: { id: farmerDeliveryId }
            });

            if (farmerDelivery) {
                await prisma.qCResult.create({
                    data: {
                        farmerDeliveryId,
                        productId,
                        farmerId,
                        expectedQuantity: actualQuantity,
                        acceptedQuantity,
                        rejectedQuantity,
                        rejectionReasons,
                        photos: photoUrls,
                        inspectorId: session.user.id,
                        notes: notes || '',
                        timestamp: new Date(timestamp)
                    }
                });
            }
        } catch (error) {
            // console.warn('Could not create regular QC result, but offline entry saved:', error);
        }

        res.status(200).json({
            success: true,
            message: 'Offline QC submission processed successfully',
            qcEntryId: qcOfflineEntry.id,
            photosUploaded: photoUrls.length,
            audioNotesUploaded: audioUrls.length
        });

    } catch (error) {
        // console.error('Offline QC submission error:', error);
        res.status(500).json({
            error: error instanceof Error ? error.message : 'Failed to process offline submission'
        });
    }
}