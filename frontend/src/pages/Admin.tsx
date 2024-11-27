import React from 'react';
import { Navigate } from 'react-router-dom';
import { Container, Typography, Box, Divider } from '@mui/material';
import { UserManagement } from '../components/Admin/UserManagement';
import { SiteSettings } from '../components/Admin/SiteSettings';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types/user';

export const AdminPage: React.FC = () => {
  const { userRole } = useAuth();

  // Rediriger si l'utilisateur n'est pas admin
  if (userRole !== UserRole.ADMIN) {
    return <Navigate to="/" replace />;
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Administration
      </Typography>
      
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          Gestion des utilisateurs
        </Typography>
        <Divider sx={{ mb: 3 }} />
        <UserManagement />
      </Box>

      <SiteSettings />
    </Container>
  );
};
