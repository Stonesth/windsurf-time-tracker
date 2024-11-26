import React, { createContext, useState, useContext, useEffect } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { userService } from '../services/userService';
import { User, UserRole } from '../types/user';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userRole: UserRole | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  userRole: null,
  loading: true,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setCurrentUser(user);
      
      if (user && user.email) {
        // Vérifier si c'est l'admin initial
        if (user.email === 'pierre.thonon@gmail.com') {
          setUserRole(UserRole.ADMIN);
          // Créer l'utilisateur admin s'il n'existe pas déjà
          try {
            const users = await userService.getAllUsers();
            if (!users.some(u => u.email === user.email)) {
              await userService.createUser(user.email, '', UserRole.ADMIN);
            }
            // Assurer que l'utilisateur de test existe
            await userService.ensureTestUserExists();
          } catch (error) {
            console.error('Erreur lors de la vérification/création des utilisateurs:', error);
          }
        } else {
          // Récupérer le rôle depuis Firestore
          try {
            const users = await userService.getAllUsers();
            const currentUserData = users.find(u => u.uid === user.uid);
            setUserRole(currentUserData?.role || null);
          } catch (error) {
            console.error('Error fetching user role:', error);
          }
        }
      } else {
        setUserRole(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userRole,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
