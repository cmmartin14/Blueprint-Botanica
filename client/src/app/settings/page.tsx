// app/settings/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { deleteUserAccount } from '@/actions/userActions';

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
  const [deleting, setDeleting] = useState(false);
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

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to delete your account? This action is permanent and will delete all your garden projects.'
    );

    if (!confirmed) return;

    setDeleting(true);
    try {
      await deleteUserAccount();
      // If we reach here, the action finished without throwing (though redirect usually throws)
      router.push('/');
    } catch (error: any) {
      // In Next.js, redirect() throws an error that is caught here.
      // If the error is a redirect, we shouldn't show an alert.
      if (error?.message === 'NEXT_REDIRECT' || error?.digest?.includes('NEXT_REDIRECT')) {
        return;
      }
      
      console.error('Error deleting account:', error);
      alert('Failed to delete account. Please try again.');
      setDeleting(false);
    }
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

      <div className="flex flex-col gap-4 items-start">
        <button
          onClick={handleSignOut}
          disabled={signingOut || deleting}
          className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {signingOut ? 'Signing out...' : 'Sign out'}
        </button>

        <div className="mt-12 pt-8 border-t border-red-100 w-full">
          <h2 className="text-lg font-medium text-red-600 mb-4">Danger Zone</h2>
          <button
            onClick={handleDeleteAccount}
            disabled={deleting || signingOut}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {deleting ? 'Deleting account...' : 'Delete Account'}
          </button>
        </div>
      </div>
    </div>
  );
}