'use client'

import { useAuth } from '../context/FirebaseAuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function withAuth(Component) {
  return function ProtectedRoute(props) {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (!loading && !user) {
        router.push('/login');
      }
    }, [user, loading, router]);

    if (loading) {
      return <div>Loading...</div>; // Or your loading component
    }

    if (!user) {
      return null; // This prevents the protected content from flashing before redirect
    }

    return <Component {...props} />;
  };
}