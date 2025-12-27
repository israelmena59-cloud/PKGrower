import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Slider
} from '@mui/material';
import {
  Power,
  RefreshCw,
  Settings as SettingsIcon,
  Zap,
  Droplets,
  Thermometer,
  Video,
  Server,
  Activity,
  Wifi,
  MoreVertical,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { apiClient } from '../api/client';
import DeviceConfigModal from '../components/devices/DeviceConfigModal';
import { PageHeader } from '../components/layout/PageHeader';
import { useRooms } from '../context/RoomContext';

interface Device {
  id: string;
  name: string;
  type: 'light' | 'sensor' | 'switch' | 'camera' | 'humidifier' | 'pump' | 'other';
  status: boolean;
  platform: 'tuya' | 'xiaomi' | 'meross';
  value?: number | string;
  unit?: string;
  description?: string;
  lastUpdate?: string;
  properties?: Record<string, any>;
}

const DevicesPage: React.FC = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [openControlDialog, setOpenControlDialog] = useState(false);
  const [openConfigModal, setOpenConfigModal] = useState(false);
  const [configDevice, setConfigDevice] = useState<any>(null);
  const [controlValue, setControlValue] = useState<number>(50);
  const [refreshing, setRefreshing] = useState(false);
  const { rooms } = useRooms();

  // Find which room a device belongs to
  const getDeviceRoom = (deviceId: string) => {
    return rooms.find(room =>
      room.assignedDevices?.includes(deviceId) ||
      room.assignedSensors?.includes(deviceId)
    );
  };

  // Obtener dispositivos
  useEffect(() => {
    fetchDevices();
    const interval = setInterval(fetchDevices, 10000); // Actualizar cada 10 segundos
    return () => clearInterval(interval);
  }, []);

  const fetchDevices = async () => {
    try {
      if (devices.length === 0) setLoading(true);
      else setRefreshing(true);

      const response = await apiClient.getAllDevices();

      // Smart Merge: Respect local optimistic updates
      setDevices(currentDevices => {
        if (!response || !Array.isArray(response)) return currentDevices;

        return response.map((newDev: Device) => {
             const existing = currentDevices.find(d => d.id === newDev.id);
             // If controlled locally in last 5 seconds, keep local state to prevent flickering
             if (existing && (existing as any).lastControlTime && Date.now() - (existing as any).lastControlTime < 5000) {
                 return existing;
             }
             return newDev;
        });
      });

    } catch (error) {
      console.error('Error fetching devices:', error);
      // Datos simulados si la API falla
      if (devices.length === 0) {
        setDevices([
          {
            id: 'tuya-sensor-1', name: 'Sensor Sustrato 1', type: 'sensor', status: true, platform: 'tuya',
            value: 65, unit: '%', description: 'Sensor de humedad del sustrato', lastUpdate: new Date().toLocaleTimeString(),
          },
          {
            id: 'tuya-light-1', name: 'Panel LED 1', type: 'light', status: true, platform: 'tuya',
            value: 100, unit: '%', description: 'Panel LED de cultivo', lastUpdate: new Date().toLocaleTimeString(),
          },
          {
            id: 'xiaomi-humidifier', name: 'Humidificador', type: 'humidifier', status: true, platform: 'xiaomi',
            value: 55, unit: '%', description: 'Humidificador inteligente', lastUpdate: new Date().toLocaleTimeString(),
          },
          {
            id: 'tuya-pump', name: 'Bomba de Agua', type: 'pump', status: false, platform: 'tuya',
            description: 'Sistema de riego automático', lastUpdate: new Date().toLocaleTimeString(),
          },
        ]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleToggleDevice = async (device: Device) => {
    // Optimistic Update
    const originalStatus = device.status;
    const newStatus = !originalStatus;

    // Update local state immediately
    setDevices(prev => prev.map(d =>
        d.id === device.id ? {
            ...d,
            status: newStatus,
            // Add a temporary flag/timestamp to ignore polling updates for 5 seconds
            lastControlTime: Date.now()
        } as any : d
    ));

    try {
      const action = newStatus ? 'on' : 'off';
      await apiClient.controlDevice(device.id, action);
    } catch (error) {
      console.error('Error toggling device:', error);
      // Rollback on error
      setDevices(prev => prev.map(d =>
        d.id === device.id ? { ...d, status: originalStatus } : d
      ));
      alert('Error al controlar dispositivo');
    }
  };

  const handleOpenControlDialog = (device: Device) => {
    setSelectedDevice(device);
    setControlValue(typeof device.value === 'number' ? device.value : 50);
    setOpenControlDialog(true);
  };

  const handleApplyControl = async () => {
    if (!selectedDevice) return;

    try {
      const action = controlValue > 50 ? 'on' : 'off'; // Simplified logic, ideally should send value
      // Note: Backend might need update to accept specific values, currently just on/off for most
      await apiClient.controlDevice(selectedDevice.id, action);
      setDevices(
        devices.map(d =>
          d.id === selectedDevice.id
            ? { ...d, value: controlValue, lastUpdate: new Date().toLocaleTimeString() }
            : d
        )
      );
      setOpenControlDialog(false);
    } catch (error) {
      console.error('Error controlling device:', error);
      alert('Error al aplicar control');
    }
  };

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'light': return <Zap size={20} />;
      case 'sensor': return <Thermometer size={20} />;
      case 'camera': return <Video size={20} />;
      case 'humidifier': return <Droplets size={20} />;
      case 'pump': return <Zap size={20} />; // Maybe Waves or Droplet
      default: return <Power size={20} />;
    }
  };

  const getDeviceColorClass = (type: string) => {
    switch (type) {
      case 'light': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
      case 'sensor': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
      case 'camera': return 'text-red-400 bg-red-400/10 border-red-400/20';
      case 'humidifier': return 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20';
      case 'pump': return 'text-green-400 bg-green-400/10 border-green-400/20';
      default: return 'text-purple-400 bg-purple-400/10 border-purple-400/20';
    }
  };

  const getPlatformLabel = (platform: string) => {
    if (platform === 'tuya') return 'Tuya Smart';
    if (platform === 'xiaomi') return 'Xiaomi Home';
    if (platform === 'meross') return 'Meross';
    return platform;
  };

  // Agrupar dispositivos por plataforma
  const tuyaDevices = devices.filter(d => d.platform === 'tuya');
  const xiaomiDevices = devices.filter(d => d.platform === 'xiaomi');
  const merossDevices = devices.filter(d => d.platform === 'meross');

  // Helper to render device card
  const DeviceCard = ({ device }: { device: Device }) => (
    <div className={`glass-panel p-0 overflow-hidden transition-all duration-300 hover:shadow-[0_0_20px_rgba(59,130,246,0.15)] group ${!device.status ? 'opacity-80' : ''}`}>
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl border ${getDeviceColorClass(device.type)} transition-colors`}>
              {getDeviceIcon(device.type)}
            </div>
            <div>
              <h3 className="font-semibold text-white leading-tight">{device.name}</h3>
              <p className="text-xs text-gray-400 mt-0.5 capitalize">{device.type}</p>
            </div>
          </div>
          <div className={`w-2.5 h-2.5 rounded-full ${device.status ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500/50'}`} />
        </div>

        {/* Info */}
        <div className="space-y-2 mb-4">
           {device.description && (
             <p className="text-xs text-gray-400 line-clamp-2 min-h-[2.5em]">{device.description}</p>
           )}
           {device.value !== undefined && (
             <div className="flex items-baseline gap-1">
               <span className="text-xl font-bold text-white">{device.value}</span>
               <span className="text-xs text-gray-500">{device.unit}</span>
             </div>
           )}
           {!device.value && device.value !== 0 && (
              <div className="h-7 flex items-end">
                  <span className="text-xs text-gray-600">Sin lecturas recientes</span>
              </div>
           )}
        </div>

        {/* Footer / Controls */}
        <div className="flex items-center gap-2 pt-3 border-t border-white/5">
            {['light', 'switch', 'pump', 'humidifier'].includes(device.type) && (
             <button
                onClick={() => handleToggleDevice(device)}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all
                  ${device.status
                    ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-lg shadow-emerald-900/20 hover:from-emerald-500 hover:to-emerald-400'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                  }`}
             >
                <Power size={14} />
                {device.status ? 'ON' : 'OFF'}
             </button>
            )}

            {['light', 'pump', 'humidifier'].includes(device.type) && (
                <button
                  onClick={() => handleOpenControlDialog(device)}
                  className="p-1.5 rounded-lg bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
                >
                    <SettingsIcon size={16} />
                </button>
            )}

            <button
                onClick={() => {
                  setConfigDevice(device);
                  setOpenConfigModal(true);
                }}
                className="p-1.5 rounded-lg bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white transition-colors ml-auto"
                title="Configurar"
            >
                <MoreVertical size={16} />
            </button>
        </div>
      </div>

      {/* Last Update Footer */}
      <div className="px-4 py-2 bg-black/20 text-[10px] text-gray-600 flex justify-between items-center">
        <span>Actualizado: {device.lastUpdate || '--:--'}</span>
        <div className="flex items-center gap-2">
          {(() => {
            const room = getDeviceRoom(device.id);
            return room ? (
              <span className="px-1.5 py-0.5 rounded text-[10px] border" style={{
                backgroundColor: `${room.color}20`,
                borderColor: `${room.color}40`,
                color: room.color
              }}>
                {room.name}
              </span>
            ) : null;
          })()}
          <span>{getPlatformLabel(device.platform)}</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto space-y-6">
      <PageHeader
        title="Control de Dispositivos"
        subtitle="Gestiona y monitorea todos tus dispositivos IoT conectados"
        icon={Power}
        refreshing={refreshing}
        action={
          <button
            onClick={fetchDevices}
            disabled={refreshing || loading}
            className="btn-standard glass-card-hover border border-white/10 flex items-center gap-2 text-sm"
          >
            <RefreshCw size={16} className={refreshing || loading ? "animate-spin" : ""} />
            <span className="hidden sm:inline">Actualizar</span>
          </button>
        }
      />

      {loading && devices.length === 0 ? (
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
            {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-48 rounded-2xl bg-white/5 border border-white/5"></div>
            ))}
         </div>
      ) : (
        <>
            {/* Stats Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="glass-panel p-4 flex flex-col items-center justify-center text-center">
                    <span className="text-3xl font-bold text-white mb-1">{devices.length}</span>
                    <span className="text-xs text-gray-400 uppercase tracking-wider">Total</span>
                </div>
                <div className="glass-panel p-4 flex flex-col items-center justify-center text-center border-l-4 border-l-green-500">
                    <div className="flex items-center gap-2 mb-1">
                        <CheckCircle2 size={16} className="text-green-500" />
                        <span className="text-3xl font-bold text-green-500">{devices.filter(d => d.status).length}</span>
                    </div>
                    <span className="text-xs text-gray-400 uppercase tracking-wider">Activos</span>
                </div>
                <div className="glass-panel p-4 flex flex-col items-center justify-center text-center border-l-4 border-l-red-500/50">
                     <div className="flex items-center gap-2 mb-1">
                        <XCircle size={16} className="text-red-500/50" />
                        <span className="text-3xl font-bold text-red-500/70">{devices.filter(d => !d.status).length}</span>
                    </div>
                    <span className="text-xs text-gray-400 uppercase tracking-wider">Inactivos</span>
                </div>
                <div className="glass-panel p-4 flex flex-col items-center justify-center text-center">
                    <div className="flex gap-2 mb-2">
                        {tuyaDevices.length > 0 && <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-500/20 text-blue-400 border border-blue-500/30">Tuya</span>}
                        {xiaomiDevices.length > 0 && <span className="px-1.5 py-0.5 rounded text-[10px] bg-green-500/20 text-green-400 border border-green-500/30">Xiaomi</span>}
                        {merossDevices.length > 0 && <span className="px-1.5 py-0.5 rounded text-[10px] bg-purple-500/20 text-purple-400 border border-purple-500/30">Meross</span>}
                    </div>
                    <span className="text-xs text-gray-400 uppercase tracking-wider">Plataformas</span>
                </div>
            </div>

            {/* Device Groups */}
            <div className="space-y-8">
                {tuyaDevices.length > 0 && (
                    <section>
                        <div className="flex items-center gap-2 mb-4 px-1">
                            <Server size={18} className="text-blue-400" />
                            <h3 className="text-lg font-medium text-white">Tuya Smart</h3>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">{tuyaDevices.length}</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {tuyaDevices.map(device => <DeviceCard key={device.id} device={device} />)}
                        </div>
                    </section>
                )}

                {xiaomiDevices.length > 0 && (
                    <section>
                        <div className="flex items-center gap-2 mb-4 px-1">
                            <Wifi size={18} className="text-green-400" />
                            <h3 className="text-lg font-medium text-white">Xiaomi Home</h3>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">{xiaomiDevices.length}</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {xiaomiDevices.map(device => <DeviceCard key={device.id} device={device} />)}
                        </div>
                    </section>
                )}

                {merossDevices.length > 0 && (
                    <section>
                        <div className="flex items-center gap-2 mb-4 px-1">
                            <Activity size={18} className="text-purple-400" />
                            <h3 className="text-lg font-medium text-white">Meross</h3>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">{merossDevices.length}</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {merossDevices.map(device => <DeviceCard key={device.id} device={device} />)}
                        </div>
                    </section>
                )}
            </div>
        </>
      )}

      {/* Control Dialog - Styled */}
      <Dialog
        open={openControlDialog}
        onClose={() => setOpenControlDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: '#0f172a',
            backgroundImage: 'none',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '16px'
          }
        }}
      >
        <DialogTitle sx={{ color: 'white', display: 'flex', alignItems: 'center', gap: 1 }}>
          <SettingsIcon size={20} className="text-cyan-400" />
          Controlar {selectedDevice?.name}
        </DialogTitle>
        <DialogContent>
          <div className="py-4">
            {selectedDevice?.type === 'humidifier' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-400">Humedad Objetivo</span>
                    <span className="text-cyan-400 font-bold">{controlValue}%</span>
                </div>
                <Slider
                  value={controlValue}
                  onChange={(_, value) => setControlValue(value as number)}
                  min={0}
                  max={100}
                  step={5}
                  sx={{
                    color: '#22d3ee',
                    '& .MuiSlider-thumb': { boxShadow: '0 0 10px rgba(34,211,238,0.5)' }
                  }}
                />
              </div>
            )}
            {['light', 'pump'].includes(selectedDevice?.type || '') && (
              <div className="space-y-4">
                 <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-400">Intensidad</span>
                    <span className="text-yellow-400 font-bold">{controlValue}%</span>
                </div>
                <Slider
                  value={controlValue}
                  onChange={(_, value) => setControlValue(value as number)}
                  min={0}
                  max={100}
                  step={10}
                  sx={{
                    color: '#facc15',
                     '& .MuiSlider-thumb': { boxShadow: '0 0 10px rgba(250,204,21,0.5)' }
                  }}
                />
              </div>
            )}
          </div>
        </DialogContent>
        <DialogActions sx={{ p: 3, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <Button onClick={() => setOpenControlDialog(false)} sx={{ color: 'rgba(255,255,255,0.6)' }}>Cancelar</Button>
          <Button
            onClick={handleApplyControl}
            variant="contained"
            sx={{
               bgcolor: '#2563eb',
               '&:hover': { bgcolor: '#1d4ed8' }
            }}
          >
            Aplicar Cambios
          </Button>
        </DialogActions>
      </Dialog>

      {/* Device Config Modal */}
      <DeviceConfigModal
        open={openConfigModal}
        onClose={() => setOpenConfigModal(false)}
        device={configDevice}
        onSave={() => {
          fetchDevices();
          setOpenConfigModal(false);
        }}
      />
    </div>
  );
};

export default DevicesPage;
