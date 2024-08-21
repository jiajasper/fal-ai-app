
import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc, updateDoc } from "firebase/firestore";

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: "focusdiff-55eaf.firebaseapp.com",
    projectId: "focusdiff-55eaf",
    storageBucket: "focusdiff-55eaf.appspot.com",
    messagingSenderId: "201183522295",
    appId: "1:201183522295:web:9607ed7de6d883bb6492f2",
    measurementId: "G-FQTMRS3Y7H"
  };

// Initialize Firebase
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

const auth = getAuth(app);
const db = getFirestore(app);

// Helper function to create a new user document
export const createUserDocument = async (user, additionalData) => {
  if (!user) return;

  const userRef = doc(db, 'users', user.uid);
  const snapshot = await getDoc(userRef);

  if (!snapshot.exists()) {
    const { email } = user;
    const createdAt = new Date();

    try {
      await setDoc(userRef, {
        email,
        createdAt,
        credits_remaining: 20,
        ...additionalData
      });
    } catch (error) {
      console.error("Error creating user document", error);
    }
  }
};

export const updateUserCredits = async (userId, creditsToAdd) => {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const currentCredits = parseInt(userSnap.data().credits_remaining) || 0;
      const newCredits = Math.max(0, currentCredits + parseInt(creditsToAdd));
      await updateDoc(userRef, { credits_remaining: newCredits });
      return newCredits;
    } else {
      console.error("User document does not exist");
      return 0;
    }
  };
  
  // Helper function to get user's credit balance
  export const getUserCredits = async (userId) => {
    const userRef = doc(db, 'users', userId);
    const snapshot = await getDoc(userRef);
  
    if (snapshot.exists()) {
      return parseInt(snapshot.data().credits_remaining) || 0;
    }
  
    return 0;
  };
  

export { app, auth, db };