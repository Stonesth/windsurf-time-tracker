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
  Collapse
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
import { canWrite, canManageProjects } from '../utils/roleUtils';

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
  const { currentUser, userRole } = useAuth();
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
  const [formError, setFormError] = useState<string>('');
  const [expandedProjects, setExpandedProjects] = useState<string[]>([]);
  const [showSearch, setShowSearch] = useState(false);

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

  const isProjectNameUnique = (name: string, currentProjectId?: string): boolean => {
    return !projects.some(project => 
      project.name.toLowerCase() === name.toLowerCase() && project.id !== currentProjectId
    );
  };

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
    setFormError('');

    // Vérifier si le nom est vide
    if (!formData.name.trim()) {
      setFormError('Le nom du projet est requis');
      return;
    }

    // Vérifier si le nom est unique
    if (!isProjectNameUnique(formData.name, editingProject?.id)) {
      setFormError('Un projet avec ce nom existe déjà');
      return;
    }

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

  const formatTime = (time: number) => {
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = time % 60;
    return `${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;
  };

  const toggleProjectExpansion = (projectId: string) => {
    setExpandedProjects(prev => 
      prev.includes(projectId) 
        ? prev.filter(id => id !== projectId)
        : [...prev, projectId]
    );
  };

  const isProjectExpanded = (projectId: string) => expandedProjects.includes(projectId);

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h4" component="h1">
          Projets
        </Typography>
        <Box display="flex" gap={2}>
          <IconButton 
            onClick={() => setShowSearch(!showSearch)}
            color={showSearch ? "primary" : "default"}
          >
            <SearchIcon />
          </IconButton>
          {canWrite(userRole) && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
            >
              Nouveau Projet
            </Button>
          )}
        </Box>
      </Box>

      <Collapse in={showSearch}>
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
      </Collapse>

      <Grid container spacing={3}>
        {filteredProjects.map((project) => (
          <Grid item xs={12} key={project.id}>
            <Paper 
              sx={{ 
                p: 2,
                cursor: 'pointer',
              }}
            >
              {/* En-tête du projet toujours visible */}
              <Box 
                display="flex" 
                alignItems="center" 
                justifyContent="space-between"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleProjectExpansion(project.id);
                }}
                sx={{ cursor: 'pointer' }}
              >
                <Box display="flex" alignItems="center" gap={2}>
                  <Typography variant="h6">{project.name}</Typography>
                  <Chip
                    label={project.status}
                    size="small"
                    color={project.status === 'active' ? 'success' : project.status === 'completed' ? 'primary' : 'default'}
                  />
                </Box>
                <Box display="flex" alignItems="center" gap={1}>
                  <ProjectTimer 
                    projectId={project.id} 
                    projectName={project.name}
                    onTimeUpdate={fetchProjects}
                  />
                  {canManageProjects(userRole) && (
                    <>
                      <IconButton 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(project);
                        }} 
                        color="primary" 
                        size="small"
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(project.id);
                        }} 
                        color="error" 
                        size="small"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </>
                  )}
                </Box>
              </Box>

              {/* Contenu détaillé du projet */}
              <Collapse in={isProjectExpanded(project.id)}>
                <Box mt={2} onClick={(e) => e.stopPropagation()}>
                  <Box mb={2}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Échéance: {new Date(project.deadline).toLocaleDateString()}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {project.description}
                    </Typography>
                  </Box>

                  <Box mb={2}>
                    <Typography variant="body2" color="text.secondary">
                      Temps total: {formatTime(project.totalTime || 0)}
                    </Typography>
                  </Box>

                  <TimeEntriesList projectId={project.id} />
                </Box>
              </Collapse>
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
              onChange={(e) => {
                setFormData({ ...formData, name: e.target.value });
                setFormError('');
              }}
              margin="normal"
              error={!!formError}
              helperText={formError}
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
