import { useState } from 'react';
import axios from 'axios';
import FileUpload from '@/components/FileUpload';

interface UploadedImageUrls {
  original: string;
  optimized: string;
  thumbnail: string;
}

const UploadTestPage = () => {
  const [uploadedUrls, setUploadedUrls] = useState<UploadedImageUrls | null>(null);
  const [ocrText, setOcrText] = useState<string | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);

  const handleUploadSuccess = (urls: UploadedImageUrls) => {
    // console.log('Upload and processing successful!', urls);
    setUploadedUrls(urls);
    // Reset OCR state if a new image is uploaded
    setOcrText(null);
    setOcrError(null);
  };

  const handleUploadError = (error: any) => {
    // console.error('Upload failed:', error);
    alert('Upload failed. See the console for more details.');
  };

  const handleRunOcr = async () => {
    if (!uploadedUrls?.original) return;

    setOcrLoading(true);
    setOcrError(null);
    try {
      const { data } = await axios.post('/api/upload/run-ocr', {
        imageUrl: uploadedUrls.original,
      });
      setOcrText(data.text || "No text found.");
    } catch (err) {
      // console.error('OCR failed:', err);
      setOcrError('Failed to extract text from the image.');
    } finally {
      setOcrLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', lineHeight: '1.6' }}>
      <h1>File Upload, Optimization & OCR Test</h1>
      <p>Select an image to upload. It will be sent to S3, processed, and then you can run OCR on it.</p>
      <FileUpload onUploadSuccess={handleUploadSuccess} onUploadError={handleUploadError} accept="image/*" />

      {uploadedUrls && (
        <div style={{ marginTop: '30px' }}>
          <h2>Step 1: Upload & Processing Complete</h2>
          <div style={{ display: 'flex', gap: '30px', marginTop: '10px', flexWrap: 'wrap' }}>
            <div>
              <h3>Original</h3>
              <img src={uploadedUrls.original} alt="Original" style={{ width: '300px' }} />
            </div>
            <div>
              <h3>Optimized (WebP)</h3>
              <img src={uploadedUrls.optimized} alt="Optimized" style={{ width: '300px' }} />
            </div>
            <div>
              <h3>Thumbnail</h3>
              <img src={uploadedUrls.thumbnail} alt="Thumbnail" style={{ width: '200px' }} />
            </div>
          </div>

          <div style={{ marginTop: '30px' }}>
            <h2>Step 2: Run OCR</h2>
            <p>Click the button below to extract text from the <strong>original</strong> uploaded image.</p>
            <button onClick={handleRunOcr} disabled={ocrLoading}>
              {ocrLoading ? 'Extracting Text...' : 'Run OCR'}
            </button>

            {ocrError && <p style={{ color: 'red', marginTop: '10px' }}>{ocrError}</p>}

            {ocrText && (
              <div style={{ marginTop: '20px', padding: '15px', border: '1px solid #ccc', background: '#f9f9f9' }}>
                <h3>Extracted Text:</h3>
                <pre style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>{ocrText}</pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadTestPage;
