import React, { useState, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  CircularProgress,
  Grid,
  Divider,
  Chip,
  IconButton,
  Card,
  CardContent,
  LinearProgress,
  Tooltip,
} from '@mui/material';
import {
  Camera,
  Upload,
  Sparkles,
  Leaf,
  AlertTriangle,
  CheckCircle,
  XCircle,
  TrendingUp,
  Droplets,
  Sun,
  Bug,
  Thermometer,
  History,
  Download,
} from 'lucide-react';
import { apiClient } from '../../api/client';

interface AnalysisResult {
  healthScore: number;
  stage: string;
  problems: Array<{ type: string; severity: 'low' | 'medium' | 'high'; description: string }>;
  recommendations: string[];
  rawAnalysis: string;
  timestamp: string;
  imageUrl?: string;
}

interface VisionAnalysisPanelProps {
  onAnalysisComplete?: (result: AnalysisResult) => void;
}

const VisionAnalysisPanel: React.FC<VisionAnalysisPanelProps> = ({ onAnalysisComplete }) => {
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [history, setHistory] = useState<AnalysisResult[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeImage = async () => {
    if (!fileInputRef.current?.files?.[0]) return;

    setAnalyzing(true);

    try {
      const file = fileInputRef.current.files[0];

      // Custom prompt for detailed plant analysis
      const prompt = `Analiza esta imagen de plantas de cannabis/cultivo indoor y proporciona un análisis estructurado:

1. **PUNTUACIÓN DE SALUD** (0-100): Evalúa el estado general
2. **ETAPA DE CRECIMIENTO**: Identifica si es vegetativo, floración temprana, media o tardía
3. **PROBLEMAS DETECTADOS**: Lista cada problema con:
   - Tipo: (deficiencia, exceso, plaga, enfermedad, estrés ambiental)
   - Severidad: (baja, media, alta)
   - Descripción específica
4. **RECOMENDACIONES**: Lista 3-5 acciones concretas

Responde en formato estructurado. Sé específico sobre los síntomas visuales que observas.`;

      const response = await apiClient.analyzeImage(file, prompt);

      // Parse the response into structured format
      const parsed = parseAnalysisResponse(response.analysis);
      parsed.timestamp = response.timestamp;
      parsed.imageUrl = imagePreview || undefined;

      setResult(parsed);
      setHistory(prev => [parsed, ...prev.slice(0, 4)]); // Keep last 5
      onAnalysisComplete?.(parsed);

    } catch (error: any) {
      setResult({
        healthScore: 0,
        stage: 'Error',
        problems: [{ type: 'error', severity: 'high', description: error.message }],
        recommendations: ['Intenta de nuevo con otra imagen'],
        rawAnalysis: error.message,
        timestamp: new Date().toISOString()
      });
    } finally {
      setAnalyzing(false);
    }
  };

  // Parse AI response into structured format
  const parseAnalysisResponse = (text: string): AnalysisResult => {
    let healthScore = 70; // Default
    let stage = 'Vegetativo';
    const problems: AnalysisResult['problems'] = [];
    const recommendations: string[] = [];

    // Extract health score
    const scoreMatch = text.match(/(\d{1,3})(?:\s*\/\s*100|%|\s+puntos?)/i);
    if (scoreMatch) healthScore = Math.min(100, parseInt(scoreMatch[1]));

    // Extract stage
    if (text.toLowerCase().includes('floración tardía') || text.toLowerCase().includes('late flower')) {
      stage = 'Floración Tardía';
    } else if (text.toLowerCase().includes('floración') || text.toLowerCase().includes('flower')) {
      stage = 'Floración';
    } else if (text.toLowerCase().includes('vegetativo') || text.toLowerCase().includes('veg')) {
      stage = 'Vegetativo';
    } else if (text.toLowerCase().includes('plántula') || text.toLowerCase().includes('seedling')) {
      stage = 'Plántula';
    }

    // Extract problems
    const problemPatterns = [
      { pattern: /deficiencia\s+de\s+nitrógeno/gi, type: 'Deficiencia N', severity: 'medium' as const },
      { pattern: /deficiencia\s+de\s+potasio/gi, type: 'Deficiencia K', severity: 'medium' as const },
      { pattern: /deficiencia\s+de\s+calcio/gi, type: 'Deficiencia Ca', severity: 'medium' as const },
      { pattern: /deficiencia\s+de\s+magnesio/gi, type: 'Deficiencia Mg', severity: 'medium' as const },
      { pattern: /exceso\s+de\s+nutrientes|sobrefertiliz/gi, type: 'Exceso Nutrientes', severity: 'high' as const },
      { pattern: /ácaros|spider\s+mites/gi, type: 'Ácaros', severity: 'high' as const },
      { pattern: /trips/gi, type: 'Trips', severity: 'medium' as const },
      { pattern: /pulgones|aphids/gi, type: 'Pulgones', severity: 'medium' as const },
      { pattern: /oidio|powdery\s+mildew/gi, type: 'Oídio', severity: 'high' as const },
      { pattern: /botrytis|moho\s+gris/gi, type: 'Botrytis', severity: 'high' as const },
      { pattern: /quemadura\s+de\s+luz|light\s+burn/gi, type: 'Quemadura Luz', severity: 'medium' as const },
      { pattern: /estrés\s+por\s+calor|heat\s+stress/gi, type: 'Estrés Calor', severity: 'medium' as const },
      { pattern: /sobreriego|overwater/gi, type: 'Sobreriego', severity: 'low' as const },
      { pattern: /deficiencia\s+de\s+hierro/gi, type: 'Deficiencia Fe', severity: 'low' as const },
    ];

    problemPatterns.forEach(({ pattern, type, severity }) => {
      if (pattern.test(text)) {
        problems.push({ type, severity, description: `Detectado: ${type}` });
      }
    });

    // If no specific problems found but health score is low, add generic issue
    if (problems.length === 0 && healthScore < 70) {
      problems.push({ type: 'General', severity: 'low', description: 'Posibles problemas menores detectados' });
    }

    // Extract recommendations (lines starting with numbers or bullets)
    const recMatch = text.match(/(?:recomendacion|acción|sugier)[\s\S]*?(?:\d\.|\-|\•)([\s\S]*?)(?=\n\n|$)/gi);
    if (recMatch) {
      recMatch.forEach(block => {
        const lines = block.split(/\n/).filter(l => l.trim());
        lines.forEach(line => {
          const cleaned = line.replace(/^[\d\.\-\•\*]+\s*/, '').trim();
          if (cleaned.length > 10 && cleaned.length < 200) {
            recommendations.push(cleaned);
          }
        });
      });
    }

    // Fallback recommendations
    if (recommendations.length === 0) {
      recommendations.push('Mantén los parámetros ambientales estables');
      recommendations.push('Revisa pH y EC del sustrato');
      recommendations.push('Monitorea el VPD regularmente');
    }

    return {
      healthScore,
      stage,
      problems,
      recommendations: recommendations.slice(0, 5),
      rawAnalysis: text,
      timestamp: new Date().toISOString()
    };
  };

  const getHealthColor = (score: number) => {
    if (score >= 80) return '#22c55e';
    if (score >= 60) return '#f59e0b';
    if (score >= 40) return '#f97316';
    return '#ef4444';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#22c55e';
      default: return '#6b7280';
    }
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Sparkles size={28} color="#a5f3fc" />
        <Typography variant="h5" fontWeight="bold">Diagnóstico Visual AI</Typography>
      </Box>

      <Grid container spacing={3} sx={{ flex: 1 }}>
        {/* Left: Upload & Preview */}
        <Grid item xs={12} md={5}>
          <Paper
            sx={{
              height: 300,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'rgba(0,0,0,0.3)',
              border: '2px dashed rgba(255,255,255,0.2)',
              borderRadius: 3,
              cursor: 'pointer',
              transition: 'all 0.3s',
              '&:hover': { borderColor: '#a5f3fc', bgcolor: 'rgba(0,0,0,0.4)' },
              overflow: 'hidden',
              position: 'relative'
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={handleImageUpload}
            />

            {imagePreview ? (
              <Box
                component="img"
                src={imagePreview}
                sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <Box sx={{ textAlign: 'center', p: 3 }}>
                <Upload size={48} color="rgba(255,255,255,0.5)" />
                <Typography variant="body1" sx={{ mt: 2, color: 'rgba(255,255,255,0.7)' }}>
                  Arrastra una imagen o haz clic
                </Typography>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                  JPG, PNG (máx. 10MB)
                </Typography>
              </Box>
            )}

            {imagePreview && (
              <Box sx={{ position: 'absolute', bottom: 10, right: 10 }}>
                <Chip label="Cambiar" size="small" sx={{ bgcolor: 'rgba(0,0,0,0.7)', color: 'white' }} />
              </Box>
            )}
          </Paper>

          <Button
            variant="contained"
            fullWidth
            startIcon={analyzing ? <CircularProgress size={20} color="inherit" /> : <Sparkles size={20} />}
            onClick={analyzeImage}
            disabled={!imagePreview || analyzing}
            sx={{
              mt: 2,
              py: 1.5,
              background: 'linear-gradient(45deg, #7c3aed 30%, #2563eb 90%)',
              boxShadow: '0 3px 10px rgba(124, 58, 237, .4)',
              '&:disabled': { background: 'rgba(255,255,255,0.1)' }
            }}
          >
            {analyzing ? 'Analizando...' : 'Analizar con Gemini Vision'}
          </Button>

          {/* History */}
          {history.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, color: 'rgba(255,255,255,0.7)' }}>
                <History size={16} /> Historial Reciente
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {history.map((h, i) => (
                  <Tooltip key={i} title={new Date(h.timestamp).toLocaleString()}>
                    <Chip
                      label={`${h.healthScore}%`}
                      size="small"
                      sx={{
                        bgcolor: `${getHealthColor(h.healthScore)}20`,
                        color: getHealthColor(h.healthScore),
                        cursor: 'pointer'
                      }}
                      onClick={() => setResult(h)}
                    />
                  </Tooltip>
                ))}
              </Box>
            </Box>
          )}
        </Grid>

        {/* Right: Results */}
        <Grid item xs={12} md={7}>
          {result ? (
            <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* Health Score */}
              <Card sx={{ bgcolor: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Leaf size={24} color={getHealthColor(result.healthScore)} />
                      <Typography variant="h6" sx={{ color: 'white' }}>Salud del Cultivo</Typography>
                    </Box>
                    <Chip label={result.stage} size="small" sx={{ bgcolor: 'rgba(165, 243, 252, 0.2)', color: '#a5f3fc' }} />
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography variant="h2" sx={{ fontWeight: 'bold', color: getHealthColor(result.healthScore) }}>
                      {result.healthScore}
                    </Typography>
                    <Typography variant="h4" sx={{ color: 'rgba(255,255,255,0.5)' }}>/100</Typography>
                  </Box>

                  <LinearProgress
                    variant="determinate"
                    value={result.healthScore}
                    sx={{
                      mt: 2, height: 8, borderRadius: 4,
                      bgcolor: 'rgba(255,255,255,0.1)',
                      '& .MuiLinearProgress-bar': { bgcolor: getHealthColor(result.healthScore), borderRadius: 4 }
                    }}
                  />
                </CardContent>
              </Card>

              {/* Problems */}
              <Card sx={{ bgcolor: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', flex: 1, overflow: 'auto' }}>
                <CardContent>
                  <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, color: 'white' }}>
                    <AlertTriangle size={18} color="#f59e0b" /> Problemas Detectados
                  </Typography>

                  {result.problems.length === 0 ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#22c55e' }}>
                      <CheckCircle size={18} />
                      <Typography>No se detectaron problemas significativos</Typography>
                    </Box>
                  ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {result.problems.map((p, i) => (
                        <Box
                          key={i}
                          sx={{
                            display: 'flex', alignItems: 'center', gap: 2,
                            p: 1.5, borderRadius: 2,
                            bgcolor: `${getSeverityColor(p.severity)}10`,
                            border: `1px solid ${getSeverityColor(p.severity)}30`
                          }}
                        >
                          <XCircle size={18} color={getSeverityColor(p.severity)} />
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="body2" sx={{ color: 'white', fontWeight: 'bold' }}>{p.type}</Typography>
                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>{p.description}</Typography>
                          </Box>
                          <Chip
                            label={p.severity.toUpperCase()}
                            size="small"
                            sx={{ bgcolor: `${getSeverityColor(p.severity)}20`, color: getSeverityColor(p.severity), fontSize: '0.65rem' }}
                          />
                        </Box>
                      ))}
                    </Box>
                  )}

                  <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.1)' }} />

                  <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, color: 'white' }}>
                    <TrendingUp size={18} color="#22c55e" /> Recomendaciones
                  </Typography>

                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {result.recommendations.map((rec, i) => (
                      <Box key={i} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                        <CheckCircle size={14} color="#22c55e" style={{ marginTop: 4, flexShrink: 0 }} />
                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)' }}>{rec}</Typography>
                      </Box>
                    ))}
                  </Box>
                </CardContent>
              </Card>
            </Box>
          ) : (
            <Box
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'rgba(255,255,255,0.5)'
              }}
            >
              <Camera size={64} />
              <Typography variant="h6" sx={{ mt: 2 }}>Sube una imagen para analizar</Typography>
              <Typography variant="body2">Gemini Vision detectará problemas y dará recomendaciones</Typography>
            </Box>
          )}
        </Grid>
      </Grid>
    </Box>
  );
};

export default VisionAnalysisPanel;
