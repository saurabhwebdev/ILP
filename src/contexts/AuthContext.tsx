import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { 
  User, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged, 
  signInWithPopup,
  GoogleAuthProvider 
} from "firebase/auth";
import { auth, googleProvider, db } from "../lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { doc, getDoc, setDoc, serverTimestamp, updateDoc } from "firebase/firestore";

interface AuthContextType {
  currentUser: User | null;
  userRole: string | null;
  pageAccess: Record<string, boolean> | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  checkPageAccess: (page: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [pageAccess, setPageAccess] = useState<Record<string, boolean> | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  
  // Create a ref to track the latest userRole value
  const userRoleRef = useRef<string | null>(null);
  
  // Custom function to update both state and ref at the same time
  const setUserRoleWithRef = (role: string | null) => {
    userRoleRef.current = role; // Update ref immediately
    setUserRole(role); // Update state
  };

  // Fetch user role and access permissions
  const fetchUserRoleAndAccess = async (user: User | null) => {
    console.log("fetchUserRoleAndAccess called with user:", user?.uid);
    if (!user) {
      console.log("No user provided to fetchUserRoleAndAccess, returning early");
      return;
    }

    try {
      console.log("Fetching user role for:", user.uid);
      
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        console.log("User document found:", userData);
        
        const userRole = userData.role || "USER";
        console.log("Setting user role to:", userRole);
        setUserRoleWithRef(userRole); // Use the custom function
        
        // Set page access based on role - creating proper Record<string, boolean>
        if (userRole === "ADMIN") {
          console.log("User is ADMIN, setting full access");
          setPageAccess({
            "dashboard": true,
            "admin": true,
            "settings": true,
            "truck-entry": true,
            "transporter-collaboration": true,
            "shift-handover": true,
            "weigh-bridge": true,
            "dock": true,
            "profile": true
          });
        } else {
          console.log("User is regular user, setting standard access");
          setPageAccess({
            "dashboard": true,
            "settings": true,
            "profile": true
          });
        }
      } else {
        console.warn("User document does not exist in Firestore, using default USER role");
        setUserRoleWithRef("USER"); // Use the custom function
        setPageAccess({
          "dashboard": true,
          "settings": true,
          "profile": true
        });
        
        // Attempt to create a default user document if it doesn't exist
        try {
          console.log("Creating default user document");
          await setDoc(userDocRef, {
            email: user.email,
            displayName: user.displayName || "User",
            role: "USER",
            createdAt: serverTimestamp(),
            lastLoginAt: serverTimestamp()
          });
        } catch (createError) {
          console.error("Error creating default user document:", createError);
        }
      }
    } catch (error) {
      console.error("Error fetching user role and access:", error);
      console.log("Setting default USER role due to error");
      setUserRoleWithRef("USER"); // Use the custom function
      setPageAccess({
        "dashboard": true,
        "settings": true,
        "profile": true
      });
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log("Auth state changed, user:", user?.uid);
      setCurrentUser(user);
      
      if (user) {
        // Update last login time without affecting other fields
        const userRef = doc(db, "users", user.uid);
        try {
          // First check if the user document exists
          const userSnapshot = await getDoc(userRef);
          
          if (userSnapshot.exists()) {
            console.log("User document exists during auth state change:", userSnapshot.data());
            // Only update lastLoginAt for existing users
            await setDoc(userRef, { 
              lastLoginAt: serverTimestamp() 
            }, { merge: true });
          } else {
            console.log("Creating new user document during auth state change");
            // Create document for new users with USER role
            await setDoc(userRef, {
              email: user.email,
              displayName: user.displayName || "User",
              role: "USER",
              createdAt: serverTimestamp(),
              lastLoginAt: serverTimestamp()
            });
          }
        } catch (error) {
          console.error("Error updating user document:", error);
        }
        
        // Fetch user role and access permissions
        console.log("About to fetch user role and access in auth state change");
        fetchUserRoleAndAccess(user)
          .finally(() => {
            // Use the ref to get the latest value
            console.log("Finished fetching user role and access, userRole:", userRoleRef.current);
            setLoading(false);
          });
      } else {
        console.log("User logged out or no user detected");
        setUserRoleWithRef(null); // Use the custom function
        setPageAccess(null);
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const signUp = async (email: string, password: string) => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      
      // Create user document with USER role
      const userRef = doc(db, "users", result.user.uid);
      await setDoc(userRef, {
        email: result.user.email,
        displayName: result.user.displayName || email.split('@')[0],
        role: "USER",
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp()
      });
      
      toast({
        title: "Account created successfully",
        description: "Welcome to ILP!",
      });
    } catch (error: any) {
      toast({
        title: "Error creating account",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast({
        title: "Signed in successfully",
        description: "Welcome back!",
      });
    } catch (error: any) {
      toast({
        title: "Sign in failed",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const signInWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      
      // Check if user exists, if not create with USER role
      const userRef = doc(db, "users", result.user.uid);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        // Only for new users, set role to USER
        await setDoc(userRef, {
          email: result.user.email,
          displayName: result.user.displayName || "Google User",
          role: "USER",
          createdAt: serverTimestamp(),
          lastLoginAt: serverTimestamp(),
          photoURL: result.user.photoURL
        });
      } else {
        // For existing users, just update the login time without changing role
        await setDoc(userRef, { 
          lastLoginAt: serverTimestamp() 
        }, { merge: true });
      }
      
      toast({
        title: "Signed in successfully",
        description: "Welcome to ILP!",
      });
    } catch (error: any) {
      toast({
        title: "Google sign in failed",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      toast({
        title: "Signed out successfully",
      });
    } catch (error: any) {
      toast({
        title: "Sign out failed",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  // Helper function to check if user has access to a specific page
  const checkPageAccess = (page: string): boolean => {
    if (!currentUser || !pageAccess) return false;
    if (userRole === "ADMIN") return true;
    return pageAccess[page] === true;
  };

  const value = {
    currentUser,
    userRole,
    pageAccess,
    loading,
    signUp,
    signIn,
    signInWithGoogle,
    logout,
    checkPageAccess,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
