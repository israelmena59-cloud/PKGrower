/**
 * Environment Page - Integrated with Crop Steering
 * AI-Coated Design & Dynamic VPD targets
 */

import React, { useState, useEffect } from 'react';
import { Switch, Slider, CircularProgress } from '@mui/material';
import { Thermometer, Droplet, Wind, Fan, Save, Leaf, Target, TrendingUp, Activity, Zap, RefreshCw, Cpu } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { API_BASE_URL, apiClient } from '../api/client';
import { useCropSteering } from '../context/CropSteeringContext';
import { VPDGauge } from '../components/cropsteering';
import AIContextPanel from '../components/common/AIContextPanel';
import { PageHeader } from '../components/layout/PageHeader';

// --- SUB-COMPONENTS (Reusable Glass UI) ---

const MetricCard = ({ label, value, unit, icon: Icon, color, subValue }: any) => (
    <div className="glass-panel p-4 h-full flex flex-col justify-between overflow-hidden relative group">
        <div className={`absolute top-0 right-0 p-12 opacity-5 rounded-full blur-2xl transition-all duration-500 group-hover:scale-150`} style={{ backgroundColor: color }} />

        <div className="flex justify-between items-start mb-2 relative z-10">
            <div className={`p-2 rounded-xl bg-opacity-10 backdrop-blur-md`} style={{ backgroundColor: `${color}20`, color: color }}>
                <Icon size={20} />
            </div>
            {subValue && (
                <span className="text-[10px] uppercase tracking-wider font-semibold py-0.5 px-2 rounded-full bg-white/5 text-gray-400 border border-white/5">
                    {subValue}
                </span>
            )}
        </div>

        <div className="relative z-10">
            <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-white tracking-tight">{value}</span>
                <span className="text-sm text-gray-400 font-medium">{unit}</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">{label}</p>
        </div>
    </div>
);

interface EnvironmentSettings {
    enabled: boolean;
    mode: 'manual' | 'auto';
    humidifierTarget: number;
    extractorCycleOn: number;
    extractorCycleOff: number;
}

const Environment: React.FC = () => {
  const [settings, setSettings] = useState<EnvironmentSettings | null>(null);
  const [devices, setDevices] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [vpdData, setVpdData] = useState<any[]>([]);
  const [currentVpd, setCurrentVpd] = useState(0);
  const [tabIndex, setTabIndex] = useState(0);

  // Crop Steering Integration
  const { currentStage, getTargetVPD, getTargetTemp, getTargetHumidity, updateConditions } = useCropSteering();

  const targets = {
    vpd: getTargetVPD(),
    temp: getTargetTemp(),
    humidity: getTargetHumidity()
  };

  const fetchData = async () => {
    try {
        if (!settings) setLoading(true);
        else setRefreshing(true);

        // 1. Settings
        let settingsData = {
            enabled: false, mode: 'manual', humidifierTarget: targets.humidity.dayMax,
            extractorCycleOn: 15, extractorCycleOff: 15
        };
        try {
            const setRes = await fetch(`${API_BASE_URL}/api/settings`);
            if (setRes.ok) {
                const setData = await setRes.json();
                if (setData.environment) settingsData = setData.environment;
            }
        } catch (e) { console.warn("Settings API failed, using defaults"); }
        setSettings(settingsData as EnvironmentSettings);

        // 2. Devices
        const devs = await apiClient.getDeviceStates();
        setDevices(devs);

        // 3. Sensor Data
        const sensorsRes = await fetch(`${API_BASE_URL}/api/sensors/latest`);
        const sensorsData = await sensorsRes.json();

        const currentTemp = sensorsData.temperature || 0;
        const currentHum = sensorsData.humidity || 0;
        const currentVpdVal = sensorsData.vpd || 0;

        // Update crop steering context
        updateConditions({
          temperature: currentTemp,
          humidity: currentHum,
          vwc: sensorsData.substrateHumidity || 50
        });

        // 4. Get real history data for chart (past 24h)
        try {
            const historyData = await apiClient.getSensorHistory();
            if (historyData && historyData.length > 0) {
                // Format for chart - take last 48 points for ~24h
                const slicedData = historyData.slice(-48);

                // Pre-scan to find first valid values for initialization
                let lastVpd = slicedData.find((d: any) => d.vpd > 0)?.vpd || 1.0;
                let lastTemp = slicedData.find((d: any) => d.temperature > 0)?.temperature || 25;
                let lastHum = slicedData.find((d: any) => d.humidity > 0)?.humidity || 60;

                const chartData = slicedData.map((d: any) => {
                    // Get values or use last known (interpolation)
                    const vpd = (d.vpd != null && d.vpd > 0) ? d.vpd : null;
                    const temp = (d.temperature != null && d.temperature > 0) ? d.temperature : null;
                    const hum = (d.humidity != null && d.humidity > 0) ? d.humidity : null;

                    // Update last known values for interpolation
                    if (vpd !== null) lastVpd = vpd;
                    if (temp !== null) lastTemp = temp;
                    if (hum !== null) lastHum = hum;

                    return {
                        time: new Date(d.timestamp).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
                        vpd: (vpd ?? lastVpd).toFixed(2),
                        temp: (temp ?? lastTemp).toFixed(1),
                        hum: (hum ?? lastHum).toFixed(0)
                    };
                });
                setVpdData(chartData);
            }
        } catch (histErr) {
            console.warn('Could not load VPD history:', histErr);
        }

        setCurrentVpd(currentVpdVal);
    } catch (e) {
        console.error(e);
    } finally {
        setLoading(false);
        setRefreshing(false);
    }
  };

  useEffect(() => {
    let active = true;
    fetchData();

    // Polling
    const interval = setInterval(async () => {
        try {
            const devs = await apiClient.getDeviceStates();
            const sensorsRes = await fetch(`${API_BASE_URL}/api/sensors/latest`);
            const sensorsData = await sensorsRes.json();
            if (active) {
                setDevices(devs);
                setCurrentVpd(sensorsData.vpd || 0);
                updateConditions({ temperature: sensorsData.temperature, humidity: sensorsData.humidity, vwc: sensorsData.substrateHumidity || 50 });
            }
        } catch(e) {}
    }, 5000);

    return () => { active = false; clearInterval(interval); };
  }, [updateConditions, targets.humidity.dayMax]);

  const handleSave = async () => {
      if (!settings) return;
      setSaving(true);
      try {
        await fetch(`${API_BASE_URL}/api/settings`, {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ environment: settings })
        });
      } finally { setSaving(false); }
  };

  const handleToggle = async (id: string, currentStatus: boolean) => {
      setDevices((prev: any) => ({ ...prev, [id]: !currentStatus }));
      try { await apiClient.controlDevice(id, !currentStatus ? 'on' : 'off'); }
      catch (e) { setDevices((prev: any) => ({ ...prev, [id]: currentStatus })); }
  };

  if (loading || !settings) {
    return (
      <div className="flex items-center justify-center p-12">
        <CircularProgress sx={{ color: '#22d3ee' }} />
      </div>
    );
  }

  const stageLabel = currentStage.replace('_', ' ').toUpperCase();

  return (
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto space-y-6">
      {/* Header */}
      <PageHeader
        title="Ambiente & VPD"
        subtitle={`Control Climático Inteligente • ${stageLabel}`}
        icon={Thermometer}
        refreshing={refreshing}
        action={
            <div className="flex gap-2">
                <button
                    onClick={fetchData}
                    disabled={refreshing}
                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                >
                    <RefreshCw size={18} className={refreshing ? "animate-spin" : ""} />
                </button>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="btn-standard bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-2"
                >
                    <Save size={16} />
                    <span className="hidden sm:inline">{saving ? 'Guardando...' : 'Guardar'}</span>
                </button>
            </div>
        }
      />

      {/* AI CONTEXT PANEL - Environment Insights */}
      <AIContextPanel
          context="environment"
          temperature={devices.sensorAmbiente?.temperature || 0}
          humidity={devices.sensorAmbiente?.humidity || 0}
          vpd={currentVpd}
          vwc={0}
          compact
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* TOP ROW: METRIC CARDS */}
        <MetricCard
            label="Temperatura"
            value={devices.sensorAmbiente?.temperature || 24.5}
            unit="°C"
            icon={Thermometer}
            color="#f59e0b"
            subValue={`Max: ${targets.temp.dayMax}°C`}
        />
        <MetricCard
            label="Humedad Relativa"
            value={devices.sensorAmbiente?.humidity || 60}
            unit="%"
            icon={Droplet}
            color="#3b82f6"
            subValue={`Max: ${targets.humidity.dayMax}%`}
        />
        <MetricCard
            label="Déficit Presión (VPD)"
            value={currentVpd.toFixed(2)}
            unit="kPa"
            icon={Activity}
            color={currentVpd >= targets.vpd.min && currentVpd <= targets.vpd.max ? '#22c55e' : '#ef4444'}
            subValue="Óptimo"
        />
        <MetricCard
            label="Estado Extractor"
            value={devices.extractorControlador ? 'ON' : 'OFF'}
            unit=""
            icon={Wind}
            color="#8b5cf6"
            subValue={settings.mode === 'auto' ? 'Auto' : 'Manual'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* MIDDLE ROW: CHART & GAUGE */}
        <div className="lg:col-span-8 glass-panel p-4 min-h-[400px]">
            <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-white flex items-center gap-2">
                    <TrendingUp size={18} className="text-cyan-400" />
                    Histórico Climático (24h)
                </h3>
                <div className="flex gap-2">
                    <span className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20">
                        <div className="w-2 h-2 rounded-full bg-amber-500"></div> Temp
                    </span>
                    <span className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-blue-500/10 text-blue-500 border border-blue-500/20">
                        <div className="w-2 h-2 rounded-full bg-blue-500"></div> Humedad
                    </span>
                </div>
            </div>
            <ResponsiveContainer width="100%" height={320}>
                <AreaChart data={vpdData}>
                    <defs>
                        <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorHum" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={true} vertical={false} />
                    <XAxis dataKey="time" stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis yAxisId="left" domain={[15, 35]} stroke="#666" fontSize={12} tickLine={false} axisLine={false} unit="°C" width={30} />
                    <YAxis yAxisId="right" orientation="right" domain={[30, 90]} stroke="#666" fontSize={12} tickLine={false} axisLine={false} unit="%" width={30} />
                    <RechartsTooltip
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                        itemStyle={{ fontSize: '12px' }}
                    />
                    <Area yAxisId="left" type="monotone" dataKey="temp" stroke="#f59e0b" fillOpacity={1} fill="url(#colorTemp)" strokeWidth={2} />
                    <Area yAxisId="right" type="monotone" dataKey="hum" stroke="#3b82f6" fillOpacity={1} fill="url(#colorHum)" strokeWidth={2} />
                </AreaChart>
            </ResponsiveContainer>
        </div>

        <div className="lg:col-span-4 glass-panel p-4 flex flex-col items-center justify-center relative overflow-hidden">
             <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-br from-cyan-500/5 to-transparent pointer-events-none" />
             <h3 className="font-bold text-white mb-4 w-full text-center flex items-center justify-center gap-2 relative z-10">
                 <Activity size={18} className="text-green-400" />
                 VPD en Tiempo Real
             </h3>
             <div className="scale-110 my-4 relative z-10">
                <VPDGauge size="medium" showRecommendations={false} value={currentVpd} />
             </div>
             <div className="mt-4 text-center relative z-10">
                 <p className="text-xs text-gray-400 mb-1 uppercase tracking-wider">Rango Objetivo</p>
                 <p className="text-xl font-bold text-green-400 font-mono">
                     {targets.vpd.min} - {targets.vpd.max} <span className="text-xs text-gray-500">kPa</span>
                 </p>
             </div>
        </div>
      </div>

      {/* BOTTOM ROW: CONTROLS */}
      <div className="glass-panel p-0 overflow-hidden">
        {/* Custom Tabs */}
        <div className="flex border-b border-white/10">
            <button
                onClick={() => setTabIndex(0)}
                className={`px-6 py-4 flex items-center gap-2 text-sm font-medium transition-colors relative
                    ${tabIndex === 0 ? 'text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
            >
                <Zap size={18} className={tabIndex === 0 ? 'text-yellow-400' : ''} />
                Control Manual
                {tabIndex === 0 && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.5)]" />}
            </button>
            <button
                onClick={() => setTabIndex(1)}
                className={`px-6 py-4 flex items-center gap-2 text-sm font-medium transition-colors relative
                    ${tabIndex === 1 ? 'text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
            >
                <Target size={18} className={tabIndex === 1 ? 'text-blue-400' : ''} />
                Automatización
                {tabIndex === 1 && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.5)]" />}
            </button>
        </div>

        <div className="p-6">
            {tabIndex === 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                     <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${devices.extractorControlador ? "bg-purple-500/20 text-purple-400" : "bg-gray-800 text-gray-500"}`}>
                                <Fan size={20} />
                            </div>
                            <div>
                                <h4 className="font-semibold text-white">Extractor</h4>
                                <p className="text-xs text-gray-500">Salida Aire</p>
                            </div>
                        </div>
                        <Switch checked={!!devices.extractorControlador} onChange={() => handleToggle('extractorControlador', devices.extractorControlador)} color="secondary" />
                     </div>

                     <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${devices.humidifier ? "bg-blue-500/20 text-blue-400" : "bg-gray-800 text-gray-500"}`}>
                                <Droplet size={20} />
                            </div>
                            <div>
                                <h4 className="font-semibold text-white">Humidificador</h4>
                                <p className="text-xs text-gray-500">Xiaomi</p>
                            </div>
                        </div>
                        <Switch checked={!!devices.humidifier} onChange={() => handleToggle('humidifier', devices.humidifier)} color="info" />
                     </div>

                     <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${devices.deshumidifier ? "bg-orange-500/20 text-orange-400" : "bg-gray-800 text-gray-500"}`}>
                                <Wind size={20} />
                            </div>
                            <div>
                                <h4 className="font-semibold text-white">Deshumidificador</h4>
                                <p className="text-xs text-gray-500">Control Secado</p>
                            </div>
                        </div>
                        <Switch checked={!!devices.deshumidifier} onChange={() => handleToggle('deshumidifier', devices.deshumidifier)} color="warning" />
                     </div>

                     <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${devices.fans_circ ? "bg-green-500/20 text-green-400" : "bg-gray-800 text-gray-500"}`}>
                                <Fan size={20} />
                            </div>
                            <div>
                                <h4 className="font-semibold text-white">Ventiladores</h4>
                                <p className="text-xs text-gray-500">Circulación</p>
                            </div>
                        </div>
                        <Switch checked={!!devices.fans_circ} onChange={() => handleToggle('fans_circ', devices.fans_circ)} color="success" />
                     </div>
                </div>
            )}

            {tabIndex === 1 && (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <label className="text-sm text-gray-300 font-medium">Trigger Humidificador</label>
                            <span className="font-mono text-cyan-400 font-bold">{settings.humidifierTarget}%</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <Droplet size={18} className="text-cyan-500" />
                            <Slider
                                value={settings.humidifierTarget}
                                onChange={(_, v) => setSettings({ ...settings, humidifierTarget: v as number })}
                                min={30} max={90}
                                sx={{
                                    color: '#22d3ee',
                                    '& .MuiSlider-thumb': { boxShadow: '0 0 10px rgba(34,211,238,0.5)' }
                                }}
                            />
                        </div>
                        <p className="text-xs text-gray-500">
                            El humidificador se encenderá automáticamente cuando la humedad caiga por debajo de este valor.
                        </p>
                    </div>

                    <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10 flex gap-3">
                        <Cpu size={20} className="text-blue-400 shrink-0 mt-0.5" />
                        <div>
                            <h5 className="text-sm font-semibold text-blue-200 mb-1">Control PID Activo</h5>
                            <p className="text-xs text-blue-300/70">
                                El sistema ajustará la potencia de los dispositivos gradualmente para mantener el VPD estable en {targets.vpd.min}-{targets.vpd.max} kPa, evitando oscilaciones bruscas.
                            </p>
                        </div>
                    </div>
                 </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default Environment;
