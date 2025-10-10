import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

const FarmerProfile = () => {
  const { data: session } = useSession();
  const [farmName, setFarmName] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFarmerData = async () => {
      if (session) {
        try {
          const response = await fetch('/api/farmer/profile');
          if (response.ok) {
            const data = await response.json();
            setFarmName(data.farmName || '');
            setLocation(data.location || '');
            setDescription(data.description || '');
            setPhone(data.phone || '');
          } else {
            setError('Failed to fetch farmer data.');
          }
        } catch (error) {
          setError('An error occurred while fetching farmer data.');
          // console.error('Error fetching farmer data:', error);
        } finally {
          setIsLoading(false);
        }
      }
    };
    fetchFarmerData();
  }, [session]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    try {
      const response = await fetch('/api/farmer/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          farmName,
          location,
          description,
          phone,
        }),
      });
      if (response.ok) {
        // You can add a success message here, e.g., using a toast notification
        // console.log('Profile updated successfully');
      } else {
        const data = await response.json();
        setError(data.message || 'Failed to update profile');
      }
    } catch (error) {
      setError('An error occurred while updating the profile.');
      // console.error('Error updating profile:', error);
    }
  };

  if (!session && isLoading) {
    return <div>Loading...</div>;
  }
  
  if (!session) {
      return <div>Please log in to view your profile.</div>
  }

  if (error) {
      return <div>Error: {error}</div>
  }

  return (
    <div>
      <h1>Farmer Profile</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="farmName">Farm Name</label>
          <input
            id="farmName"
            type="text"
            value={farmName}
            onChange={(e) => setFarmName(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="location">Location</label>
          <input
            id="location"
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="phone">Phone</label>
          <input
            id="phone"
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        <button type="submit">Save</button>
      </form>
    </div>
  );
};

export default FarmerProfile;
