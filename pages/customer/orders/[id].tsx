
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
  specialNotes: string | null;
}

const OrderDetailPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const { data: session } = useSession();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || !session) return;

    const fetchOrder = async () => {
      setIsLoading(true);
      try {
        const { data } = await axios.get(`/api/orders/${id}`);
        setOrder(data.order);
      } catch (err) {
        setError('Failed to load order details.');
        // console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrder();
  }, [id, session]);

  const handleCancelOrder = async () => {
    if (!order || order.status !== 'PENDING') return;

    if (window.confirm('Are you sure you want to cancel this order?')) {
      try {
        await axios.put(`/api/orders/${order.id}`, { status: 'CANCELLED' });
        // Refresh the page to show the updated status
        router.reload();
      } catch (err) {
        setError('Failed to cancel the order.');
      }
    }
  };

  if (isLoading) return <p>Loading order details...</p>;
  if (error) return <p style={{ color: 'red' }}>{error}</p>;
  if (!order) return <p>Order not found.</p>;

  return (
    <div style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
      <h1>Order Details</h1>
      <h2>Order #{order.id.substring(0, 8)}...</h2>

      <div style={{ background: '#f9f9f9', padding: '1.5rem', borderRadius: '8px' }}>
        <p><strong>Status:</strong> {order.status}</p>
        <p><strong>Delivery Date:</strong> {new Date(order.deliveryDate).toLocaleDateString()}</p>
        <p><strong>Delivery Address:</strong> {`${order.address.name}, ${order.address.street}, ${order.address.city}, ${order.address.postalCode}`}</p>
        {order.specialNotes && <p><strong>Notes:</strong> {order.specialNotes}</p>}

        <h3 style={{ marginTop: '2rem' }}>Items</h3>
        <ul>
          {order.items.map(item => (
            <li key={item.id} style={{ marginBottom: '1rem' }}>
              {item.product.name} - {item.quantity} x ${item.price.toFixed(2)} = <strong>${(item.quantity * item.price).toFixed(2)}</strong>
            </li>
          ))}
        </ul>

        <h3 style={{ textAlign: 'right', marginTop: '2rem' }}>Total: ${order.totalAmount.toFixed(2)}</h3>

        {order.status === 'PENDING' && (
          <div style={{ marginTop: '2rem', textAlign: 'right' }}>
            <button onClick={handleCancelOrder} style={{ backgroundColor: '#ff4d4f', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '5px' }}>
              Cancel Order
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderDetailPage;
