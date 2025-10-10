
import { useState, useEffect } from 'react';
import axios from 'axios';
import Link from 'next/link';

interface DashboardStats {
  totalCustomers: number;
  totalFarmers: number;
  pendingFarmers: number;
  totalProducts: number;
  activeSubscriptions: number;
  totalOrders: number;
  pendingOrders: number;
  monthlyRevenue: number;
  recentOrders: any[];
  recentFarmers: any[];
}

const AdminDashboardPage = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const { data } = await axios.get('/api/admin/dashboard');
        setStats(data.stats);
      } catch (err) {
        setError('Failed to load dashboard data. You may not have permission to view this page.');
        // console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (isLoading) return <p>Loading dashboard...</p>;
  if (error) return <p style={{ color: 'red' }}>{error}</p>;
  if (!stats) return <p>No dashboard data available.</p>;

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Admin Dashboard</h1>

      {/* Key Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Total Customers */}
        <div style={{ border: '1px solid #ddd', padding: '1rem', borderRadius: '8px' }}>
          <h3>Total Customers</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>{stats.totalCustomers}</p>
        </div>
        {/* Total Farmers */}
        <div style={{ border: '1px solid #ddd', padding: '1rem', borderRadius: '8px' }}>
          <h3>Total Farmers</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>{stats.totalFarmers}</p>
        </div>
        {/* Pending Farmers */}
        <div style={{ border: '1px solid #ddd', padding: '1rem', borderRadius: '8px', background: stats.pendingFarmers > 0 ? '#fffbe6' : 'transparent' }}>
          <h3>Pending Farmers</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', color: stats.pendingFarmers > 0 ? '#fadb14' : '#333' }}>{stats.pendingFarmers}</p>
          <Link href="/admin/farmers">Review Approvals</Link>
        </div>
        {/* Monthly Revenue */}
        <div style={{ border: '1px solid #ddd', padding: '1rem', borderRadius: '8px' }}>
          <h3>Monthly Revenue</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>${stats.monthlyRevenue.toFixed(2)}</p>
        </div>
      </div>

      {/* Recent Activity */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        {/* Recent Orders */}
        <div>
          <h2>Recent Orders</h2>
          {stats.recentOrders.length > 0 ? (
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {stats.recentOrders.map(order => (
                <li key={order.id} style={{ borderBottom: '1px solid #eee', padding: '10px 0' }}>
                  <Link href={`/admin/orders/${order.id}`} style={{ textDecoration: 'none', color: '#333' }}>
                    <p><strong>#{order.id.substring(0, 8)}...</strong> by {order.customerName}</p>
                    <p>${order.totalAmount.toFixed(2)} - <span style={{ textTransform: 'capitalize' }}>{order.status}</span></p>
                  </Link>
                </li>
              ))}
            </ul>
          ) : <p>No recent orders.</p>}
        </div>
        {/* New Farmers */}
        <div>
          <h2>New Farmers</h2>
          {stats.recentFarmers.length > 0 ? (
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {stats.recentFarmers.map(farmer => (
                <li key={farmer.id} style={{ borderBottom: '1px solid #eee', padding: '10px 0' }}>
                   <Link href={`/admin/farmers/${farmer.id}`} style={{ textDecoration: 'none', color: '#333' }}>
                      <p><strong>{farmer.farmName}</strong></p>
                      <p>Status: {farmer.isApproved ? <span style={{color: 'green'}}>Approved</span> : <span style={{color: 'orange'}}>Pending</span>}</p>
                   </Link>
                </li>
              ))}
            </ul>
          ) : <p>No new farmers have signed up recently.</p>}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
