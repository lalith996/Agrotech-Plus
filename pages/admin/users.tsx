
import { useState, useEffect } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { UserRole } from "@prisma/client"; // Assuming you have this enum

interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
}

const AdminUsersPage = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState('ALL');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        params.append('role', role);
        if (search) {
          params.append('search', search);
        }

        const { data } = await axios.get(`/api/admin/users?${params.toString()}`);
        setUsers(data.users);
      } catch (err) {
        setError('Failed to load users.');
        // console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    const timer = setTimeout(() => {
      fetchUsers();
    }, 500); // Debounce search

    return () => clearTimeout(timer);
  }, [role, search]);

  return (
    <div style={{ padding: '2rem' }}>
      <h1>User Management</h1>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
        <input 
          type="text" 
          placeholder="Search by name or email..." 
          value={search} 
          onChange={e => setSearch(e.target.value)} 
          style={{ flexGrow: 1, padding: '8px' }}
        />
        <select value={role} onChange={e => setRole(e.target.value)} style={{ padding: '8px' }}>
          <option value="ALL">All Roles</option>
          {Object.values(UserRole).map(roleName => (
            <option key={roleName} value={roleName}>{roleName}</option>
          ))}
        </select>
      </div>

      {/* User List */}
      {isLoading && <p>Loading users...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {!isLoading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {users.length > 0 ? users.map(user => (
            <div key={user.id} style={{ border: '1px solid #ddd', padding: '1rem', borderRadius: '8px', display: 'grid', gridTemplateColumns: '3fr 2fr 2fr 1fr', alignItems: 'center' }}>
              <div>
                <strong>{user.name}</strong>
                <p style={{ margin: 0, color: '#555' }}>{user.email}</p>
              </div>
              <div>
                <strong>Role:</strong> {user.role}
              </div>
              <div>
                <strong>Member Since:</strong> {new Date(user.createdAt).toLocaleDateString()}
              </div>
              <Link href={`/admin/users/${user.id}`}>Details</Link>
            </div>
          )) : <p>No users found with the current filters.</p>}
        </div>
      )}
    </div>
  );
};

export default AdminUsersPage;
