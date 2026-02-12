// app/settings/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  email: string;
  name?: string;
  created_at?: string;
}

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      const response = await fetch('/api/auth/user');
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        router.push('/login');
      }
    } catch (error) {
      console.error('Error fetching user:', error);
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = () => {
    // Redirect to Stack Auth's sign out endpoint
    window.location.href = '/handler/sign-out';
  };

  if (loading) {
    return (
      <div className="p-8">
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-semibold mb-6">Settings</h1>

      <div className="mb-8">
        <h2 className="text-lg font-medium mb-3">Account</h2>
        <div className="space-y-2">
          <div>
            <span className="text-gray-600">Email: </span>
            <span>{user.email}</span>
          </div>
          {user.name && (
            <div>
              <span className="text-gray-600">Name: </span>
              <span>{user.name}</span>
            </div>
          )}
          <div>
            <span className="text-gray-600">User ID: </span>
            <span className="font-mono text-sm">{user.id}</span>
          </div>
          {user.created_at && (
            <div>
              <span className="text-gray-600">Member since: </span>
              <span>
                {new Date(user.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
            </div>
          )}
        </div>
      </div>

      <button
        onClick={handleSignOut}
        disabled={signingOut}
        className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {signingOut ? 'Signing out...' : 'Sign out'}
      </button>
    </div>
  );
}