import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { openDB } from 'idb';

const QCOffline = () => {
  const { data: session } = useSession();
  const [isOffline, setIsOffline] = useState(false);
  const [entries, setEntries] = useState([]);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setIsOffline(!navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const syncOfflineData = async () => {
      if (!isOffline) {
        const db = await openDB('qc-offline-db', 1);
        const offlineEntries = await db.getAll('qc-entries');
        if (offlineEntries.length > 0) {
          try {
            const response = await fetch('/api/qc/sync', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ entries: offlineEntries }),
            });

            if (response.ok) {
              await db.clear('qc-entries');
              setEntries([]);
              // console.log('Offline data synced successfully');
            } else {
              // console.error('Failed to sync offline data');
            }
          } catch (error) {
            // console.error('Error syncing offline data:', error);
          }
        }
      }
    };

    syncOfflineData();
  }, [isOffline]);

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newEntry = {
      farmerDeliveryId: formData.get('farmerDeliveryId'),
      productId: formData.get('productId'),
      acceptedQuantity: formData.get('acceptedQuantity'),
      rejectedQuantity: formData.get('rejectedQuantity'),
      rejectionReasons: formData.get('rejectionReasons')?.split(',').map(s => s.trim()),
      notes: formData.get('notes'),
      timestamp: new Date().toISOString(),
    };

    if (isOffline) {
      const db = await openDB('qc-offline-db', 1, {
        upgrade(db) {
          db.createObjectStore('qc-entries', { autoIncrement: true });
        },
      });
      await db.add('qc-entries', newEntry);
      // console.log('Data saved locally');
    } else {
      try {
        const response = await fetch('/api/qc/entries', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(newEntry),
        });

        if (response.ok) {
          // console.log('Data saved to server');
        } else {
          // console.error('Failed to save data to server');
        }
      } catch (error) {
        // console.error('Error saving data to server:', error);
      }
    }
    e.currentTarget.reset();
  };

  return (
    <div>
      <h1>Quality Control</h1>
      {isOffline && <p>You are currently offline. Data will be synced when you are back online.</p>}
      <form onSubmit={handleFormSubmit}>
        <div>
          <label htmlFor="farmerDeliveryId">Farmer Delivery ID</label>
          <input id="farmerDeliveryId" name="farmerDeliveryId" type="text" required />
        </div>
        <div>
          <label htmlFor="productId">Product ID</label>
          <input id="productId" name="productId" type="text" required />
        </div>
        <div>
          <label htmlFor="acceptedQuantity">Accepted Quantity</label>
          <input id="acceptedQuantity" name="acceptedQuantity" type="number" required />
        </div>
        <div>
          <label htmlFor="rejectedQuantity">Rejected Quantity</label>
          <input id="rejectedQuantity" name="rejectedQuantity" type="number" required />
        </div>
        <div>
          <label htmlFor="rejectionReasons">Rejection Reasons (comma-separated)</label>
          <input id="rejectionReasons" name="rejectionReasons" type="text" />
        </div>
        <div>
          <label htmlFor="notes">Notes</label>
          <textarea id="notes" name="notes" />
        </div>
        <button type="submit">Submit</button>
      </form>
    </div>
  );
};

export default QCOffline;
