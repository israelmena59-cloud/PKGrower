// src/pages/Dashboard.tsx
import React, { useEffect, useState } from 'react';
import SensorCard from '../components/dashboard/SensorCard';
import DeviceSwitch from '../components/dashboard/DeviceSwitch';
import HistoryChart from '../components/dashboard/HistoryChart';
import { Thermometer, Droplet, Wind, Lightbulb, Fan, Droplets } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import Typography from '@mui/material/Typography'
import Grid from '@mui/material/Grid'
import Box from '@mui/material/Box'

// Define types for our data
interface SensorData {
  timestamp: string;
  temperature: number;
  humidity: number;
  substrateHumidity: number;
  vpd: number;
}

interface DeviceStates {
  luzRoja: boolean; // Cambiado de 'lights' a 'luzRoja'
  extractor: boolean;
  bomba: boolean; // Cambiado de 'pump' a 'bomba'
  humidifier: boolean;
}

const Dashboard: React.FC = () => {
  const [latestSensors, setLatestSensors] = useState<SensorData | null>(null);
  const [sensorHistory, setSensorHistory] = useState<SensorData[]>([]);
  const [devices, setDevices] = useState<DeviceStates | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const latestSensorsResponse = await fetch('http://localhost:3000/api/sensors/latest');
      const historyResponse = await fetch('http://localhost:3000/api/sensors/history');
      const devicesResponse = await fetch('http://localhost:3000/api/devices');

      if (!latestSensorsResponse.ok || !historyResponse.ok || !devicesResponse.ok) {
        throw new Error('Network response was not ok');
      }

      const latestSensorsData = await latestSensorsResponse.json();
      const historyData = await historyResponse.json();
      const devicesData = await devicesResponse.json();

      setLatestSensors(latestSensorsData);
      setSensorHistory(historyData);
      setDevices(devicesData);
      setError(null);
    } catch (error) {
      console.error("Failed to fetch data:", error);
      setError("Failed to connect to simulation server. Is it running?");
    }
  };

  useEffect(() => {
    fetchData(); // Initial fetch
    const interval = setInterval(fetchData, 5000); // Fetch every 5 seconds

    return () => clearInterval(interval); // Cleanup on component unmount
  }, []);

  const handleToggle = async (deviceId: keyof DeviceStates) => {
    try {
      const response = await fetch(`http://localhost:3000/api/device/${deviceId}/toggle`, {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error('Failed to toggle device');
      }
      fetchData(); // Re-fetch data to get the new state
    } catch (error) {
      console.error("Failed to toggle device:", error);
    }
  };

  if (error) {
    return <Box sx={{ textAlign: 'center', color: 'error.main', fontSize: '1.125rem', p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>{error}</Box>
  }

  if (!latestSensors || !devices) {
    return <Box sx={{ textAlign: 'center', color: 'text.secondary', fontSize: '1.125rem', p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>Cargando datos...</Box>
  }

  return (
    <Box sx={{ '& > * + *': { mt: 3 } }}>
      <Typography variant="h4" sx={{ fontWeight: 'bold' }}>Dashboard del Cultivo</Typography>
      
      <Card>
        <CardHeader>
          <CardTitle>Datos Actuales de Sensores</CardTitle>
        </CardHeader>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6} lg={3}>
              <SensorCard icon={<Thermometer />} name="Temperatura" value={latestSensors.temperature} unit="°C" />
            </Grid>
            <Grid item xs={12} md={6} lg={3}>
              <SensorCard icon={<Droplet />} name="Humedad Ambiente" value={latestSensors.humidity} unit="%" />
            </Grid>
            <Grid item xs={12} md={6} lg={3}>
              <SensorCard icon={<Droplets />} name="Humedad Sustrato" value={latestSensors.substrateHumidity} unit="%" />
            </Grid>
            <Grid item xs={12} md={6} lg={3}>
              <SensorCard icon={<Wind />} name="VPD" value={latestSensors.vpd} unit="kPa" />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historial de Sensores</CardTitle>
        </CardHeader>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} lg={6}>
              <Typography variant="h6" sx={{ mb: 1 }}>Temperatura</Typography>
              <HistoryChart data={sensorHistory} dataKey="temperature" stroke="#ef4444" />
            </Grid>
            <Grid item xs={12} lg={6}>
              <Typography variant="h6" sx={{ mb: 1 }}>Humedad</Typography>
              <HistoryChart data={sensorHistory} dataKey="humidity" stroke="#3b82f6" />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ mb: 1 }}>Humedad del Sustrato</Typography>
              <HistoryChart data={sensorHistory} dataKey="substrateHumidity" stroke="#22c55e" />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Control de Dispositivos</CardTitle>
        </CardHeader>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={6} md={4} lg={2}>
              <DeviceSwitch icon={<Lightbulb />} name="Luz Roja" isOn={devices.luzRoja} onToggle={() => handleToggle('luzRoja')} />
            </Grid>
            <Grid item xs={6} md={4} lg={2}>
              <DeviceSwitch icon={<Fan />} name="Extractor" isOn={devices.extractor} onToggle={() => handleToggle('extractor')} />
            </Grid>
            <Grid item xs={6} md={4} lg={2}>
              <DeviceSwitch icon={<Droplets />} name="Bomba de Riego" isOn={devices.bomba} onToggle={() => handleToggle('bomba')} />
            </Grid>
            <Grid item xs={6} md={4} lg={2}>
              <DeviceSwitch icon={<Droplet />} name="Humidificador" isOn={devices.humidifier} onToggle={() => handleToggle('humidifier')} />
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Dashboard;