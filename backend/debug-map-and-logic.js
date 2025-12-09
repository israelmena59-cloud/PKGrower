require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const TUYA_DEVICES_MAP = {
  sensorSustrato1: { name: 'Sensor Sustrato 1', id: process.env.TUYA_SENSOR_SUSTRATO_1_ID },
  sensorSustrato2: { name: 'Sensor Sustrato 2', id: process.env.TUYA_SENSOR_SUSTRATO_2_ID },
  sensorSustrato3: { name: 'Sensor Sustrato 3', id: process.env.TUYA_SENSOR_SUSTRATO_3_ID },
  sensorAmbiente: { name: 'Sensor Ambiente (RH/TH)', id: process.env.TUYA_SENSOR_AMBIENTE_ID },
  luzPanel1: { name: 'Panel LED 1', id: process.env.TUYA_LUZ_PANEL_1_ID },
  luzPanel2: { name: 'Panel LED 2 (Der Atrás)', id: process.env.TUYA_LUZ_PANEL_2_ID },
  luzPanel3: { name: 'Panel LED 3 (Izq Adelante)', id: process.env.TUYA_LUZ_PANEL_3_ID },
  luzPanel4: { name: 'Panel LED 4 (Izq Atrás)', id: process.env.TUYA_LUZ_PANEL_4_ID },
  gatewayMatter: { name: 'Gateway Matter', id: process.env.TUYA_GATEWAY_MATTER_ID },
  gatewayBluetooth: { name: 'Gateway Bluetooth', id: process.env.TUYA_GATEWAY_BLUETOOTH_ID },
  bombaControlador: { name: 'Controlador Bomba de Agua', id: process.env.TUYA_BOMBA_CONTROLLER_ID },
  extractorControlador: { name: 'Controlador Extractor', id: process.env.TUYA_EXTRACTOR_CONTROLLER_ID },
  controladorLuzRoja: { name: 'Controlador Luz Roja', id: process.env.TUYA_LUZ_ROJA_CONTROLLER_ID },
  llaveAguaBluetooth: { name: 'Llave de Agua Bluetooth', id: process.env.TUYA_LLAVE_AGUA_ID },
};

console.log('--- MAP VALIDATION ---');
Object.keys(TUYA_DEVICES_MAP).forEach(k => {
    const dev = TUYA_DEVICES_MAP[k];
    const status = dev.id ? `✅ OK (${dev.id})` : `❌ UNDEFINED`;
    console.log(`${k.padEnd(20)} : ${status}`);
});
console.log(`TOTAL ENTRIES: ${Object.keys(TUYA_DEVICES_MAP).length}`);
