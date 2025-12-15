/**
 * Login Page
 * Beautiful login/register form with Email, Google, and Apple options
 */
import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Divider,
  Alert,
  IconButton,
  InputAdornment,
  CircularProgress,
  Tabs,
  Tab,
  FormControlLabel,
  Checkbox,
  Link,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { Leaf, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// Google icon component
const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

// Apple icon
const AppleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
  </svg>
);

const Login: React.FC = () => {
  const { login, register, loginGoogle, loginApple, error, clearError } = useAuth();
  const [tab, setTab] = useState(0); // 0 = login, 1 = register
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    clearError();

    if (!email || !password) {
      setLocalError('Completa todos los campos');
      return;
    }

    if (tab === 1 && password !== confirmPassword) {
      setLocalError('Las contraseñas no coinciden');
      return;
    }

    if (tab === 1 && !acceptTerms) {
      setLocalError('Debes aceptar los términos y condiciones');
      return;
    }

    setLoading(true);
    try {
      if (tab === 0) {
        await login(email, password);
      } else {
        await register(email, password);
      }
    } catch (e) {
      // Error handled by context
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    try {
      await loginGoogle();
    } catch (e) {
      // Error handled by context
    } finally {
      setLoading(false);
    }
  };

  const handleApple = async () => {
    setLoading(true);
    try {
      await loginApple();
    } catch (e) {
      // Error handled by context
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
      padding: 2
    }}>
      <Paper sx={{
        width: '100%',
        maxWidth: 420,
        p: 4,
        borderRadius: 4,
        background: 'rgba(30, 41, 59, 0.95)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
      }}>
        {/* Logo */}
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Box sx={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #22c55e, #16a34a)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 10px 40px rgba(34, 197, 94, 0.3)'
          }}>
            <Leaf size={32} color="white" />
          </Box>
          <Typography variant="h4" sx={{
            fontWeight: 700,
            color: 'white',
            background: 'linear-gradient(90deg, #22c55e, #4ade80)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            PKGrower
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', mt: 0.5 }}>
            Control Inteligente de Cultivo
          </Typography>
        </Box>

        {/* Tabs */}
        <Tabs
          value={tab}
          onChange={(_, v) => { setTab(v); clearError(); setLocalError(''); }}
          centered
          sx={{
            mb: 3,
            '& .MuiTab-root': { color: 'rgba(255,255,255,0.6)', fontWeight: 600 },
            '& .Mui-selected': { color: '#22c55e !important' },
            '& .MuiTabs-indicator': { backgroundColor: '#22c55e' }
          }}
        >
          <Tab label="Iniciar Sesión" />
          <Tab label="Registrarse" />
        </Tabs>

        {/* Error Alert */}
        {(error || localError) && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error || localError}
          </Alert>
        )}

        {/* Form */}
        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            sx={{ mb: 2 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Mail size={20} color="#64748b" />
                </InputAdornment>
              )
            }}
          />

          <TextField
            fullWidth
            label="Contraseña"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            sx={{ mb: tab === 1 ? 2 : 3 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Lock size={20} color="#64748b" />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </IconButton>
                </InputAdornment>
              )
            }}
          />

          {tab === 1 && (
            <TextField
              fullWidth
              label="Confirmar Contraseña"
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              sx={{ mb: 3 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock size={20} color="#64748b" />
                  </InputAdornment>
                )
              }}
            />
          )}

          {/* Terms Checkbox - Only for Register */}
          {tab === 1 && (
            <FormControlLabel
              control={
                <Checkbox
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  sx={{ color: 'rgba(255,255,255,0.6)', '&.Mui-checked': { color: '#22c55e' } }}
                />
              }
              label={
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                  Acepto los{' '}
                  <Link
                    href="#"
                    onClick={(e: React.MouseEvent) => { e.preventDefault(); setShowTerms(true); }}
                    sx={{ color: '#22c55e', textDecoration: 'underline', cursor: 'pointer' }}
                  >
                    términos y condiciones
                  </Link>
                  {' '}y la política de privacidad
                </Typography>
              }
              sx={{ mb: 2 }}
            />
          )}

          <Button
            type="submit"
            fullWidth
            variant="contained"
            disabled={loading}
            sx={{
              py: 1.5,
              borderRadius: 2,
              fontWeight: 600,
              background: 'linear-gradient(135deg, #22c55e, #16a34a)',
              '&:hover': { background: 'linear-gradient(135deg, #16a34a, #15803d)' }
            }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> :
              tab === 0 ? 'Iniciar Sesión' : 'Crear Cuenta'}
          </Button>
        </Box>

        {/* Divider */}
        <Divider sx={{ my: 3, color: 'rgba(255,255,255,0.3)' }}>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
            o continúa con
          </Typography>
        </Divider>

        {/* Social Login */}
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            fullWidth
            variant="outlined"
            onClick={handleGoogle}
            disabled={loading}
            startIcon={<GoogleIcon />}
            sx={{
              py: 1.5,
              borderRadius: 2,
              borderColor: 'rgba(255,255,255,0.2)',
              color: 'white',
              '&:hover': { borderColor: 'rgba(255,255,255,0.4)', bgcolor: 'rgba(255,255,255,0.05)' }
            }}
          >
            Google
          </Button>
          <Button
            fullWidth
            variant="outlined"
            onClick={handleApple}
            disabled={loading}
            startIcon={<AppleIcon />}
            sx={{
              py: 1.5,
              borderRadius: 2,
              borderColor: 'rgba(255,255,255,0.2)',
              color: 'white',
              '&:hover': { borderColor: 'rgba(255,255,255,0.4)', bgcolor: 'rgba(255,255,255,0.05)' }
            }}
          >
            Apple
          </Button>
        </Box>
      </Paper>

      {/* Terms Modal */}
      <Dialog
        open={showTerms}
        onClose={() => setShowTerms(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { bgcolor: 'rgba(30, 41, 59, 0.98)', backdropFilter: 'blur(20px)', borderRadius: 3 }
        }}
      >
        <DialogTitle sx={{ color: 'white', fontWeight: 'bold' }}>
          📋 Términos y Condiciones
        </DialogTitle>
        <DialogContent sx={{ color: 'rgba(255,255,255,0.8)' }}>
          <Typography variant="h6" sx={{ color: '#22c55e', mb: 2 }}>
            1. Aceptación de Términos
          </Typography>
          <Typography variant="body2" sx={{ mb: 3, lineHeight: 1.8 }}>
            Al utilizar PKGrower, usted acepta estos términos en su totalidad.
            Este servicio está destinado para uso personal cumpliendo con la legislación chilena.
          </Typography>

          <Typography variant="h6" sx={{ color: '#22c55e', mb: 2 }}>
            2. Protección de Datos (Ley 19.628)
          </Typography>
          <Typography variant="body2" sx={{ mb: 1, lineHeight: 1.8 }}>
            En cumplimiento con la Ley 19.628 sobre Protección de Datos Personales de Chile:
          </Typography>
          <Box component="ul" sx={{ pl: 2, mb: 3 }}>
            <li>Sus datos personales <strong>NO serán compartidos</strong> con terceros.</li>
            <li>La información es de uso <strong>estrictamente privado</strong> y confidencial.</li>
            <li>Puede solicitar <strong>eliminar su cuenta</strong> en cualquier momento.</li>
          </Box>

          <Typography variant="h6" sx={{ color: '#22c55e', mb: 2 }}>
            3. Datos Recopilados
          </Typography>
          <Typography variant="body2" sx={{ mb: 3, lineHeight: 1.8 }}>
            Correo electrónico, datos de sensores, configuraciones de dispositivos e historial de eventos.
            Todos almacenados con encriptación y acceso restringido.
          </Typography>

          <Alert severity="info" sx={{ mt: 2 }}>
            <strong>Resumen:</strong> Sus datos son privados y confidenciales.
            NO compartimos información con terceros.
            Cumplimos con la Ley 19.628 de Chile.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setShowTerms(false)} sx={{ color: 'white' }}>
            Cerrar
          </Button>
          <Button
            onClick={() => { setAcceptTerms(true); setShowTerms(false); }}
            variant="contained"
            sx={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}
          >
            Aceptar Términos
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Login;
