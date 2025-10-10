
import { useState, useEffect } from 'react';
import axios from 'axios';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';

interface OrderItem {
  id: string;
  quantity: number;
  price: number;
  product: {
    name: string;
    farmerId: string;
  };
}

interface Order {
  id: string;
  status: string;
  deliveryDate: string;
  totalAmount: number;
  items: OrderItem[];
  address: {
    name: string;
    street: string;
    city: string;
    postalCode: string;
  };
  customer: {
    user: {
      name: string;
    };
  };
}

const FarmerOrderDetailPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const { data: session } = useSession();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [farmerId, setFarmerId] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrderAndFarmer = async () => {
      if (!id || !session) return;
      setIsLoading(true);
      try {
        // Fetch farmer profile to get the farmerId
        const farmerRes = await axios.get('/api/farmer/profile');
        setFarmerId(farmerRes.data.id);

        // Fetch order details
        const orderRes = await axios.get(`/api/orders/${id}`);
        setOrder(orderRes.data.order);
      } catch (err) {
        setError('Failed to load order details.');
        // console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrderAndFarmer();
  }, [id, session]);

  if (isLoading) return <p>Loading order details...</p>;
  if (error) return <p style={{ color: 'red' }}>{error}</p>;
  if (!order) return <p>Order not found.</p>;

  return (
    <div style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
      <h1>Order Details</h1>
      <h2>Order #{order.id.substring(0, 8)}...</h2>

      <div style={{ background: '#f9f9f9', padding: '1.5rem', borderRadius: '8px' }}>
        <p><strong>Status:</strong> {order.status}</p>
        <p><strong>Customer:</strong> {order.customer.user.name}</p>
        <p><strong>Delivery Date:</strong> {new Date(order.deliveryDate).toLocaleDateString()}</p>
        <p><strong>Delivery Address:</strong> {`${order.address.name}, ${order.address.street}, ${order.address.city}, ${order.address.postalCode}`}</p>

        <h3 style={{ marginTop: '2rem' }}>Items in this Order</h3>
        <ul>
          {order.items.map(item => (
            <li 
              key={item.id} 
              style={{
                marginBottom: '1rem', 
                fontWeight: item.product.farmerId === farmerId ? 'bold' : 'normal',
                color: item.product.farmerId === farmerId ? '#2c6e49' : '#333'
              }}
            >
              {item.product.name} - {item.quantity} x ${item.price.toFixed(2)} = <strong>${(item.quantity * item.price).toFixed(2)}</strong>
              {item.product.farmerId === farmerId && <span> (Your Product)</span>}
            </li>
          ))}
        </ul>

        <h3 style={{ textAlign: 'right', marginTop: '2rem' }}>Total Order Value: ${order.totalAmount.toFixed(2)}</h3>
      </div>
    </div>
  );
};

export default FarmerOrderDetailPage;
