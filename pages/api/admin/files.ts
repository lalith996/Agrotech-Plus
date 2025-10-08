import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied' })
    }

    if (req.method === 'GET') {
      return await handleGetFiles(req, res)
    } else if (req.method === 'DELETE') {
      return await handleDeleteFile(req, res)
    } else {
      return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Admin files API error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

async function handleGetFiles(req: NextApiRequest, res: NextApiResponse) {
  try {
    const {
      page = '1',
      limit = '20',
      search = '',
      category = '',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query

    const pageNum = parseInt(page as string)
    const limitNum = parseInt(limit as string)
    const offset = (pageNum - 1) * limitNum

    // Mock file listing (in real implementation use prisma.file.findMany)
    const mockFiles = [
      {
        id: 'file-1',
        filename: 'sample-document.pdf',
        originalName: 'document.pdf',
        mimeType: 'application/pdf',
        size: 2048000,
        url: 'https://example.com/document.pdf',
        category: 'document',
        createdAt: new Date('2024-01-15'),
        uploadedByUser: {
          name: 'John Doe',
          email: 'john@example.com'
        }
      },
      {
        id: 'file-2',
        filename: 'product-image.jpg',
        originalName: 'product.jpg',
        mimeType: 'image/jpeg',
        size: 1024000,
        url: 'https://example.com/product.jpg',
        category: 'product_image',
        createdAt: new Date('2024-01-14'),
        uploadedByUser: {
          name: 'Jane Smith',
          email: 'jane@example.com'
        }
      },
      {
        id: 'file-3',
        filename: 'qc-report.pdf',
        originalName: 'qc-report.pdf',
        mimeType: 'application/pdf',
        size: 512000,
        url: 'https://example.com/qc-report.pdf',
        category: 'qc_photo',
        createdAt: new Date('2024-01-13'),
        uploadedByUser: {
          name: 'Bob Wilson',
          email: 'bob@example.com'
        }
      }
    ];

    // Apply filters
    let filteredFiles = mockFiles;

    if (search) {
      const searchLower = (search as string).toLowerCase();
      filteredFiles = filteredFiles.filter(file => 
        file.originalName.toLowerCase().includes(searchLower) ||
        file.filename.toLowerCase().includes(searchLower)
      );
    }

    if (category) {
      filteredFiles = filteredFiles.filter(file => file.category === category);
    }

    // Apply sorting (create a new sorted array to avoid mutation)
    filteredFiles = [...filteredFiles].sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'name':
          aValue = a.originalName;
          bValue = b.originalName;
          break;
        case 'size':
          aValue = a.size;
          bValue = b.size;
          break;
        case 'mimeType':
          aValue = a.mimeType;
          bValue = b.mimeType;
          break;
        default:
          aValue = a.createdAt;
          bValue = b.createdAt;
      }

      if (sortOrder === 'desc') {
        return bValue > aValue ? 1 : -1;
      } else {
        return aValue > bValue ? 1 : -1;
      }
    });

    // Apply pagination
    const totalCount = filteredFiles.length;
    const paginatedFiles = filteredFiles.slice(offset, offset + limitNum);

    // Calculate statistics
    const totalSize = filteredFiles.reduce((sum, file) => sum + file.size, 0);
    const categories = Array.from(new Set(filteredFiles.map(file => file.category)));

    res.json({
      files: paginatedFiles,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        pages: Math.ceil(totalCount / limitNum)
      },
      stats: {
        totalFiles: totalCount,
        totalSize,
        categories: categories.map(cat => ({
          name: cat,
          count: filteredFiles.filter(f => f.category === cat).length
        }))
      }
    });
  } catch (error) {
    console.error('Get files error:', error);
    res.status(500).json({ error: 'Failed to fetch files' });
  }
}

async function handleDeleteFile(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { fileId } = req.body;

    if (!fileId) {
      return res.status(400).json({ error: 'File ID is required' });
    }

    // Mock file deletion (in real implementation use prisma.file.delete and S3 deletion)
    console.log(`Mock deleting file: ${fileId}`);

    res.json({ 
      success: true, 
      message: 'File deleted successfully' 
    });
  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
}