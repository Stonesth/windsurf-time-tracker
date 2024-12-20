import React from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Divider,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import TimerIcon from '@mui/icons-material/Timer';
import EditIcon from '@mui/icons-material/Edit';
import { useAuth } from '../../contexts/AuthContext';
import { canWrite, canManageProjects } from '../../utils/roleUtils';

// Types temporaires
interface Project {
  id: string;
  name: string;
  description?: string;
  status: 'active' | 'completed' | 'on-hold';
  deadline: string;
  totalTime?: number;
  lastUpdated?: any;
  createdBy?: string;
  members?: string[];
  createdAt?: any;
}

interface ProjectListProps {
  onTimeUpdate: () => void;
}

export const ProjectList: React.FC<ProjectListProps> = ({ onTimeUpdate }) => {
  const { userRole } = useAuth();

  // Données temporaires
  const projects: Project[] = [
    {
      id: '1',
      name: 'Projet A',
      description: 'Développement frontend',
      status: 'active',
      deadline: '2024-03-16T14:30:00.000Z',
      totalTime: 14400, // 4 heures en secondes
    },
    {
      id: '2',
      name: 'Projet B',
      description: 'Design UI/UX',
      status: 'active',
      deadline: '2024-03-16T14:30:00.000Z',
      totalTime: 28800, // 8 heures en secondes
    },
    {
      id: '3',
      name: 'Projet C',
      description: 'Tests et débogage',
      status: 'completed',
      deadline: '2024-03-16T14:30:00.000Z',
      totalTime: 7200, // 2 heures en secondes
    },
  ];

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const getStatusColor = (status: Project['status']) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'completed':
        return 'primary';
      case 'on-hold':
        return 'default';
      default:
        return 'default';
    }
  };

  const handleStartTimer = (projectId: string) => {
    // TODO: Implémenter le démarrage du timer
    console.log('Démarrer le timer pour le projet:', projectId);
  };

  const handleEditProject = (projectId: string) => {
    // TODO: Implémenter l'édition du projet
    console.log('Éditer le projet:', projectId);
  };

  const handleDeleteProject = (projectId: string) => {
    // TODO: Implémenter la suppression du projet
    console.log('Supprimer le projet:', projectId);
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Projets
      </Typography>
      <List>
        {projects.map((project, index) => (
          <React.Fragment key={project.id}>
            {index > 0 && <Divider />}
            <ListItem>
              <ListItemText
                primary={
                  <Box display="flex" alignItems="center" gap={1}>
                    {project.name}
                    <Chip
                      label={project.status}
                      size="small"
                      color={getStatusColor(project.status)}
                    />
                  </Box>
                }
                secondary={
                  <>
                    <Typography
                      component="span"
                      variant="body2"
                      color="text.primary"
                    >
                      {project.description}
                    </Typography>
                    <br />
                    {project.deadline && (
                      <Typography
                        component="span"
                        variant="body2"
                        color="text.secondary"
                      >
                        Date limite: {project.deadline}
                      </Typography>
                    )}
                    {project.totalTime && (
                      <Typography
                        component="span"
                        variant="body2"
                        color="text.secondary"
                      >
                        Temps total: {formatTime(project.totalTime)}
                      </Typography>
                    )}
                  </>
                }
              />
              <ListItemSecondaryAction>
                <IconButton
                  edge="end"
                  aria-label="start timer"
                  onClick={() => handleStartTimer(project.id)}
                  sx={{ mr: 1 }}
                  disabled={!canWrite(userRole)}
                >
                  <TimerIcon />
                </IconButton>
                {canManageProjects(userRole) && (
                  <>
                    <IconButton
                      edge="end"
                      aria-label="edit"
                      onClick={() => handleEditProject(project.id)}
                      sx={{ mr: 1 }}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      edge="end"
                      aria-label="delete"
                      onClick={() => handleDeleteProject(project.id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </>
                )}
              </ListItemSecondaryAction>
            </ListItem>
          </React.Fragment>
        ))}
      </List>
    </Box>
  );
};

export default ProjectList;
