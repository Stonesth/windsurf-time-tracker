import { db, auth } from '../lib/firebase';
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import { User, UserRole, UserWithStatus } from '../types/user';
import { createUserWithEmailAndPassword } from 'firebase/auth';

const USERS_COLLECTION = 'users';

export const userService = {
  // Vérifier si un utilisateur existe déjà
  async checkUserExists(email: string): Promise<boolean> {
    try {
      const q = query(collection(db, USERS_COLLECTION), where("email", "==", email));
      const querySnapshot = await getDocs(q);
      return !querySnapshot.empty;
    } catch (error) {
      console.error('Erreur lors de la vérification de l\'existence de l\'utilisateur:', error);
      throw error;
    }
  },

  // Créer un utilisateur dans Firestore uniquement
  async createUserInFirestore(uid: string, email: string, role: UserRole): Promise<User> {
    try {
      console.log('Création d\'un utilisateur dans Firestore:', { uid, email, role });
      
      const user: User = {
        uid,
        email,
        role,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        firstName: '',
        lastName: ''
      };

      await setDoc(doc(db, USERS_COLLECTION, uid), user);
      console.log('Utilisateur créé dans Firestore avec succès:', user);
      return user;
    } catch (error) {
      console.error('Erreur lors de la création de l\'utilisateur dans Firestore:', error);
      throw error;
    }
  },

  // Créer un nouvel utilisateur
  async createUser(email: string, password: string, role: UserRole): Promise<User> {
    try {
      console.log('Création d\'un nouvel utilisateur:', { email, role });

      // Vérifier si l'utilisateur existe déjà
      const exists = await this.checkUserExists(email);
      if (exists) {
        console.error('Un utilisateur avec cet email existe déjà:', email);
        throw new Error('Un utilisateur avec cet email existe déjà');
      }

      let uid: string;
      let authUser;

      // Pour l'admin initial
      if (email === 'pierre.thonon@gmail.com') {
        const currentUser = auth.currentUser;
        if (!currentUser) throw new Error('No authenticated user');
        uid = currentUser.uid;
      } else {
        try {
          // Créer l'utilisateur dans Firebase Auth
          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          authUser = userCredential.user;
          uid = authUser.uid;
          console.log('Utilisateur créé dans Firebase Auth:', { uid, email });
        } catch (error: any) {
          console.error('Erreur lors de la création de l\'utilisateur dans Firebase Auth:', error);
          if (error.code === 'auth/email-already-in-use') {
            throw new Error('Cet email est déjà utilisé dans Firebase Auth');
          }
          throw error;
        }
      }

      // Créer l'utilisateur dans Firestore
      const user: User = {
        uid,
        email,
        role,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        firstName: '',
        lastName: ''
      };

      console.log('Sauvegarde de l\'utilisateur dans Firestore:', user);
      await setDoc(doc(db, USERS_COLLECTION, uid), user);

      // Vérifier que l'utilisateur a bien été créé
      const userDoc = await getDoc(doc(db, USERS_COLLECTION, uid));
      if (!userDoc.exists()) {
        console.error('L\'utilisateur n\'a pas été créé dans Firestore');
        throw new Error('Erreur lors de la création de l\'utilisateur');
      }

      console.log('Utilisateur créé avec succès:', userDoc.data());
      
      // Recharger la liste des utilisateurs pour vérifier
      const allUsers = await this.getAllUsers();
      console.log('Liste mise à jour des utilisateurs après création:', allUsers);
      
      return user;
    } catch (error) {
      console.error('Erreur lors de la création de l\'utilisateur:', error);
      throw error;
    }
  },

  // Récupérer tous les utilisateurs
  async getAllUsers(): Promise<UserWithStatus[]> {
    try {
      console.log('Récupération de tous les utilisateurs...');
      
      // Récupérer tous les documents de la collection users
      const querySnapshot = await getDocs(collection(db, USERS_COLLECTION));
      console.log('Nombre total d\'utilisateurs trouvés:', querySnapshot.size);
      
      // Convertir les documents en objets User
      const users = querySnapshot.docs.map(doc => {
        const data = doc.data();
        console.log('Document ID:', doc.id);
        console.log('User data complet:', JSON.stringify(data, null, 2));
        
        // Vérifier que les champs requis sont présents
        if (!data.email || !data.role) {
          console.error('Document utilisateur invalide:', doc.id, data);
          return null;
        }

        return {
          uid: doc.id,
          email: data.email,
          role: data.role,
          createdAt: data.createdAt || new Date().toISOString(),
          lastLogin: data.lastLogin,
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          displayName: data.displayName,
        } as User;
      }).filter(user => user !== null) as User[];  // Filtrer les utilisateurs invalides
      
      // Identifier le dernier admin
      const admins = users.filter(user => user.role === UserRole.ADMIN);
      const isLastAdmin = admins.length === 1;
      
      // Ajouter le statut isLastAdmin
      const usersWithStatus = users.map(user => ({
        ...user,
        isLastAdmin: isLastAdmin && user.role === UserRole.ADMIN
      }));

      console.log('Liste complète des utilisateurs:', JSON.stringify(usersWithStatus, null, 2));
      return usersWithStatus;
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
