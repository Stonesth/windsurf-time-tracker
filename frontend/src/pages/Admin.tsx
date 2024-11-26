import React from 'react';
import { Navigate } from 'react-router-dom';
import { Container } from '@mui/material';
import { UserManagement } from '../components/Admin/UserManagement';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types/user';

export const AdminPage: React.FC = () => {
  const { userRole } = useAuth();

  // Rediriger si l'utilisateur n'est pas admin
  if (userRole !== UserRole.ADMIN) {
    return <Navigate to="/" replace />;
  }

  return (
    <Container maxWidth="lg">
      <UserManagement />
    </Container>
  );
};
