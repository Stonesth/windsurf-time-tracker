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
import TotalTimeDisplay from '../timer/TotalTimeDisplay';

const NavBar = () => {
  const navigate = useNavigate();
  const { currentUser, userRole } = useAuth();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const isAdmin = userRole === UserRole.ADMIN;

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    try {
      await authService.signOut();
      navigate('/login');
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    }
  };

  if (!currentUser) return null;

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar 
        position="fixed" 
        sx={{ 
          zIndex: (theme) => theme.zIndex.drawer + 1,
          boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)'
        }}
      >
        <Toolbar>
          <Typography
            variant="h6"
            component={Link}
            to="/"
            sx={{
              textDecoration: 'none',
              color: 'inherit',
              flexGrow: 0,
              marginRight: 4
            }}
          >
            Time Tracker
          </Typography>
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
          {currentUser && (
            <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 3, marginLeft: 'auto' }}>
              <TotalTimeDisplay variant="navbar" />
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
            </Box>
          )}
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
        </Toolbar>
      </AppBar>
      <Toolbar /> {/* Spacer pour éviter que le contenu ne soit caché derrière la navbar */}
    </Box>
  );
};

export default NavBar;
