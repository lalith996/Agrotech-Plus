import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { FileUploadService } from '@/lib/file-upload';
import { prisma } from '@/lib/db-optimization';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.query;
  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid file ID' });
  }

  switch (req.method) {
    case 'GET':
      return handleGet(req, res, id, session.user.id);
    case 'DELETE':
      return handleDelete(req, res, id, session.user.id);
    case 'PUT':
      return handleUpdate(req, res, id, session.user.id);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function handleGet(req: NextApiRequest, res: NextApiResponse, fileId: string, userId: string) {
  try {
    const file = await FileUploadService.getFile(fileId, userId);
    
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.status(200).json({ success: true, file });
  } catch (error) {
    // console.error('Get file error:', error);
    res.status(500).json({ error: 'Failed to retrieve file' });
  }
}

async function handleDelete(req: NextApiRequest, res: NextApiResponse, fileId: string, userId: string) {
  try {
    const result = await FileUploadService.deleteFile(fileId, userId);
    
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.status(200).json({ success: true, message: 'File deleted successfully' });
  } catch (error) {
    // console.error('Delete file error:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
}

async function handleUpdate(req: NextApiRequest, res: NextApiResponse, fileId: string, userId: string) {
  try {
    const { description, category, entityType, entityId } = req.body;

    // Verify file ownership
    const existingFile = await prisma.file.findFirst({
      where: {
        id: fileId,
        uploadedBy: userId
      }
    });

    if (!existingFile) {
      return res.status(404).json({ error: 'File not found or access denied' });
    }

    // Update file metadata
    const updatedFile = await prisma.file.update({
      where: { id: fileId },
      data: {
        category: category || existingFile.category,
        entityType: entityType || existingFile.entityType,
        entityId: entityId || existingFile.entityId,
        metadata: {
          ...existingFile.metadata as any,
          description
        }
      }
    });

    res.status(200).json({ 
      success: true, 
      message: 'File updated successfully',
      file: updatedFile
    });
  } catch (error) {
    // console.error('Update file error:', error);
    res.status(500).json({ error: 'Failed to update file' });
  }
}