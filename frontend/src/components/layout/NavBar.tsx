import React, { useState, useEffect } from 'react';
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
  Menu as MenuIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { authService } from '../../services/authService';
import { UserRole } from '../../types/user';
import TotalTimeDisplay from '../timer/TotalTimeDisplay';
import { useTheme } from '@mui/material/styles';
import { useMediaQuery } from '@mui/material';
import { useTranslation } from 'react-i18next';
import LanguageSelector from '../LanguageSelector';

const NavBar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, userRole } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [mobileMenuAnchor, setMobileMenuAnchor] = useState<null | HTMLElement>(null);
  const { t } = useTranslation();

  // Réinitialiser les menus lors des changements de route
  useEffect(() => {
    setAnchorEl(null);
    setMobileMenuAnchor(null);
  }, [location.pathname]);

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMobileMenu = (event: React.MouseEvent<HTMLElement>) => {
    setMobileMenuAnchor(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
    setMobileMenuAnchor(null);
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
      navigate('/login');
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    }
  };

  const navigateTo = (path: string) => {
    navigate(path);
    handleClose();
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
            {t('nav.timeTracker')}
          </Typography>
          {isMobile ? (
            <>
              <IconButton
                edge="start"
                color="inherit"
                aria-label="menu"
                onClick={handleMobileMenu}
                sx={{ mr: 2 }}
              >
                <MenuIcon />
              </IconButton>
              <Menu
                anchorEl={mobileMenuAnchor}
                open={Boolean(mobileMenuAnchor)}
                onClose={handleClose}
              >
                <MenuItem onClick={() => navigateTo('/dashboard')}>{t('nav.dashboard')}</MenuItem>
                <MenuItem onClick={() => navigateTo('/projects')}>{t('nav.projects')}</MenuItem>
                <MenuItem onClick={() => navigateTo('/task-search')}>{t('nav.taskSearch')}</MenuItem>
                <MenuItem onClick={() => navigateTo('/daily')}>{t('nav.dailyTasks')}</MenuItem>
                {userRole === UserRole.ADMIN && (
                  <MenuItem onClick={() => navigateTo('/admin')}>{t('nav.admin')}</MenuItem>
                )}
                <MenuItem onClick={() => navigateTo('/profile')}>{t('nav.profile')}</MenuItem>
                <MenuItem onClick={handleLogout}>{t('common.logout')}</MenuItem>
              </Menu>
            </>
          ) : (
            <>
              <Button
                color="inherit"
                component={Link}
                to="/dashboard"
                startIcon={<DashboardIcon />}
              >
                {t('nav.dashboard')}
              </Button>
              <Button color="inherit" component={Link} to="/projects">
                {t('nav.projects')}
              </Button>
              <Button color="inherit" component={Link} to="/task-search">
                {t('nav.taskSearch')}
              </Button>
              <Button color="inherit" component={Link} to="/daily">
                {t('nav.dailyTasks')}
              </Button>
            </>
          )}
          {currentUser && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, marginLeft: 'auto' }}>
              <TotalTimeDisplay variant="navbar" />
              {!isMobile && userRole === UserRole.ADMIN && (
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
                  {t('nav.admin')}
                </Button>
              )}
              <LanguageSelector />
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
              {Boolean(anchorEl) && (
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
                    {t('nav.profile')}
                  </MenuItem>
                  <MenuItem onClick={handleLogout}>{t('common.logout')}</MenuItem>
                </Menu>
              )}
            </Box>
          )}
        </Toolbar>
      </AppBar>
      <Toolbar /> {/* Spacer pour éviter que le contenu ne soit caché derrière la navbar */}
    </Box>
  );
};

export default NavBar;
