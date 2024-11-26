import { db, auth } from '../lib/firebase';
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import { User, UserRole, UserWithStatus } from '../types/user';
import { createUserWithEmailAndPassword } from 'firebase/auth';

const USERS_COLLECTION = 'users';

export const userService = {
  // Créer un nouvel utilisateur
  async createUser(email: string, password: string, role: UserRole): Promise<User> {
    try {
      console.log('Creating user:', { email, role });
      let uid: string;
      
      if (email === 'pierre.thonon@gmail.com') {
        // Pour l'admin initial, utiliser l'UID existant
        const currentUser = auth.currentUser;
        if (!currentUser) throw new Error('No authenticated user');
        uid = currentUser.uid;
      } else {
        // Pour les autres utilisateurs, créer un nouveau compte
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        uid = userCredential.user.uid;
      }

      const user: User = {
        uid,
        email,
        role,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
      };

      console.log('Saving user data:', user);
      await setDoc(doc(db, USERS_COLLECTION, uid), user);
      return user;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  },

  // Récupérer tous les utilisateurs
  async getAllUsers(): Promise<UserWithStatus[]> {
    try {
      console.log('Fetching all users...');
      const querySnapshot = await getDocs(collection(db, USERS_COLLECTION));
      console.log('Nombre total d\'utilisateurs trouvés:', querySnapshot.size);
      
      const users = querySnapshot.docs.map(doc => {
        const data = doc.data();
        console.log('Document ID:', doc.id);
        console.log('User data complet:', JSON.stringify(data, null, 2));
        
        return {
          uid: doc.id,
          email: data.email,
          role: data.role,
          createdAt: data.createdAt,
          lastLogin: data.lastLogin,
          displayName: data.displayName,
          firstName: data.firstName,
          lastName: data.lastName
        } as User;
      });
      
      console.log('Liste complète des utilisateurs:', JSON.stringify(users, null, 2));
      return users.map(user => ({ ...user, online: false }));
    } catch (error) {
      console.error('Erreur lors de la récupération des utilisateurs:', error);
      throw error;
    }
  },

  // Vérifier si un utilisateur existe par email
  async getUserByEmail(email: string): Promise<User | null> {
    try {
      const users = await this.getAllUsers();
      return users.find(user => user.email === email) || null;
    } catch (error) {
      console.error('Erreur lors de la recherche de l\'utilisateur par email:', error);
      throw error;
    }
  },

  // Créer l'utilisateur de test si nécessaire
  async ensureTestUserExists() {
    try {
      const testEmail = 'thononpierre@yahoo.fr';
      const existingUser = await this.getUserByEmail(testEmail);
      
      if (!existingUser) {
        console.log('Création de l\'utilisateur de test:', testEmail);
        const user: User = {
          uid: 'test-user-id',
          email: testEmail,
          role: UserRole.USER,
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString(),
          firstName: 'Pierre',
          lastName: 'Thonon'
        };
        
        await setDoc(doc(db, USERS_COLLECTION, user.uid), user);
        console.log('Utilisateur de test créé avec succès');
      } else {
        console.log('L\'utilisateur de test existe déjà:', existingUser);
      }
    } catch (error) {
      console.error('Erreur lors de la création de l\'utilisateur de test:', error);
      throw error;
    }
  },

  // Mettre à jour le rôle d'un utilisateur
  async updateUserRole(uid: string, newRole: UserRole): Promise<void> {
    try {
      // Vérifier qu'on ne supprime pas le dernier admin
      if (newRole !== UserRole.ADMIN) {
        const users = await this.getAllUsers();
        const admins = users.filter(user => user.role === UserRole.ADMIN);
        if (admins.length === 1 && admins[0].uid === uid) {
          throw new Error('Cannot change role of the last admin');
        }
      }

      await updateDoc(doc(db, USERS_COLLECTION, uid), {
        role: newRole
      });
    } catch (error) {
      console.error('Error updating user role:', error);
      throw error;
    }
  },

  // Supprimer un utilisateur
  async deleteUser(uid: string): Promise<void> {
    try {
      // Vérifier qu'on ne supprime pas le dernier admin
      const user = await getDoc(doc(db, USERS_COLLECTION, uid));
      if (!user.exists()) throw new Error('User not found');

      const userData = user.data() as User;
      if (userData.role === UserRole.ADMIN) {
        const users = await this.getAllUsers();
        const admins = users.filter(user => user.role === UserRole.ADMIN);
        if (admins.length === 1) {
          throw new Error('Cannot delete the last admin');
        }
      }

      await deleteDoc(doc(db, USERS_COLLECTION, uid));
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }
};
