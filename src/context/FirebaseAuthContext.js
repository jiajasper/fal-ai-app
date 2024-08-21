import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, createUserDocument, getUserCredits } from '../firebase/clientApp';
import { useRouter } from 'next/navigation';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthContextProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [credits, setCredits] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);
        await createUserDocument(user);
        const userCredits = await getUserCredits(user.uid);
        setCredits(parseInt(userCredits) || 0);
      } else {
        setUser(null);
        setCredits(0);
        router.push('/login');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const updateCredits = async () => {
    if (user) {
      const userCredits = await getUserCredits(user.uid);
      setCredits(parseInt(userCredits) || 0);
    }
  };

  return (
    <AuthContext.Provider value={{ user, credits, updateCredits }}>
      {loading ? <div>Loading...</div> : children}
    </AuthContext.Provider>
  );
};