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
        try {
          // Récupérer tous les utilisateurs
          const users = await userService.getAllUsers();
          let currentUserData = users.find(u => u.uid === user.uid);

          // Vérifier si c'est l'admin initial
          if (user.email === 'pierre.thonon@gmail.com') {
            setUserRole(UserRole.ADMIN);
            // Créer l'utilisateur admin s'il n'existe pas déjà
            if (!currentUserData) {
              await userService.createUserInFirestore(user.uid, user.email, UserRole.ADMIN);
              // Mettre à jour currentUserData
              currentUserData = (await userService.getAllUsers()).find(u => u.uid === user.uid);
            }
            // Assurer que l'utilisateur de test existe
            await userService.ensureTestUserExists();
          } else {
            // Pour les autres utilisateurs
            if (!currentUserData) {
              // Si l'utilisateur n'existe pas dans Firestore, le créer avec le rôle USER par défaut
              console.log('Création d\'un nouvel utilisateur dans Firestore:', user.email);
              await userService.createUserInFirestore(user.uid, user.email, UserRole.USER);
              // Mettre à jour currentUserData
              currentUserData = (await userService.getAllUsers()).find(u => u.uid === user.uid);
            }
          }
          
          // Mettre à jour le rôle
          setUserRole(currentUserData?.role || null);
        } catch (error) {
          console.error('Erreur lors de la gestion de l\'utilisateur:', error);
          setUserRole(null);
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
