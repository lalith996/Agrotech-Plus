import { useState, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';
import { Order } from '@prisma/client';

const containerStyle = {
  width: '100%',
  height: '700px'
};

const center = {
  lat: -3.745, // Default center, will be updated based on orders
  lng: -38.523
};

const AdminRoutes = () => {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""
  });

  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const fetchOrdersForDate = async (date) => {
    // In a real app, you would fetch orders for a specific date and status
    // For this example, we'll just fetch all PENDING orders
    try {
      const response = await fetch(`/api/orders?status=PENDING`);
      if (response.ok) {
        const data = await response.json();
        // We need address information which is nested, this is a simplification
        // The API would need to return orders with full address details
        setOrders(data.orders);
      } else {
        // console.error('Failed to fetch orders');
      }
    } catch (error) {
      // console.error('An error occurred while fetching orders', error);
    }
  };

  useEffect(() => {
    fetchOrdersForDate(selectedDate);
  }, [selectedDate]);

  // This is a placeholder for geocoding. In a real app, you would geocode the addresses
  // either on the backend when the order is placed, or on the frontend here.
  const getCoordinates = (address) => {
    // Simple and not robust way to get some coordinates for visualization
    // Replace with a real geocoding service call
    if (!address) return null;
    // Example: a simple hash to get some variation for demo purposes
    const lat = -3.745 + (address.city.length % 10) * 0.01;
    const lng = -38.523 + (address.street.length % 10) * 0.01;
    return { lat, lng };
  };

  return isLoaded ? (
    <div>
      <h1>Delivery Routes</h1>
      <input 
        type="date" 
        value={selectedDate}
        onChange={(e) => setSelectedDate(e.target.value)}
      />
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={10}
      >
        {orders.map(order => {
          const coordinates = getCoordinates(order.address);
          return coordinates ? (
            <Marker 
              key={order.id} 
              position={coordinates} 
              title={`Order #${order.id}`}
            />
          ) : null;
        })}
      </GoogleMap>
    </div>
  ) : <p>Loading Map...</p>;
};

export default AdminRoutes;
