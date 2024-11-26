import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Card,
  CardContent,
  CardActions,
  IconButton,
  MenuItem,
  Chip,
  Paper,
  InputAdornment,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { collection, addDoc, deleteDoc, doc, updateDoc, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import ProjectTimer from '../components/time/ProjectTimer/ProjectTimer';
import ProjectList from '../components/projects/ProjectList';
import TimeEntriesList from '../components/time/TimeEntries/TimeEntriesList';

interface Project {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'completed' | 'on-hold';
  deadline: string;
  totalTime?: number;
  lastUpdated?: Timestamp;
  createdBy?: string;
  members?: string[];
  createdAt?: Timestamp;
}

const Projects = () => {
  const { currentUser } = useAuth();
  const location = useLocation();
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'active',
    deadline: '',
  });

  const fetchProjects = async () => {
    if (!currentUser) return;
    
    try {
      const projectsRef = collection(db, 'projects');
      const q = query(projectsRef, where('createdBy', '==', currentUser.uid));
      const querySnapshot = await getDocs(q);
      
      const fetchedProjects: Project[] = [];
      querySnapshot.forEach((doc) => {
        fetchedProjects.push({ id: doc.id, ...doc.data() } as Project);
      });
      
      setProjects(fetchedProjects);
    } catch (error) {
      console.error('Erreur lors de la récupération des projets:', error);
    }
  };

  const memoizedFetchProjects = useCallback(fetchProjects, [currentUser]);

  useEffect(() => {
    memoizedFetchProjects();
  }, [memoizedFetchProjects]);

  useEffect(() => {
    if (location.state?.openNewProject) {
      handleOpenDialog();
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  useEffect(() => {
    const filtered = projects.filter(project =>
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredProjects(filtered);
  }, [searchQuery, projects]);

  const handleOpenDialog = (project?: Project) => {
    if (project) {
      setEditingProject(project);
      setFormData({
        name: project.name,
        description: project.description,
        status: project.status,
        deadline: project.deadline,
      });
    } else {
      setEditingProject(null);
      setFormData({
        name: '',
        description: '',
        status: 'active',
        deadline: '',
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingProject(null);
  };

  const handleSubmit = async () => {
    if (!currentUser) return;

    try {
      if (editingProject) {
        await updateDoc(doc(db, 'projects', editingProject.id), {
          ...formData,
          lastUpdated: Timestamp.now(),
        });
      } else {
        await addDoc(collection(db, 'projects'), {
          ...formData,
          createdBy: currentUser.uid,
          members: [currentUser.uid],
          totalTime: 0,
          lastUpdated: Timestamp.now(),
          createdAt: Timestamp.now(),
        });
      }
      
      handleCloseDialog();
      fetchProjects();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du projet:', error);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce projet ?')) return;

    try {
      await deleteDoc(doc(db, 'projects', projectId));
      fetchProjects();
    } catch (error) {
      console.error('Erreur lors de la suppression du projet:', error);
    }
  };

  const handleEdit = (project: Project) => {
    handleOpenDialog(project);
  };

  const handleDelete = (projectId: string) => {
    handleDeleteProject(projectId);
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h4" component="h1">
          Projets
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Nouveau Projet
        </Button>
      </Box>

      <Box mb={3}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Rechercher un projet..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      <Grid container spacing={3}>
        {filteredProjects.map((project) => (
          <Grid item xs={12} key={project.id}>
            <Paper sx={{ p: 2 }}>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                <Typography variant="h6">{project.name}</Typography>
                <ProjectTimer 
                  projectId={project.id} 
                  projectName={project.name}
                  onTimeUpdate={fetchProjects}
                />
              </Box>
              <TimeEntriesList projectId={project.id} />
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingProject ? 'Modifier le projet' : 'Nouveau projet'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Nom du projet"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              margin="normal"
            />
            <TextField
              fullWidth
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              margin="normal"
              multiline
              rows={3}
            />
            <TextField
              fullWidth
              select
              label="Statut"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'completed' | 'on-hold' })}
              margin="normal"
            >
              <MenuItem value="active">Actif</MenuItem>
              <MenuItem value="completed">Terminé</MenuItem>
              <MenuItem value="on-hold">En pause</MenuItem>
            </TextField>
            <TextField
              fullWidth
              type="date"
              label="Date d'échéance"
              value={formData.deadline}
              onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
              margin="normal"
              InputLabelProps={{
                shrink: true,
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Annuler</Button>
          <Button onClick={handleSubmit} variant="contained" color="primary">
            {editingProject ? 'Mettre à jour' : 'Créer'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Projects;
