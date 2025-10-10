
import { useState, useEffect } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { useSession } from 'next-auth/react';

interface Order {
  id: string;
  status: string;
  deliveryDate: string;
  totalAmount: number;
  createdAt: string;
}

const CustomerOrdersPage = () => {
  const { data: session } = useSession();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrders = async () => {
      if (!session) return;
      setIsLoading(true);
      try {
        const { data } = await axios.get('/api/orders');
        setOrders(data.orders);
      } catch (err) {
        setError('Failed to load orders.');
        // console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, [session]);

  return (
    <div style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
      <h1>My Orders</h1>
      {isLoading && <p>Loading...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {!isLoading && orders.length === 0 && <p>You have not placed any orders yet.</p>}
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {orders.map(order => (
          <div key={order.id} style={{ border: '1px solid #ddd', padding: '1rem', borderRadius: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0 }}>Order #{order.id.substring(0, 8)}...</h3>
                <p style={{ margin: '5px 0' }}><strong>Status:</strong> {order.status}</p>
                <p style={{ margin: '5px 0' }}><strong>Total:</strong> ${order.totalAmount.toFixed(2)}</p>
                <p style={{ margin: '5px 0', color: '#666' }}>Placed on {new Date(order.createdAt).toLocaleDateString()}</p>
              </div>
              <Link href={`/customer/orders/${order.id}`} style={{ padding: '10px 15px', textDecoration: 'none', border: '1px solid #333', borderRadius: '5px' }}>
                View Details
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CustomerOrdersPage;
