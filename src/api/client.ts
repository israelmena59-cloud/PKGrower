// src/api/client.ts
// Centralized API client for backend calls

// API Base URL Configuration:
// - Development: localhost:3000
// - Production: Google Cloud VM
// - Override: Set VITE_API_URL environment variable
const GCP_BACKEND = 'http://34.67.217.13:3000';
export const API_BASE_URL = (import.meta as any).env.VITE_API_URL ||
  ((import.meta as any).env.PROD ? GCP_BACKEND : 'http://localhost:3000');

export interface SensorData {
  timestamp: string
  temperature: number
  humidity: number
  substrateHumidity: number
  vpd: number
  sh1?: number
  sh2?: number
  sh3?: number
}

export interface DeviceStates {
  controladorLuzRoja: boolean
  extractorControlador: boolean
  bombaControlador: boolean
  humidifier: boolean
  [key: string]: boolean
}

export interface SoilSensor {
  sensor: string
  temperature: number | null
  humidity: number | null
  lastUpdate: string
}

export interface CameraStatus {
  power: boolean
  recording: boolean
  timestamp: string
}

export interface HumidifierStatus {
  power: boolean
  temperature: number | null
  humidity: number | null
  targetHumidity: number
  timestamp: string
}

export interface TuyaDevice {
  key: string
  name: string
  id: string
  category: string
  status: string
  lastUpdate?: string
}

export interface ChatMessage {
  text: string
  sender: 'user' | 'ai'
}

class APIClient {
  private baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  public async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_KEY) || '3ea88c89-43e8-495b-be3c-56b541a8cc49',
        ...options?.headers,
      },
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`)
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
        return response.json();
    }

    // If not JSON but OK, return success (prevents crashes on simple OK responses)
    if (response.ok) {
        return { success: true, message: 'Operation completed (No JSON response)' } as any;
    }

    const text = await response.text();
    console.warn(`API Expected JSON but got ${contentType}:`, text.substring(0, 100));
    throw new Error(`API returned non-JSON response (${response.status})`);
  }

  // Sensors
  async getLatestSensors(): Promise<SensorData> {
    return this.request<SensorData>('/api/sensors/latest')
  }

  async getSensorHistory(): Promise<SensorData[]> {
    return this.request<SensorData[]>('/api/sensors/history')
  }

  async getHistoryRange(range: string): Promise<any[]> {
    return this.request<any[]>(`/api/history?range=${range}`)
  }

  async getHistoryDateRange(start: string, end: string): Promise<any[]> {
    return this.request<any[]>(`/api/history?start=${start}&end=${end}`)
  }

  // Devices
  async getDeviceStates(): Promise<DeviceStates> {
    return this.request<DeviceStates>('/api/devices')
  }

  async refreshDevices(): Promise<{ success: boolean }> {
    return this.request('/api/devices/refresh', { method: 'POST' })
  }

  async toggleDevice(
    deviceId: keyof DeviceStates
  ): Promise<{ id: string; newState: boolean }> {
    return this.request(`/api/device/${deviceId}/toggle`, {
      method: 'POST',
    })
  }

  async controlDevice(deviceId: string, action: 'on' | 'off'): Promise<{ success: boolean; deviceId: string; action: string }> {
    return this.request(`/api/device/${deviceId}/control`, {
      method: 'POST',
      body: JSON.stringify({ action }),
    })
  }

  async pulseDevice(deviceId: string, duration: number): Promise<{ success: boolean; message: string }> {
    return this.request(`/api/device/${deviceId}/pulse`, {
      method: 'POST',
      body: JSON.stringify({ duration }),
    })
  }

  // Tuya Devices
  async getTuyaDevices(): Promise<{ devices: TuyaDevice[]; total: number }> {
    return this.request<{ devices: TuyaDevice[]; total: number }>('/api/devices/tuya')
  }

  // Sensors - Soil
  async getSoilSensors(): Promise<SoilSensor[]> {
    return this.request<SoilSensor[]>('/api/sensors/soil')
  }

  // Camera - Xiaomi
  async getCameraStatus(): Promise<CameraStatus> {
    return this.request<CameraStatus>('/api/device/camera/status')
  }

  async recordCameraStart(duration?: number): Promise<{ success: boolean; message: string; duration?: number }> {
    return this.request('/api/device/camera/record/start', {
      method: 'POST',
      body: JSON.stringify({ duration: duration || 60 }),
    })
  }

  async recordCameraStop(): Promise<{ success: boolean; message: string }> {
    return this.request('/api/device/camera/record/stop', {
      method: 'POST',
    })
  }

  async capturePhoto(): Promise<{ success: boolean; message: string; imageUrl?: string; timestamp: string }> {
    return this.request('/api/device/camera/capture', {
      method: 'POST',
    })
  }

  // Humidifier - Xiaomi
  async getHumidifierStatus(): Promise<HumidifierStatus> {
    return this.request<HumidifierStatus>('/api/device/humidifier/status')
  }

  async controlHumidifierExtractor(targetHumidity: number, autoMode: boolean = true): Promise<{ success: boolean; humidifierAction: string; extractorAction: string; targetHumidity: number; timestamp: string }> {
    return this.request('/api/automation/humidifier-extractor', {
      method: 'POST',
      body: JSON.stringify({ targetHumidity, autoMode }),
    })
  }

  // Chat/AI
  async sendChatMessage(message: string): Promise<{ reply: string }> {
    return this.request<{ reply: string }>('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ message }),
    })
  }

  // Calendar Events
  async getCalendarEvents(): Promise<any[]> {
    return this.request('/api/calendar/events', {
      method: 'GET',
    })
  }

  async addCalendarEvent(event: any): Promise<{ success: boolean; event: any }> {
    return this.request('/api/calendar/events', {
      method: 'POST',
      body: JSON.stringify(event),
    })
  }

  async deleteCalendarEvent(eventId: string): Promise<{ success: boolean }> {
    return this.request(`/api/calendar/events/${eventId}`, {
      method: 'DELETE',
    })
  }

  // Devices - Get all
  async getAllDevices(): Promise<any[]> {
    return this.request('/api/devices/list', {
      method: 'GET',
    })
  }

  // Settings
  async getSettings(): Promise<any> {
    return this.request('/api/settings', {
      method: 'GET',
    })
  }

  async saveSettings(settings: any): Promise<{ success: boolean }> {
    return this.request('/api/settings', {
      method: 'POST',
      body: JSON.stringify(settings),
    })
  }

  async verify2FA(code: string, context: any): Promise<{ success: boolean; message?: string }> {
    return this.request('/api/settings/verify-2fa', {
      method: 'POST',
      body: JSON.stringify({ code, context }),
    })
  }

  async resetSettings(): Promise<{ success: boolean }> {
    return this.request('/api/settings/reset', {
      method: 'POST',
    })
  }

  // Xiaomi Auth (Puppeteer-based OAuth)
  async loginXiaomi(credentials: { username: string; password: string }): Promise<{
    success: boolean;
    sessionId: string;
    status: string;
    message?: string;
  }> {
    return this.request('/api/xiaomi/auth/start', {
      method: 'POST',
      body: JSON.stringify(credentials)
    });
  }

  async getXiaomiAuthStatus(sessionId: string): Promise<{
    status: string;
    message?: string;
    error?: string;
    tokens?: any;
  }> {
    return this.request(`/api/xiaomi/auth/status/${sessionId}`, {
      method: 'GET'
    });
  }

  async verifyXiaomi2FA(data: { sessionId: string; code: string }): Promise<{
    success: boolean;
    status: string;
    error?: string;
  }> {
    return this.request('/api/xiaomi/auth/2fa', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // ==========================================
  // CROP STEERING API
  // ==========================================

  async getCropSteeringStatus(): Promise<{
    success: boolean;
    enabled: boolean;
    direction: string;
    phase: string;
    phaseMessage: string;
    isInWindow: boolean;
    lightsOn: boolean;
    currentVWC: number;
    targetVWC: number;
    action: string;
    reasoning: string;
    nextAction: string;
    irrigationCountToday: number;
    lastIrrigationTime: string | null;
    timing: {
      minutesSinceLightsOn: number | null;
      minutesUntilP1: number | null;
      minutesUntilP2End: number | null;
    };
  }> {
    return this.request('/api/crop-steering/status');
  }

  async getCropSteeringSchedule(): Promise<{
    success: boolean;
    direction: string;
    lightsOn: string;
    lightsOff: string;
    dayLengthHours: number;
    p1Start: string;
    p2End: string;
    irrigationWindowHours: number;
    profile: {
      eventSize: string;
      maxEvents: number;
      minInterval: string;
      drybackP3: string;
      vpdTarget: string;
    };
  }> {
    return this.request('/api/crop-steering/schedule');
  }

  async getCropSteeringProfiles(): Promise<{
    success: boolean;
    profiles: Record<string, any>;
  }> {
    return this.request('/api/crop-steering/profiles');
  }

  async setCropSteeringDirection(direction: 'vegetative' | 'generative' | 'balanced' | 'ripening'): Promise<{
    success: boolean;
    direction: string;
  }> {
    return this.request('/api/crop-steering/direction', {
      method: 'POST',
      body: JSON.stringify({ direction })
    });
  }

  async toggleCropSteeringAutomation(enabled: boolean): Promise<{
    success: boolean;
    enabled: boolean;
  }> {
    return this.request('/api/crop-steering/toggle', {
      method: 'POST',
      body: JSON.stringify({ enabled })
    });
  }

  async triggerManualIrrigation(eventSize?: number, force?: boolean): Promise<{
    success: boolean;
    message: string;
    eventSize: number;
    volumeMl: number;
    durationMs: number;
  }> {
    return this.request('/api/crop-steering/manual-irrigation', {
      method: 'POST',
      body: JSON.stringify({ eventSize, force })
    });
  }
}

// Export singleton instance
export const apiClient = new APIClient(API_BASE_URL)

