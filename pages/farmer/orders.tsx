
import { useState, useEffect } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { useSession } from 'next-auth/react';

interface Order {
  id: string;
  status: string;
  deliveryDate: string;
  customer: {
    user: {
      name: string;
    };
  };
  items: {
    id: string;
    quantity: number;
    price: number;
  }[];
}

const FarmerOrdersPage = () => {
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
      <h1>My Incoming Orders</h1>
      {isLoading && <p>Loading...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {!isLoading && orders.length === 0 && <p>You have no incoming orders.</p>}
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {orders.map(order => (
          <div key={order.id} style={{ border: '1px solid #ddd', padding: '1rem', borderRadius: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0 }}>Order #{order.id.substring(0, 8)}...</h3>
                <p style={{ margin: '5px 0' }}><strong>Status:</strong> {order.status}</p>
                <p style={{ margin: '5px 0' }}><strong>Customer:</strong> {order.customer.user.name}</p>
                <p style={{ margin: '5px 0' }}><strong>Delivery Date:</strong> {new Date(order.deliveryDate).toLocaleDateString()}</p>
                <p style={{ margin: '5px 0' }}>
                  <strong>My Items Value:</strong> 
                  ${order.items.reduce((total, item) => total + item.quantity * item.price, 0).toFixed(2)}
                </p>
              </div>
              <Link href={`/farmer/orders/${order.id}`} style={{ padding: '10px 15px', textDecoration: 'none', border: '1px solid #333', borderRadius: '5px' }}>
                View Details
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FarmerOrdersPage;
