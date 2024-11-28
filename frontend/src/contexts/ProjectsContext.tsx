import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './AuthContext';

interface Project {
  id: string;
  name: string;
  userId: string;
}

interface ProjectsContextType {
  projects: Project[];
  loading: boolean;
  error: string | null;
}

const ProjectsContext = createContext<ProjectsContextType>({
  projects: [],
  loading: true,
  error: null,
});

export const useProjects = () => useContext(ProjectsContext);

export const ProjectsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { currentUser } = useAuth();

  useEffect(() => {
    if (!currentUser) {
      setProjects([]);
      setLoading(false);
      return;
    }

    const q = query(collection(db, 'projects'));
    
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const projectsList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Project[];

        setProjects(projectsList);
        setLoading(false);
      },
      (err) => {
        console.error('Erreur lors de la récupération des projets:', err);
        setError('Erreur lors du chargement des projets');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  return (
    <ProjectsContext.Provider value={{ projects, loading, error }}>
      {children}
    </ProjectsContext.Provider>
  );
};
