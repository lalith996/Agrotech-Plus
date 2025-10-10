
import { useState, useEffect } from 'react';
import axios from 'axios';
import Link from 'next/link';

interface Farmer {
  id: string;
  farmName: string;
  isApproved: boolean;
  user: {
    name: string;
    email: string;
  };
  _count: {
    products: number;
  };
}

const AdminFarmersPage = () => {
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('all'); // 'all', 'pending', 'approved'
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchFarmers = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        if (status !== 'all') params.append('status', status);
        if (search) params.append('search', search);

        const { data } = await axios.get(`/api/admin/farmers?${params.toString()}`);
        setFarmers(data.farmers);
      } catch (err) {
        setError('Failed to load farmers.');
        // console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    // Debounce search input
    const timer = setTimeout(() => {
      fetchFarmers();
    }, 500);

    return () => clearTimeout(timer);
  }, [status, search]);

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Farmer Management</h1>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
        <input 
          type="text" 
          placeholder="Search by name, email, location..." 
          value={search} 
          onChange={e => setSearch(e.target.value)} 
          style={{ flexGrow: 1, padding: '8px' }}
        />
        <select value={status} onChange={e => setStatus(e.target.value)} style={{ padding: '8px' }}>
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
        </select>
      </div>

      {/* Farmer List */}
      {isLoading && <p>Loading farmers...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {!isLoading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {farmers.length > 0 ? farmers.map(farmer => (
            <div key={farmer.id} style={{ border: '1px solid #ddd', padding: '1rem', borderRadius: '8px', display: 'grid', gridTemplateColumns: '3fr 2fr 1fr 1fr', alignItems: 'center' }}>
              <div>
                <strong>{farmer.farmName}</strong>
                <p style={{ margin: 0, color: '#555' }}>{farmer.user.name} ({farmer.user.email})</p>
              </div>
              <div>
                <strong>Status:</strong>
                <span style={{ color: farmer.isApproved ? 'green' : 'orange', marginLeft: '8px' }}>
                  {farmer.isApproved ? 'Approved' : 'Pending'}
                </span>
              </div>
              <div>
                <strong>Products:</strong> {farmer._count.products}
              </div>
              <Link href={`/admin/farmers/${farmer.id}`}>Manage</Link>
            </div>
          )) : <p>No farmers found with the current filters.</p>}
        </div>
      )}
    </div>
  );
};

export default AdminFarmersPage;
