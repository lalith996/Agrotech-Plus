
import { useState } from 'react';
import axios from 'axios';

// This interface should ideally be shared from your backend types
interface DbFile {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  s3Key: string;
  url: string;
  optimizedUrl?: string | null;
  thumbnailUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface FileUploadProps {
  onUploadSuccess: (file: DbFile) => void;
  onUploadError?: (error: any) => void;
  accept?: string;
}

const FileUpload: React.FC<FileUploadProps> = ({ onUploadSuccess, onUploadError, accept }) => {
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [creatingRecord, setCreatingRecord] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setProcessing(false);
    setCreatingRecord(false);
    setError(null);

    try {
      // 1. Get a pre-signed URL from our API
      const { data: signedUrlData } = await axios.post('/api/upload/signed-url', {
        filename: file.name,
        contentType: file.type,
      });

      const { signedUrl, url: originalUrl, key } = signedUrlData;

      // 2. Upload the file directly to S3
      await axios.put(signedUrl, file, {
        headers: { 'Content-Type': file.type },
      });
      setUploading(false);

      // 3. Prepare file data for our database
      const fileData: Partial<DbFile> & { originalName: string; mimeType: string; size: number; s3Key: string; url: string; } = {
        originalName: file.name,
        mimeType: file.type,
        size: file.size,
        s3Key: key,
        url: originalUrl,
      };

      // 4. If it's an image, trigger the processing API route
      if (file.type.startsWith('image/')) {
        setProcessing(true);
        const { data: processedData } = await axios.post('/api/upload/process-image', {
          key: key,
        });
        fileData.optimizedUrl = processedData.optimizedUrl;
        fileData.thumbnailUrl = processedData.thumbnailUrl;
        setProcessing(false);
      }

      // 5. Create the file record in our database via our own API
      setCreatingRecord(true);
      const { data: newFile } = await axios.post<DbFile>('/api/files', fileData);
      setCreatingRecord(false);
      
      // 6. Notify parent component with the full, persisted file object
      onUploadSuccess(newFile);

    } catch (err: any) {
      // console.error('Upload process failed:', err);
      setError('Upload failed. Please try again.');
      if (onUploadError) {
        onUploadError(err);
      }
    } finally {
      // Reset all loading states
      setUploading(false);
      setProcessing(false);
      setCreatingRecord(false);
    }
  };

  const getStatus = () => {
    if (uploading) return 'Uploading to storage...';
    if (processing) return 'Optimizing image...';
    if (creatingRecord) return 'Saving file record...';
    return null;
  };

  return (
    <div>
      <input type="file" onChange={handleFileChange} disabled={uploading || processing || creatingRecord} accept={accept || 'image/*' } />
      {getStatus() && <p>{getStatus()}</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
};

export default FileUpload;
