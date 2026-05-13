import React, { createContext, useContext, useEffect, useState } from "react";
import { User, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, sendPasswordResetEmail } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string, firstName?: string, lastName?: string, dateOfBirth?: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signInWithGoogle: async () => {},
  signInWithEmail: async () => {},
  signUpWithEmail: async () => {},
  resetPassword: async () => {},
  logout: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      const result = await signInWithPopup(auth, provider);
      // Check if user document exists in Firestore, create if not
      const userDocRef = doc(db, "users", result.user.uid);
      const userDoc = await getDoc(userDocRef);
      if (!userDoc.exists()) {
        const names = result.user.displayName ? result.user.displayName.split(" ") : [];
        const firstName = names[0] || "";
        const lastName = names.slice(1).join(" ") || "";
        await setDoc(userDocRef, {
          firstName,
          lastName,
          email: result.user.email,
          createdAt: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error("Error signing in with Google", error);
      throw error;
    }
  };

  const signInWithEmail = async (email: string, pass: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (error) {
       console.error("Error signing in with Email", error);
       throw error;
    }
  }

  const signUpWithEmail = async (email: string, pass: string, firstName?: string, lastName?: string, dateOfBirth?: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      if (firstName || lastName) {
        await updateProfile(userCredential.user, {
          displayName: `${firstName || ''} ${lastName || ''}`.trim()
        });
      }
      // Save data to Firestore
      await setDoc(doc(db, "users", userCredential.user.uid), {
        firstName: firstName || "",
        lastName: lastName || "",
        dateOfBirth: dateOfBirth || "",
        email: email,
        createdAt: new Date().toISOString()
      });
    } catch (error) {
       console.error("Error signing up with Email", error);
       throw error;
    }
  }

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      console.error("Error sending password reset email", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signInWithEmail, signUpWithEmail, resetPassword, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
