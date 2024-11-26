import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  updateProfile,
  AuthError 
} from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';

interface UserRegistration {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

const getErrorMessage = (error: any) => {
  console.error('Auth Error:', error);

  // Erreurs d'authentification Firebase
  if (error.code === 'auth/email-already-in-use') {
    return 'Cet email est déjà utilisé. Veuillez vous connecter ou utiliser un autre email.';
  }
  if (error.code === 'auth/weak-password') {
    return 'Le mot de passe doit contenir au moins 6 caractères.';
  }
  if (error.code === 'auth/invalid-email') {
    return 'L\'adresse email n\'est pas valide.';
  }
  if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
    return 'Email ou mot de passe incorrect.';
  }
  if (error.code === 'auth/invalid-credential') {
    return 'Identifiants invalides. Veuillez vérifier votre email et mot de passe.';
  }
  if (error.code === 'auth/too-many-requests') {
    return 'Trop de tentatives de connexion. Veuillez réessayer plus tard.';
  }

  // Erreurs Firestore
  if (error.code === 'permission-denied') {
    console.warn('Firestore permission denied - this is expected until rules are set');
    return 'Erreur d\'accès à la base de données. Les données seront synchronisées ultérieurement.';
  }

  // Erreur par défaut
  return error.message || 'Une erreur est survenue. Veuillez réessayer.';
};

export const authService = {
  // User Registration
  register: async ({ email, password, firstName, lastName }: UserRegistration) => {
    console.log('Starting registration process for:', email);
    
    try {
      // Create user in Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      console.log('User created successfully:', user.uid);

      try {
        // Update user profile
        await updateProfile(user, {
          displayName: `${firstName} ${lastName}`
        });
        console.log('User profile updated successfully');

        // Try to create user document in Firestore
        try {
          await setDoc(doc(db, 'users', user.uid), {
            uid: user.uid,
            email,
            firstName,
            lastName,
            role: 'user',
            createdAt: new Date().toISOString()
          });
          console.log('User document created in Firestore');
        } catch (firestoreError: any) {
          console.error('Firestore error:', firestoreError);
          // Only throw if it's not a permission error (which we expect until rules are set)
          if (firestoreError.code !== 'permission-denied') {
            throw firestoreError;
          }
        }

        return user;
      } catch (error) {
        console.error('Profile update error:', error);
        // If profile update fails, still return the user
        return user;
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      const message = getErrorMessage(error);
      throw new Error(message);
    }
  },

  // User Login
  login: async (email: string, password: string) => {
    console.log('Starting login process for:', email);
    
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log('Login successful for user:', userCredential.user.uid);
      return userCredential.user;
    } catch (error: any) {
      console.error('Login error:', error);
      const message = getErrorMessage(error);
      throw new Error(message);
    }
  },

  // User Logout
  logout: async () => {
    console.log('Starting logout process');
    
    try {
      await signOut(auth);
      console.log('Logout successful');
    } catch (error: any) {
      console.error('Logout error:', error);
      const message = getErrorMessage(error);
      throw new Error(message);
    }
  }
};
