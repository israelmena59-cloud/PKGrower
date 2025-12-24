/**
 * PKGrower AI Service - Enhanced Gemini Integration
 *
 * Features:
 * - Function Calling for device control
 * - Grounding with Google Search
 * - Streaming responses (SSE)
 * - Intelligent context injection
 */

const { GoogleGenerativeAI, FunctionDeclarationSchemaType } = require("@google/generative-ai");

// ============================================================================
// FUNCTION DECLARATIONS FOR DEVICE CONTROL
// ============================================================================

const deviceFunctions = [
  {
    name: "toggle_device",
    description: "Enciende o apaga un dispositivo del cultivo como luces, humidificador, bomba de agua, extractores, etc.",
    parameters: {
      type: FunctionDeclarationSchemaType.OBJECT,
      properties: {
        deviceId: {
          type: FunctionDeclarationSchemaType.STRING,
          description: "ID del dispositivo. Ejemplos: luzPanel1, luzPanel2, luzPanel3, luzPanel4, humidifier, bombaControlador, extractorControlador, deshumidificador"
        },
        action: {
          type: FunctionDeclarationSchemaType.STRING,
          enum: ["on", "off"],
          description: "Acción a realizar: 'on' para encender, 'off' para apagar"
        }
      },
      required: ["deviceId", "action"]
    }
  },
  {
    name: "get_sensor_data",
    description: "Obtiene los datos actuales de todos los sensores del cultivo incluyendo temperatura, humedad, VPD y humedad del sustrato.",
    parameters: {
      type: FunctionDeclarationSchemaType.OBJECT,
      properties: {}
    }
  },
  {
    name: "set_irrigation",
    description: "Programa o ejecuta un riego con los parámetros especificados.",
    parameters: {
      type: FunctionDeclarationSchemaType.OBJECT,
      properties: {
        durationSeconds: {
          type: FunctionDeclarationSchemaType.NUMBER,
          description: "Duración del riego en segundos"
        },
        volumeMl: {
          type: FunctionDeclarationSchemaType.NUMBER,
          description: "Volumen objetivo en mililitros (opcional, usa la bomba calibrada)"
        }
      },
      required: ["durationSeconds"]
    }
  },
  {
    name: "get_device_states",
    description: "Obtiene el estado actual (encendido/apagado) de todos los dispositivos conectados.",
    parameters: {
      type: FunctionDeclarationSchemaType.OBJECT,
      properties: {}
    }
  },
  {
    name: "search_growing_info",
    description: "Busca información actualizada sobre cultivo, cannabis, hidroponía, nutrición de plantas, problemas comunes, etc.",
    parameters: {
      type: FunctionDeclarationSchemaType.OBJECT,
      properties: {
        query: {
          type: FunctionDeclarationSchemaType.STRING,
          description: "Consulta de búsqueda sobre cultivo"
        }
      },
      required: ["query"]
    }
  }
];

// ============================================================================
// AI SERVICE CLASS
// ============================================================================

class AIService {
  constructor(apiKey, dependencies = {}) {
    this.apiKey = apiKey;
    this.genAI = new GoogleGenerativeAI(apiKey);

    // Dependencies for function execution
    this.deviceController = dependencies.deviceController || null;
    this.sensorReader = dependencies.sensorReader || null;
    this.irrigationController = dependencies.irrigationController || null;

    // Chat history for context
    this.chatHistories = new Map(); // sessionId -> history[]

    // System prompt
    this.systemPrompt = `Eres un experto agrónomo y asistente de cultivo para PKGrower, un sistema inteligente de control de cultivo indoor.

CAPACIDADES:
- Puedes controlar dispositivos (luces, humidificador, extractores, bomba de riego) usando las funciones disponibles
- Tienes acceso a sensores en tiempo real (temperatura, humedad, VPD, humedad del sustrato)
- Puedes programar riegos
- Puedes buscar información actualizada sobre cultivo

DISPOSITIVOS DISPONIBLES:
- luzPanel1, luzPanel2, luzPanel3, luzPanel4: Paneles LED de iluminación
- humidifier: Humidificador Xiaomi
- deshumidificador: Deshumidificador
- bombaControlador: Controlador de bomba de riego
- extractorControlador: Extractor de aire

ESTILO:
- Responde en español de forma clara y concisa
- Usa emojis para hacer las respuestas más amigables 🌱💡💧
- Siempre explica qué acciones vas a tomar antes de ejecutarlas
- Proporciona recomendaciones basadas en los datos cuando sea relevante

VALORES ÓPTIMOS DE REFERENCIA:
- Temperatura: 22-28°C (vegetativo), 20-26°C (floración)
- Humedad: 60-70% (vegetativo), 40-50% (floración)
- VPD: 0.8-1.2 kPa (vegetativo), 1.0-1.5 kPa (floración)
- Humedad sustrato (VWC): 40-60%`;
  }

  /**
   * Get or create model with function calling
   */
  getModel(enableFunctionCalling = true) {
    const config = {
      model: "gemini-2.5-flash-preview-05-20",
      generationConfig: {
        maxOutputTokens: 1500,
        temperature: 0.7,
      },
    };

    if (enableFunctionCalling) {
      config.tools = [{
        functionDeclarations: deviceFunctions
      }];
    }

    return this.genAI.getGenerativeModel(config);
  }

  /**
   * Execute a function call requested by the model
   */
  async executeFunction(functionCall) {
    const { name, args } = functionCall;
    console.log(`[AI] Ejecutando función: ${name}`, args);

    try {
      switch (name) {
        case 'toggle_device':
          return await this.handleToggleDevice(args);

        case 'get_sensor_data':
          return await this.handleGetSensorData();

        case 'set_irrigation':
          return await this.handleSetIrrigation(args);

        case 'get_device_states':
          return await this.handleGetDeviceStates();

        case 'search_growing_info':
          return await this.handleSearch(args);

        default:
          return { error: `Función desconocida: ${name}` };
      }
    } catch (error) {
      console.error(`[AI] Error ejecutando ${name}:`, error);
      return { error: error.message };
    }
  }

  async handleToggleDevice({ deviceId, action }) {
    if (!this.deviceController) {
      return { error: "Controlador de dispositivos no disponible" };
    }

    const result = await this.deviceController.control(deviceId, action);
    return {
      success: true,
      deviceId,
      action,
      newState: action === 'on',
      message: `${deviceId} ahora está ${action === 'on' ? 'ENCENDIDO' : 'APAGADO'}`
    };
  }

  async handleGetSensorData() {
    if (!this.sensorReader) {
      return { error: "Lector de sensores no disponible" };
    }

    return await this.sensorReader.getLatest();
  }

  async handleSetIrrigation({ durationSeconds, volumeMl }) {
    if (!this.irrigationController) {
      return { error: "Controlador de riego no disponible" };
    }

    return await this.irrigationController.startIrrigation(durationSeconds, volumeMl);
  }

  async handleGetDeviceStates() {
    if (!this.deviceController) {
      return { error: "Controlador de dispositivos no disponible" };
    }

    return await this.deviceController.getStates();
  }

  async handleSearch({ query }) {
    // Use Gemini with grounding for search (simplified - actual would use Google Search API)
    const searchModel = this.genAI.getGenerativeModel({
      model: "gemini-2.5-flash-preview-05-20",
      // Note: Google Search grounding requires specific API setup
    });

    const result = await searchModel.generateContent(
      `Proporciona información actualizada y verificada sobre: ${query}. Enfócate en cultivo indoor, cannabis, hidroponía o agricultura según el contexto.`
    );

    return {
      query,
      results: result.response.text()
    };
  }

  /**
   * Main chat function with function calling support
   */
  async chat(message, sessionId = 'default', context = {}) {
    const model = this.getModel(true);

    // Build context-enriched prompt
    let enrichedPrompt = this.systemPrompt;

    if (context.sensors) {
      enrichedPrompt += `\n\n[DATOS ACTUALES DE SENSORES]:
- Temperatura: ${context.sensors.temperature}°C
- Humedad: ${context.sensors.humidity}%
- VPD: ${context.sensors.vpd} kPa
- Humedad Sustrato: ${context.sensors.substrateHumidity}%`;
    }

    if (context.devices) {
      enrichedPrompt += `\n\n[ESTADO DE DISPOSITIVOS]:
${Object.entries(context.devices).map(([k, v]) => `- ${k}: ${v ? 'ENCENDIDO' : 'APAGADO'}`).join('\n')}`;
    }

    if (context.lastIrrigation) {
      enrichedPrompt += `\n\n[ÚLTIMO RIEGO]:
- Fecha: ${new Date(context.lastIrrigation.timestamp).toLocaleString()}
- pH entrada: ${context.lastIrrigation.inputPh || '?'}
- EC entrada: ${context.lastIrrigation.inputEc || '?'}
- pH runoff: ${context.lastIrrigation.runoffPh || '?'}
- EC runoff: ${context.lastIrrigation.runoffEc || '?'}`;
    }

    // Get or create chat history
    let history = this.chatHistories.get(sessionId) || [];

    // Add system context as first message if new session
    if (history.length === 0) {
      history = [
        { role: "user", parts: [{ text: enrichedPrompt }] },
        { role: "model", parts: [{ text: "Entendido. Soy el asistente agrónomo de PKGrower. Tengo acceso a los sensores y puedo controlar los dispositivos del cultivo. ¿En qué te ayudo? 🌱" }] }
      ];
    }

    const chat = model.startChat({ history });

    try {
      let result = await chat.sendMessage(message);
      let response = result.response;

      // Handle function calls iteratively
      let functionCalls = response.functionCalls();
      const executedFunctions = [];

      while (functionCalls && functionCalls.length > 0) {
        const functionResponses = [];

        for (const functionCall of functionCalls) {
          const funcResult = await this.executeFunction(functionCall);
          executedFunctions.push({
            name: functionCall.name,
            args: functionCall.args,
            result: funcResult
          });

          functionResponses.push({
            functionResponse: {
              name: functionCall.name,
              response: funcResult
            }
          });
        }

        // Send function results back to model
        result = await chat.sendMessage(functionResponses);
        response = result.response;
        functionCalls = response.functionCalls();
      }

      // Update history
      history.push({ role: "user", parts: [{ text: message }] });
      history.push({ role: "model", parts: [{ text: response.text() }] });

      // Keep only last 20 messages to avoid token limits
      if (history.length > 22) {
        history = history.slice(0, 2).concat(history.slice(-20));
      }
      this.chatHistories.set(sessionId, history);

      return {
        reply: response.text(),
        functionsExecuted: executedFunctions.length > 0 ? executedFunctions : undefined
      };

    } catch (error) {
      console.error('[AI] Error en chat:', error);
      throw error;
    }
  }

  /**
   * Streaming chat response
   */
  async *chatStream(message, sessionId = 'default', context = {}) {
    const model = this.getModel(false); // Disable function calling for streaming for now

    let enrichedPrompt = this.systemPrompt;
    if (context.sensors) {
      enrichedPrompt += `\n\n[DATOS ACTUALES]: Temp: ${context.sensors.temperature}°C, Hum: ${context.sensors.humidity}%, VPD: ${context.sensors.vpd}`;
    }

    let history = this.chatHistories.get(sessionId) || [];
    if (history.length === 0) {
      history = [
        { role: "user", parts: [{ text: enrichedPrompt }] },
        { role: "model", parts: [{ text: "Asistente PKGrower listo. 🌱" }] }
      ];
    }

    const chat = model.startChat({ history });
    const result = await chat.sendMessageStream(message);

    let fullText = '';
    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      fullText += chunkText;
      yield { text: chunkText, done: false };
    }

    // Update history
    history.push({ role: "user", parts: [{ text: message }] });
    history.push({ role: "model", parts: [{ text: fullText }] });
    if (history.length > 22) {
      history = history.slice(0, 2).concat(history.slice(-20));
    }
    this.chatHistories.set(sessionId, history);

    yield { text: '', done: true };
  }

  /**
   * Analyze an image of the grow
   */
  async analyzeImage(imageBuffer, mimeType = 'image/jpeg', prompt = null) {
    const model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-05-20" });

    const analysisPrompt = prompt || `Analiza esta imagen del cultivo y proporciona:

1. **Estado General** (1-10): Puntuación de salud de las plantas
2. **Problemas Detectados**: Lista cualquier deficiencia, plaga o enfermedad visible
3. **Etapa de Crecimiento**: Identifica si están en vegetativo, floración, etc.
4. **Recomendaciones**: Acciones específicas a tomar

Sé específico y usa emojis para claridad. 🌱`;

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType,
          data: imageBuffer.toString('base64')
        }
      },
      { text: analysisPrompt }
    ]);

    return {
      analysis: result.response.text(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Generate proactive insights based on sensor data
   */
  async generateInsights(sensorData, deviceStates, historicalData = null) {
    const model = this.getModel(false);

    const prompt = `Basándote en estos datos del cultivo, genera 2-3 insights breves y accionables:

SENSORES ACTUALES:
- Temperatura: ${sensorData.temperature}°C
- Humedad: ${sensorData.humidity}%
- VPD: ${sensorData.vpd} kPa
- Humedad Sustrato: ${sensorData.substrateHumidity}%

DISPOSITIVOS:
${Object.entries(deviceStates).map(([k, v]) => `- ${k}: ${v ? 'ON' : 'OFF'}`).join('\n')}

Responde en formato JSON con este esquema:
{
  "insights": [
    {"type": "success|warning|critical", "message": "texto corto", "action": "acción sugerida o null"}
  ]
}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    // Parse JSON response
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.warn('[AI] Error parsing insights JSON:', e);
    }

    return { insights: [{ type: 'warning', message: 'No se pudieron generar insights', action: null }] };
  }
}

module.exports = { AIService, deviceFunctions };
