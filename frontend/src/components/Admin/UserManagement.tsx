import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Typography,
  FormControl,
  InputLabel,
  Alert,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { userService } from '../../services/userService';
import { User, UserRole, UserWithStatus, RolePermissions } from '../../types/user';

export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<UserWithStatus[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithStatus | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: UserRole.USER,
  });
  const [error, setError] = useState<string>('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const loadedUsers = await userService.getAllUsers();
      setUsers(loadedUsers);
    } catch (error) {
      setError('Erreur lors du chargement des utilisateurs');
    }
  };

  const handleOpenDialog = (user?: UserWithStatus) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        email: user.email,
        password: '',
        role: user.role,
      });
    } else {
      setEditingUser(null);
      setFormData({
        email: '',
        password: '',
        role: UserRole.USER,
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingUser(null);
    setError('');
  };

  const handleSubmit = async () => {
    try {
      if (editingUser) {
        await userService.updateUserRole(editingUser.uid, formData.role);
      } else {
        await userService.createUser(formData.email, formData.password, formData.role);
      }
      handleCloseDialog();
      loadUsers();
    } catch (error: any) {
      setError(error.message || 'Une erreur est survenue');
    }
  };

  const handleDelete = async (user: UserWithStatus) => {
    try {
      await userService.deleteUser(user.uid);
      loadUsers();
    } catch (error: any) {
      setError(error.message || 'Erreur lors de la suppression');
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Gestion des Utilisateurs</Typography>
        <Button variant="contained" color="primary" onClick={() => handleOpenDialog()}>
          Ajouter un Utilisateur
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Email</TableCell>
              <TableCell>Rôle</TableCell>
              <TableCell>Description du Rôle</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.uid}>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.role}</TableCell>
                <TableCell>{RolePermissions[user.role as UserRole]?.description || 'Rôle non défini'}</TableCell>
                <TableCell>
                  <IconButton onClick={() => handleOpenDialog(user)} disabled={user.isLastAdmin}>
                    <EditIcon />
                  </IconButton>
                  <IconButton onClick={() => handleDelete(user)} disabled={user.isLastAdmin}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openDialog} onClose={handleCloseDialog}>
        <DialogTitle>
          {editingUser ? 'Modifier l\'Utilisateur' : 'Nouvel Utilisateur'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              label="Email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              disabled={!!editingUser}
            />
            {!editingUser && (
              <TextField
                label="Mot de passe"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            )}
            <FormControl>
              <InputLabel>Rôle</InputLabel>
              <Select
                value={formData.role}
                label="Rôle"
                onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
              >
                {Object.entries(UserRole).map(([key, value]) => (
                  <MenuItem key={key} value={value}>
                    {value} - {RolePermissions[value].description}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Annuler</Button>
          <Button onClick={handleSubmit} variant="contained" color="primary">
            {editingUser ? 'Modifier' : 'Créer'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
