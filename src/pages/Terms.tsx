/**
 * Terms and Conditions / Privacy Policy Page
 * Based on Chilean law (Ley 19.628 sobre Protección de Datos Personales)
 */
import React from 'react';
import { Box, Paper, Typography, Button, Divider } from '@mui/material';
import { ArrowLeft, Shield, Lock, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Terms: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Box sx={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
      py: 4,
      px: 2
    }}>
      <Box sx={{ maxWidth: 800, mx: 'auto' }}>
        <Button
          startIcon={<ArrowLeft />}
          onClick={() => navigate(-1)}
          sx={{ mb: 2, color: 'white' }}
        >
          Volver
        </Button>

        <Paper sx={{
          p: 4,
          borderRadius: 4,
          background: 'rgba(30, 41, 59, 0.95)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.1)',
        }}>
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <Shield size={32} color="#22c55e" />
            <Typography variant="h4" fontWeight="bold" color="white">
              Términos y Condiciones
            </Typography>
          </Box>

          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', mb: 4 }}>
            Última actualización: Diciembre 2024
          </Typography>

          {/* Section 1 */}
          <Typography variant="h6" sx={{ color: '#22c55e', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <FileText size={20} /> 1. Aceptación de Términos
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', mb: 3, lineHeight: 1.8 }}>
            Al utilizar PKGrower ("la Aplicación"), usted acepta estos términos y condiciones en su totalidad.
            Si no está de acuerdo con alguna parte de estos términos, no debe utilizar la aplicación.
            Este servicio está destinado exclusivamente para uso personal y no comercial, cumpliendo
            con la legislación chilena vigente.
          </Typography>

          <Divider sx={{ my: 3, borderColor: 'rgba(255,255,255,0.1)' }} />

          {/* Section 2 */}
          <Typography variant="h6" sx={{ color: '#22c55e', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Lock size={20} /> 2. Protección de Datos Personales
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', mb: 2, lineHeight: 1.8 }}>
            En cumplimiento con la <strong>Ley 19.628 sobre Protección de Datos Personales de Chile</strong>,
            informamos que:
          </Typography>
          <Box component="ul" sx={{ color: 'rgba(255,255,255,0.8)', pl: 3, mb: 3 }}>
            <li>Sus datos personales <strong>NO serán compartidos</strong> con terceros bajo ninguna circunstancia.</li>
            <li>La información recopilada es de uso <strong>estrictamente privado</strong> y confidencial.</li>
            <li>Los datos se utilizan únicamente para el funcionamiento de la aplicación.</li>
            <li>Usted tiene derecho a solicitar acceso, rectificación o eliminación de sus datos en cualquier momento.</li>
            <li>Los datos de sensores se almacenan localmente y en servidores seguros con encriptación.</li>
          </Box>

          <Divider sx={{ my: 3, borderColor: 'rgba(255,255,255,0.1)' }} />

          {/* Section 3 */}
          <Typography variant="h6" sx={{ color: '#22c55e', mb: 2 }}>
            3. Datos Recopilados
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', mb: 2, lineHeight: 1.8 }}>
            La aplicación puede recopilar los siguientes datos:
          </Typography>
          <Box component="ul" sx={{ color: 'rgba(255,255,255,0.8)', pl: 3, mb: 3 }}>
            <li>Correo electrónico (para autenticación)</li>
            <li>Datos de sensores ambientales (temperatura, humedad, VWC)</li>
            <li>Configuraciones de dispositivos conectados</li>
            <li>Historial de eventos y automatizaciones</li>
          </Box>

          <Divider sx={{ my: 3, borderColor: 'rgba(255,255,255,0.1)' }} />

          {/* Section 4 */}
          <Typography variant="h6" sx={{ color: '#22c55e', mb: 2 }}>
            4. Uso de la Aplicación
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', mb: 3, lineHeight: 1.8 }}>
            PKGrower es una herramienta de monitoreo y control ambiental. El usuario es responsable
            del uso que haga de la aplicación y de asegurar que cumple con la legislación local
            aplicable. La aplicación se proporciona "tal cual" sin garantías de ningún tipo.
          </Typography>

          <Divider sx={{ my: 3, borderColor: 'rgba(255,255,255,0.1)' }} />

          {/* Section 5 */}
          <Typography variant="h6" sx={{ color: '#22c55e', mb: 2 }}>
            5. Seguridad
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', mb: 3, lineHeight: 1.8 }}>
            Implementamos medidas de seguridad técnicas y organizativas para proteger sus datos,
            incluyendo encriptación SSL/TLS, autenticación segura mediante Firebase Auth,
            y acceso restringido a los servidores. Sin embargo, ningún sistema es 100% seguro
            y no podemos garantizar la seguridad absoluta de los datos transmitidos.
          </Typography>

          <Divider sx={{ my: 3, borderColor: 'rgba(255,255,255,0.1)' }} />

          {/* Section 6 */}
          <Typography variant="h6" sx={{ color: '#22c55e', mb: 2 }}>
            6. Contacto y Derechos ARCO
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', mb: 3, lineHeight: 1.8 }}>
            Para ejercer sus derechos de Acceso, Rectificación, Cancelación u Oposición (ARCO)
            sobre sus datos personales, o para cualquier consulta relacionada con estos términos,
            puede contactarnos a través de la aplicación.
          </Typography>

          {/* Footer */}
          <Box sx={{ mt: 4, p: 3, bgcolor: 'rgba(34, 197, 94, 0.1)', borderRadius: 2 }}>
            <Typography variant="body2" sx={{ color: '#22c55e', fontWeight: 'bold', mb: 1 }}>
              📋 Resumen
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
              • Sus datos son <strong>privados y confidenciales</strong><br />
              • <strong>NO compartimos</strong> información con terceros<br />
              • Puede solicitar <strong>eliminar su cuenta</strong> en cualquier momento<br />
              • Cumplimos con la <strong>Ley 19.628</strong> de Chile
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
};

export default Terms;
