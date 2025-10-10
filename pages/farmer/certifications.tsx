
import { useState, useEffect } from 'react';
import axios from 'axios';
import { useSession } from 'next-auth/react';
import FileUpload from '@/components/FileUpload';

interface DbFile {
  id: string;
  originalName: string;
  url: string;
  thumbnailUrl?: string | null;
}

interface Certification {
  id: string;
  name: string;
  issuingBody: string;
  issueDate: string;
  expiryDate?: string | null;
  file: {
    url: string;
    thumbnailUrl?: string | null;
  };
  extractedText?: string | null;
}

const FarmerCertificationsPage = () => {
  const { data: session } = useSession();
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [newCertName, setNewCertName] = useState('');
  const [newCertIssuingBody, setNewCertIssuingBody] = useState('');
  const [newCertIssueDate, setNewCertIssueDate] = useState('');
  const [newCertExpiryDate, setNewCertExpiryDate] = useState('');
  const [uploadedFile, setUploadedFile] = useState<DbFile | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ocrStates, setOcrStates] = useState<Record<string, { loading: boolean; error?: string }>>({});

  useEffect(() => {
    const fetchCertifications = async () => {
      if (!session) return;
      setIsLoading(true);
      try {
        const { data } = await axios.get('/api/certifications');
        setCertifications(data);
      } catch (err) {
        setError('Failed to load certifications.');
        // console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCertifications();
  }, [session]);

  const handleUploadSuccess = (file: DbFile) => {
    setUploadedFile(file);
  };

  const runOcr = async (certificationId: string) => {
    setOcrStates(prev => ({ ...prev, [certificationId]: { loading: true } }));
    try {
      const { data: updatedCert } = await axios.post(`/api/certifications/${certificationId}/run-ocr`);
      setCertifications(prevCerts => 
        prevCerts.map(c => c.id === certificationId ? { ...c, extractedText: updatedCert.extractedText } : c)
      );
    } catch (err) {
      setOcrStates(prev => ({ ...prev, [certificationId]: { loading: false, error: 'OCR failed.' } }));
    } finally {
      setOcrStates(prev => ({ ...prev, [certificationId]: { loading: false } }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadedFile) {
      alert('Please upload a certification document first.');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    try {
      const { data: newCertification } = await axios.post('/api/certifications', {
        name: newCertName,
        issuingBody: newCertIssuingBody,
        issueDate: newCertIssueDate,
        expiryDate: newCertExpiryDate || null,
        fileId: uploadedFile.id,
      });

      setCertifications([newCertification, ...certifications]);
      setNewCertName('');
      setNewCertIssuingBody('');
      setNewCertIssueDate('');
      setNewCertExpiryDate('');
      setUploadedFile(null);

      // Automatically run OCR on the new certification
      await runOcr(newCertification.id);

    } catch (err) {
      setError('Failed to create certification.');
      // console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
      <h1>My Certifications</h1>
      
      <div style={{ background: '#f9f9f9', padding: '2rem', borderRadius: '8px', marginBottom: '2rem' }}>
        <h2>Add New Certification</h2>
        <form onSubmit={handleSubmit}>
          <input type="text" placeholder="Certification Name" value={newCertName} onChange={e => setNewCertName(e.target.value)} required />
          <input type="text" placeholder="Issuing Body" value={newCertIssuingBody} onChange={e => setNewCertIssuingBody(e.target.value)} required />
          <input type="date" value={newCertIssueDate} onChange={e => setNewCertIssueDate(e.target.value)} required />
          <input type="date" value={newCertExpiryDate} onChange={e => setNewCertExpiryDate(e.target.value)} />
          <FileUpload onUploadSuccess={handleUploadSuccess} accept="image/*,application/pdf" />
          {uploadedFile && <p>"{uploadedFile.originalName}" ready.</p>}
          <button type="submit" disabled={isSubmitting || !uploadedFile}>
            {isSubmitting ? 'Submitting...' : 'Add Certification'}
          </button>
          {error && <p style={{ color: 'red' }}>{error}</p>}
        </form>
      </div>

      <h2>Existing Certifications</h2>
      {isLoading && <p>Loading...</p>}
      {!isLoading && certifications.length === 0 && <p>No certifications yet.</p>}

      <div>
        {certifications.map(cert => (
          <div key={cert.id} style={{ border: '1px solid #ddd', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
            <img src={cert.file.thumbnailUrl || cert.file.url} alt={`${cert.name} doc`} style={{ width: '100%', height: '200px', objectFit: 'cover' }}/>
            <h3>{cert.name}</h3>
            <p>Issued by: {cert.issuingBody}</p>
            <p>Issued on: {new Date(cert.issueDate).toLocaleDateString()}</p>
            {cert.expiryDate && <p>Expires on: {new Date(cert.expiryDate).toLocaleDateString()}</p>}
            <a href={cert.file.url} target="_blank" rel="noopener noreferrer">View Document</a>
            
            <div style={{ marginTop: '1rem' }}>
              <button onClick={() => runOcr(cert.id)} disabled={ocrStates[cert.id]?.loading}>
                {ocrStates[cert.id]?.loading ? 'Running OCR...' : 'Run OCR'}
              </button>
              {ocrStates[cert.id]?.error && <p style={{ color: 'red' }}>{ocrStates[cert.id]?.error}</p>}
            </div>

            {cert.extractedText && (
              <div style={{ marginTop: '1rem', background: '#f0f0f0', padding: '10px' }}>
                <h4>Extracted Text:</h4>
                <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{cert.extractedText}</pre>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default FarmerCertificationsPage;
