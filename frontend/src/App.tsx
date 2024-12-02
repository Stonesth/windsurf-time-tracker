import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import theme from './styles/theme';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ProjectsProvider } from './contexts/ProjectsContext';
import LoginForm from './components/auth/LoginForm';
import SignUpForm from './components/auth/SignUpForm';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import TaskSearch from './pages/TaskSearch';
import DailyTasks from './pages/DailyTasks';
import NavBar from './components/layout/NavBar';
import { CircularProgress, Box } from '@mui/material';
import { AdminPage } from './pages/Admin';
import Profile from './components/Profile/Profile';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" />;
  }

  return <>{children}</>;
};

function App() {
  const { currentUser } = useAuth();

  return (
    <ThemeProvider theme={theme}>
      <AuthProvider>
        <ProjectsProvider>
          <Router>
            <div className="App">
              <NavBar />
              <Routes>
                <Route
                  path="/"
                  element={currentUser ? <Navigate to="/daily" /> : <Navigate to="/login" />}
                />
                <Route 
                  path="/login" 
                  element={currentUser ? <Navigate to="/daily" /> : <LoginForm />} 
                />
                <Route path="/signup" element={<SignUpForm />} />
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/projects"
                  element={
                    <ProtectedRoute>
                      <Projects />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/task-search"
                  element={
                    <ProtectedRoute>
                      <TaskSearch />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/daily"
                  element={
                    <ProtectedRoute>
                      <DailyTasks />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/daily-tasks"
                  element={
                    <ProtectedRoute>
                      <DailyTasks />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute>
                      <AdminPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      <Profile />
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </div>
          </Router>
        </ProjectsProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
