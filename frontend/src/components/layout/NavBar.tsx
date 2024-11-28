import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  IconButton,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  AccountCircle,
  Dashboard as DashboardIcon,
} from '@mui/icons-material';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { authService } from '../../services/authService';
import { UserRole } from '../../types/user';

const NavBar = () => {
  const navigate = useNavigate();
  const { currentUser, userRole } = useAuth();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
      handleClose();
      navigate('/login');
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    }
  };

  if (!currentUser) return null;

  console.log('User Role from Context:', userRole);
  const isAdmin = userRole === UserRole.ADMIN;

  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          Time Tracker
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button
            color="inherit"
            component={Link}
            to="/dashboard"
            startIcon={<DashboardIcon />}
          >
            Dashboard
          </Button>
          <Button color="inherit" component={Link} to="/projects">
            Projets
          </Button>
          <Button color="inherit" component={Link} to="/daily">
            Tâches du Jour
          </Button>
          {isAdmin && (
            <Button 
              color="inherit" 
              component={Link} 
              to="/admin"
              sx={{ 
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                }
              }}
            >
              Administration
            </Button>
          )}
          <IconButton
            size="large"
            aria-label="account of current user"
            aria-controls="menu-appbar"
            aria-haspopup="true"
            onClick={handleMenu}
            color="inherit"
          >
            <AccountCircle />
          </IconButton>
          <Menu
            id="menu-appbar"
            anchorEl={anchorEl}
            anchorOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            keepMounted
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            open={Boolean(anchorEl)}
            onClose={handleClose}
          >
            <MenuItem component={Link} to="/profile" onClick={handleClose}>
              Profile
            </MenuItem>
            <MenuItem onClick={handleLogout}>Se déconnecter</MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default NavBar;
