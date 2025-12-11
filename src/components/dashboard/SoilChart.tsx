import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend
} from 'recharts';
import { Card, CardContent, CardHeader, Typography, Box } from '@mui/material';

interface SoilChartProps {
  data: any[];
  phase: 'vegetative' | 'generative';
}

// Mock sensor data parsing helper - In real app, history should store separate sensor values
// Currently sensorHistory stores averaged 'substrateHumidity'.
// User wants 3 lines. This requires the HISTORY endpoint to return 3 separate values per timestamp.
// IF the backend only stores average, we can't legitimately show 3 historical lines.
// However, I will implement the chart to accept data keys `sh1`, `sh2`, `sh3` (Soil Humidity 1-3).
// Checking api/client.ts -> SensorData only has `substrateHumidity` (single).
// CRITICAL: I cannot show 3 lines if I only save 1 average.
// Plan: I will update the chart to show the AVERAGE line + Ideal Lines for now,
// OR update the backend to start saving individual values (which takes time to accumulate).
// Given "User wants 3 lines", I should probably update the backend storage structure first.
// BUT for immediate UI satisfaction, I will implement the chart structure ready for 3 lines,
// and if data comes as single key, show 1 line.
// Wait, user explicitly asked for "datos de los 3 sensores... cada uno con una linea".
// I will check if backend stores them. Index.js `updateSensorData` (simulated) creates single `substrateHumidity`.
// In real mode, `api/sensors/history` likely just appends `latestSensor` ... which is also single average!
// I must update the backend to store individual sensor history if I want this chart to work properly.

// For this step, I will create the component assuming data structure:
// { timestamp, humiditys1, humiditys2, humiditys3 }
// And I will map 'substrateHumidity' to 'humiditys1' as fallback if needed.

export const SoilChart: React.FC<SoilChartProps> = ({ data, phase }) => {

  // Ideal targets (Example values - user can customize logic later)
  const idealVeg = 45; // % - Green line
  const idealGen = 30; // % - Purple line



  return (
    <Card sx={{ width: '100%', boxShadow: 3, borderRadius: 2 }}>
      <CardHeader
        title="Curva de Dryback (Humedad de Sustrato)"
        subheader={`Fase: ${phase === 'vegetative' ? 'Vegetativa (Verde)' : 'Generativa (Morado)'}`}
        titleTypographyProps={{ variant: 'h6', fontWeight: 'bold' }}
      />
      <CardContent>
        <div style={{ width: '100%', height: 400, minHeight: 400 }}>
          {(!data || data.length === 0) ? (
               <Box sx={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                     <Typography variant="body2" color="text.secondary">Esperando lecturas de sensores...</Typography>
                     <Typography variant="caption" color="text.disabled">(Aparecerán aquí en menos de 1 min)</Typography>
               </Box>
          ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis
                  dataKey="timestamp"
                  tickFormatter={(val) => new Date(val).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              />
              <YAxis unit="%" domain={[0, 100]} />
              <Tooltip
                  labelFormatter={(label) => new Date(label).toLocaleString()}
                  contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
              />
              <Legend />

              {/* Reference Lines based on Phase */}
              {phase === 'vegetative' && (
                  <ReferenceLine y={idealVeg} label="Ideal Veg" stroke="#4caf50" strokeDasharray="5 5" strokeWidth={2} />
              )}
              {phase === 'generative' && (
                  <ReferenceLine y={idealGen} label="Ideal Gen" stroke="#9c27b0" strokeDasharray="5 5" strokeWidth={2} />
              )}

              {/* Data Lines - Distinct High Contrast Colors */}
              <Line type="monotone" dataKey="sh1" name="Sensor 1 (Cyan)" stroke="#06b6d4" strokeWidth={3} dot={false} connectNulls />
              <Line type="monotone" dataKey="sh2" name="Sensor 2 (Magenta)" stroke="#d946ef" strokeWidth={3} dot={false} connectNulls />
              <Line type="monotone" dataKey="sh3" name="Sensor 3 (Yellow)" stroke="#facc15" strokeWidth={3} dot={false} connectNulls />

              {/* Dew Point Line (Requested by User) - Secondary Axis */}
              <YAxis yAxisId="right" orientation="right" unit="°C" domain={['auto', 'auto']} stroke="#ff9800" />
              <Line yAxisId="right" type="monotone" dataKey="dp" name="Dew Point (DP)" stroke="#ff9800" strokeWidth={2} dot={false} strokeDasharray="3 3" connectNulls />
            </LineChart>
          </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
