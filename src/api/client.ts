// src/api/client.ts
// Centralized API client for backend calls

// Read API base URL from environment or use default
// Read API base URL from environment (Vite/Firebase) or use default (Localhost)
// NOTE: We prefer VITE_API_URL to allow switching between Local and Cloud.
// export const API_BASE_URL = 'https://pkgrower.onrender.com'; // Hardcoded
export const API_BASE_URL = import.meta.env.PROD ? '' : (import.meta.env.VITE_API_URL || 'http://localhost:3000');

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
        'x-api-key': import.meta.env.VITE_API_KEY || '3ea88c89-43e8-495b-be3c-56b541a8cc49', // Fallback for local dev if env missing
        ...options?.headers,
      },
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`)
    }

    return response.json()
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
    return this.request('/api/devices/all', {
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
}

// Export singleton instance
export const apiClient = new APIClient(API_BASE_URL)
