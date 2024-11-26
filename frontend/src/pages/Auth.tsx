import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import {
  Container,
  Box,
  Paper,
  Tabs,
  Tab,
  Typography,
  TextField,
  Button,
  Alert
} from '@mui/material';
import { authService } from '../services/authService';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel = (props: TabPanelProps) => {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`auth-tabpanel-${index}`}
      aria-labelledby={`auth-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
};

const Auth = () => {
  const [tab, setTab] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTab(newValue);
    setError(null);
  };

  const validationSchema = Yup.object({
    email: Yup.string()
      .email('Email invalide')
      .required('L\'email est requis'),
    password: Yup.string()
      .min(6, 'Le mot de passe doit contenir au moins 6 caractères')
      .required('Le mot de passe est requis'),
    ...(tab === 1 && {
      firstName: Yup.string().required('Le prénom est requis'),
      lastName: Yup.string().required('Le nom est requis'),
    }),
  });

  const handleSubmit = async (values: any) => {
    try {
      setError(null);
      if (tab === 0) {
        // Login
        await authService.login(values.email, values.password);
      } else {
        // Register
        await authService.register({
          email: values.email,
          password: values.password,
          firstName: values.firstName,
          lastName: values.lastName,
        });
      }
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <Container component="main" maxWidth="sm">
      <Paper elevation={3} sx={{ mt: 8, p: 2 }}>
        <Tabs value={tab} onChange={handleTabChange} centered>
          <Tab label="Connexion" />
          <Tab label="Inscription" />
        </Tabs>

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}

        <Formik
          initialValues={{
            email: '',
            password: '',
            firstName: '',
            lastName: '',
          }}
          validationSchema={validationSchema}
          onSubmit={handleSubmit}
        >
          {({ values, errors, touched, handleChange, handleBlur }) => (
            <Form>
              <TabPanel value={tab} index={0}>
                <TextField
                  fullWidth
                  id="email"
                  name="email"
                  label="Email"
                  value={values.email}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={touched.email && Boolean(errors.email)}
                  helperText={touched.email && errors.email}
                  margin="normal"
                />
                <TextField
                  fullWidth
                  id="password"
                  name="password"
                  label="Mot de passe"
                  type="password"
                  value={values.password}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={touched.password && Boolean(errors.password)}
                  helperText={touched.password && errors.password}
                  margin="normal"
                />
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  sx={{ mt: 3, mb: 2 }}
                >
                  Se connecter
                </Button>
              </TabPanel>

              <TabPanel value={tab} index={1}>
                <TextField
                  fullWidth
                  id="firstName"
                  name="firstName"
                  label="Prénom"
                  value={values.firstName}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={touched.firstName && Boolean(errors.firstName)}
                  helperText={touched.firstName && errors.firstName}
                  margin="normal"
                />
                <TextField
                  fullWidth
                  id="lastName"
                  name="lastName"
                  label="Nom"
                  value={values.lastName}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={touched.lastName && Boolean(errors.lastName)}
                  helperText={touched.lastName && errors.lastName}
                  margin="normal"
                />
                <TextField
                  fullWidth
                  id="email"
                  name="email"
                  label="Email"
                  value={values.email}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={touched.email && Boolean(errors.email)}
                  helperText={touched.email && errors.email}
                  margin="normal"
                />
                <TextField
                  fullWidth
                  id="password"
                  name="password"
                  label="Mot de passe"
                  type="password"
                  value={values.password}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={touched.password && Boolean(errors.password)}
                  helperText={touched.password && errors.password}
                  margin="normal"
                />
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  sx={{ mt: 3, mb: 2 }}
                >
                  S'inscrire
                </Button>
              </TabPanel>
            </Form>
          )}
        </Formik>
      </Paper>
    </Container>
  );
};

export default Auth;
