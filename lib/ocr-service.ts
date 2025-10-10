import Tesseract from 'tesseract.js';
import sharp from 'sharp';
import { prisma } from './db-optimization';

export interface OCRResult {
  text: string;
  confidence: number;
  words: Array<{
    text: string;
    confidence: number;
    bbox: {
      x0: number;
      y0: number;
      x1: number;
      y1: number;
    };
  }>;
  lines: Array<{
    text: string;
    confidence: number;
    bbox: {
      x0: number;
      y0: number;
      x1: number;
      y1: number;
    };
  }>;
  paragraphs: Array<{
    text: string;
    confidence: number;
    bbox: {
      x0: number;
      y0: number;
      x1: number;
      y1: number;
    };
  }>;
}

export interface ExtractedData {
  certificateNumber?: string;
  issuedDate?: string;
  expiryDate?: string;
  issuer?: string;
  farmerName?: string;
  farmName?: string;
  location?: string;
  productTypes?: string[];
  standards?: string[];
}

class OCRService {
  private static worker: Tesseract.Worker | null = null;

  /**
   * Initialize OCR worker
   */
  static async initializeWorker(): Promise<void> {
    if (this.worker) return;

    try {
      this.worker = await Tesseract.createWorker('eng', 1, {
        logger: m => {
          if (m.status === 'recognizing text') {
            // console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
          }
        }
      });

      await this.worker.setParameters({
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,:-/ ',
        tessedit_pageseg_mode: Tesseract.PSM.AUTO,
      });

      // console.log('OCR Worker initialized successfully');
    } catch (error) {
      // console.error('Failed to initialize OCR worker:', error);
      throw error;
    }
  }

  /**
   * Terminate OCR worker
   */
  static async terminateWorker(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
  }

  /**
   * Preprocess image for better OCR results
   */
  static async preprocessImage(imageBuffer: Buffer): Promise<Buffer> {
    try {
      return await sharp(imageBuffer)
        .grayscale() // Convert to grayscale
        .normalize() // Normalize contrast
        .sharpen() // Sharpen the image
        .resize(null, 1200, { // Resize to optimal height
          withoutEnlargement: true,
          fit: 'inside'
        })
        .png() // Convert to PNG for better OCR
        .toBuffer();
    } catch (error) {
      // console.error('Image preprocessing error:', error);
      return imageBuffer; // Return original if preprocessing fails
    }
  }

  /**
   * Extract text from image using OCR
   */
  static async extractTextFromImage(imageBuffer: Buffer): Promise<OCRResult> {
    try {
      await this.initializeWorker();
      
      if (!this.worker) {
        throw new Error('OCR worker not initialized');
      }

      // Preprocess image for better results
      const processedImage = await this.preprocessImage(imageBuffer);

      // Perform OCR
      const { data } = await this.worker.recognize(processedImage);

      // Format results
      const result: OCRResult = {
        text: data.text.trim(),
        confidence: data.confidence,
        words: data.words.map(word => ({
          text: word.text,
          confidence: word.confidence,
          bbox: word.bbox
        })),
        lines: data.lines.map(line => ({
          text: line.text,
          confidence: line.confidence,
          bbox: line.bbox
        })),
        paragraphs: data.paragraphs.map(paragraph => ({
          text: paragraph.text,
          confidence: paragraph.confidence,
          bbox: paragraph.bbox
        }))
      };

      return result;
    } catch (error) {
      // console.error('OCR extraction error:', error);
      throw error;
    }
  }

  /**
   * Extract structured data from certification documents
   */
  static extractCertificationData(ocrResult: OCRResult): ExtractedData {
    const text = ocrResult.text.toLowerCase();
    const lines = ocrResult.lines.map(line => line.text);
    const extractedData: ExtractedData = {};

    try {
      // Extract certificate number
      const certNumberPatterns = [
        /certificate\s*(?:no|number|#)?\s*:?\s*([a-z0-9\-\/]+)/i,
        /cert\s*(?:no|number|#)?\s*:?\s*([a-z0-9\-\/]+)/i,
        /registration\s*(?:no|number|#)?\s*:?\s*([a-z0-9\-\/]+)/i,
        /license\s*(?:no|number|#)?\s*:?\s*([a-z0-9\-\/]+)/i
      ];

      for (const pattern of certNumberPatterns) {
        const match = text.match(pattern);
        if (match) {
          extractedData.certificateNumber = match[1].trim();
          break;
        }
      }

      // Extract dates
      const datePatterns = [
        /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/g,
        /(\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{2,4})/gi,
        /(\d{2,4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})/g
      ];

      const foundDates: string[] = [];
      for (const pattern of datePatterns) {
        const matches = text.match(pattern);
        if (matches) {
          foundDates.push(...matches);
        }
      }

      // Try to identify issue and expiry dates
      for (const line of lines) {
        const lineLower = line.toLowerCase();
        
        if (lineLower.includes('issued') || lineLower.includes('valid from')) {
          const dateMatch = line.match(/(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/);
          if (dateMatch) {
            extractedData.issuedDate = dateMatch[1];
          }
        }
        
        if (lineLower.includes('expir') || lineLower.includes('valid until') || lineLower.includes('valid to')) {
          const dateMatch = line.match(/(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/);
          if (dateMatch) {
            extractedData.expiryDate = dateMatch[1];
          }
        }
      }

      // Extract issuer
      const issuerPatterns = [
        /issued\s+by\s*:?\s*([^\n\r]+)/i,
        /certifying\s+body\s*:?\s*([^\n\r]+)/i,
        /authority\s*:?\s*([^\n\r]+)/i
      ];

      for (const pattern of issuerPatterns) {
        const match = text.match(pattern);
        if (match) {
          extractedData.issuer = match[1].trim();
          break;
        }
      }

      // Extract farmer/farm information
      const namePatterns = [
        /farmer\s*(?:name)?\s*:?\s*([^\n\r]+)/i,
        /producer\s*(?:name)?\s*:?\s*([^\n\r]+)/i,
        /grower\s*(?:name)?\s*:?\s*([^\n\r]+)/i
      ];

      for (const pattern of namePatterns) {
        const match = text.match(pattern);
        if (match) {
          extractedData.farmerName = match[1].trim();
          break;
        }
      }

      const farmPatterns = [
        /farm\s*(?:name)?\s*:?\s*([^\n\r]+)/i,
        /operation\s*(?:name)?\s*:?\s*([^\n\r]+)/i,
        /business\s*(?:name)?\s*:?\s*([^\n\r]+)/i
      ];

      for (const pattern of farmPatterns) {
        const match = text.match(pattern);
        if (match) {
          extractedData.farmName = match[1].trim();
          break;
        }
      }

      // Extract location
      const locationPatterns = [
        /(?:address|location)\s*:?\s*([^\n\r]+)/i,
        /(?:city|state|country)\s*:?\s*([^\n\r]+)/i
      ];

      for (const pattern of locationPatterns) {
        const match = text.match(pattern);
        if (match) {
          extractedData.location = match[1].trim();
          break;
        }
      }

      // Extract product types
      const productKeywords = [
        'organic', 'vegetables', 'fruits', 'grains', 'dairy', 'meat', 'poultry',
        'crops', 'produce', 'livestock', 'aquaculture', 'herbs', 'spices'
      ];

      const foundProducts: string[] = [];
      for (const keyword of productKeywords) {
        if (text.includes(keyword)) {
          foundProducts.push(keyword);
        }
      }

      if (foundProducts.length > 0) {
        extractedData.productTypes = foundProducts;
      }

      // Extract standards
      const standardKeywords = [
        'usda organic', 'eu organic', 'jis organic', 'global gap', 'haccp',
        'iso 22000', 'brc', 'sqf', 'fair trade', 'rainforest alliance'
      ];

      const foundStandards: string[] = [];
      for (const standard of standardKeywords) {
        if (text.includes(standard)) {
          foundStandards.push(standard);
        }
      }

      if (foundStandards.length > 0) {
        extractedData.standards = foundStandards;
      }

      return extractedData;
    } catch (error) {
      // console.error('Data extraction error:', error);
      return extractedData;
    }
  }

  /**
   * Process file and extract text with structured data
   */
  static async processFile(
    fileId: string,
    imageBuffer: Buffer,
    category: string = 'document'
  ): Promise<{ ocrResult: OCRResult; extractedData?: ExtractedData }> {
    try {
      // Perform OCR
      const ocrResult = await this.extractTextFromImage(imageBuffer);

      let extractedData: ExtractedData | undefined;

      // Extract structured data for certifications
      if (category === 'certification') {
        extractedData = this.extractCertificationData(ocrResult);
      }

      // Save OCR results to database
      await this.saveOCRResults(fileId, ocrResult, extractedData);

      return { ocrResult, extractedData };
    } catch (error) {
      // console.error('File processing error:', error);
      throw error;
    }
  }

  /**
   * Save OCR results to database
   */
  private static async saveOCRResults(
    fileId: string,
    ocrResult: OCRResult,
    extractedData?: ExtractedData
  ): Promise<void> {
    try {
      // Update file record with OCR data (mock implementation)
      // await prisma.file.update({
      //   where: { id: fileId },
      //   data: {
      //     metadata: {
      //       ocr: {
      //         text: ocrResult.text,
      //         confidence: ocrResult.confidence,
      //         wordCount: ocrResult.words.length,
      //         extractedAt: new Date().toISOString()
      //       },
      //       extractedData: extractedData || null
      //     }
      //   }
      // });
    } catch (error) {
      // console.error('Save OCR results error:', error);
      throw error;
    }
  }

  /**
   * Search files by OCR text content
   */
  static async searchByText(
    query: string,
    userId: string,
    filters: {
      category?: string;
      entityType?: string;
      page?: number;
      limit?: number;
    } = {}
  ) {
    try {
      const { page = 1, limit = 20, category, entityType } = filters;
      const skip = (page - 1) * limit;

      const where: any = {
        uploadedBy: userId,
        metadata: {
          path: ['ocr', 'text'],
          string_contains: query
        }
      };

      if (category) where.category = category;
      if (entityType) where.entityType = entityType;

      // Mock file listing (in real implementation use prisma.file.findMany)
      const files = [
        {
          id: 'mock-file-1',
          originalName: 'document.pdf',
          category: category || 'general',
          url: 'https://example.com/mock-file.pdf',
          metadata: {
            ocr: {
              text: 'Sample OCR text content',
              confidence: 0.95,
              wordCount: 4,
              extractedAt: new Date().toISOString()
            }
          },
          createdAt: new Date()
        }
      ];
      const total = 1;

      // Highlight search terms in results
      const results = files.map((file: any) => {
        const ocrText = (file.metadata as any)?.ocr?.text || '';
        const highlightedText = this.highlightSearchTerms(ocrText, query);
        
        return {
          ...file,
          highlightedText,
          relevanceScore: this.calculateRelevanceScore(ocrText, query)
        };
      });

      // Sort by relevance
      results.sort((a: any, b: any) => b.relevanceScore - a.relevanceScore);

      return {
        files: results,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      // console.error('Search by text error:', error);
      throw error;
    }
  }

  /**
   * Highlight search terms in text
   */
  private static highlightSearchTerms(text: string, query: string): string {
    const terms = query.toLowerCase().split(' ').filter(term => term.length > 2);
    let highlightedText = text;

    for (const term of terms) {
      const regex = new RegExp(`(${term})`, 'gi');
      highlightedText = highlightedText.replace(regex, '<mark>$1</mark>');
    }

    return highlightedText;
  }

  /**
   * Calculate relevance score for search results
   */
  private static calculateRelevanceScore(text: string, query: string): number {
    const textLower = text.toLowerCase();
    const queryLower = query.toLowerCase();
    const terms = queryLower.split(' ').filter(term => term.length > 2);

    let score = 0;

    // Exact phrase match (highest score)
    if (textLower.includes(queryLower)) {
      score += 100;
    }

    // Individual term matches
    for (const term of terms) {
      const matches = (textLower.match(new RegExp(term, 'g')) || []).length;
      score += matches * 10;
    }

    // Proximity bonus (terms appearing close together)
    for (let i = 0; i < terms.length - 1; i++) {
      const term1Index = textLower.indexOf(terms[i]);
      const term2Index = textLower.indexOf(terms[i + 1]);
      
      if (term1Index !== -1 && term2Index !== -1) {
        const distance = Math.abs(term2Index - term1Index);
        if (distance < 50) { // Within 50 characters
          score += Math.max(0, 20 - distance);
        }
      }
    }

    return score;
  }
}

// Cleanup worker on process exit
process.on('exit', async () => {
  await OCRService.terminateWorker();
});

process.on('SIGINT', async () => {
  await OCRService.terminateWorker();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await OCRService.terminateWorker();
  process.exit(0);
});

export { OCRService };