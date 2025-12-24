// src/api/client.ts
// Centralized API client for backend calls

// Read API base URL from environment (Vite/Firebase) or use default (Localhost)
// NOTE: We prefer VITE_API_URL to allow switching between Local and Cloud Run.
export const API_BASE_URL = (import.meta as any).env.VITE_API_URL || ((import.meta as any).env.PROD ? '' : 'http://localhost:3000');

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
    if (!contentType || !contentType.includes('application/json')) {
        // If we get HTML (e.g. 404 page or index.html fallback), throw generic error
        const text = await response.text();
        console.warn(`API Expected JSON but got ${contentType}:`, text.substring(0, 100)); // Log for debug
        throw new Error(`API returned non-JSON response (${response.status})`);
    }

    return response.json();
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

  // Enhanced AI Chat with Function Calling
  async sendChatMessageV2(
    message: string,
    sessionId: string = 'default'
  ): Promise<{ reply: string; functionsExecuted?: Array<{ name: string; args: any; result: any }> }> {
    return this.request('/api/chat/v2', {
      method: 'POST',
      body: JSON.stringify({ message, sessionId }),
    })
  }

  // Streaming Chat with SSE
  async *streamChatMessage(
    message: string,
    sessionId: string = 'default'
  ): AsyncGenerator<{ text?: string; done?: boolean; error?: string }> {
    const response = await fetch(`${this.baseUrl}/api/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_KEY) || '3ea88c89-43e8-495b-be3c-56b541a8cc49',
      },
      body: JSON.stringify({ message, sessionId }),
    });

    if (!response.ok) {
      throw new Error(`Stream error: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No reader available');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            yield data;
            if (data.done) return;
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    }
  }

  // Get AI Insights
  async getAIInsights(): Promise<{ insights: Array<{ type: 'success' | 'warning' | 'critical'; message: string; action: string | null }> }> {
    return this.request('/api/ai/insights', {
      method: 'GET',
    })
  }

  // Analyze Image with Vision
  async analyzeImage(imageFile: File, prompt?: string): Promise<{ analysis: string; timestamp: string }> {
    const formData = new FormData();
    formData.append('image', imageFile);
    if (prompt) formData.append('prompt', prompt);

    const response = await fetch(`${this.baseUrl}/api/ai/analyze-image`, {
      method: 'POST',
      headers: {
        'x-api-key': (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_KEY) || '3ea88c89-43e8-495b-be3c-56b541a8cc49',
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
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
}

// Export singleton instance
export const apiClient = new APIClient(API_BASE_URL)
