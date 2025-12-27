/**
 * TuyaSettingsTab - Tuya Cloud credentials configuration
 */

import React, { useState } from 'react';
import { Box, TextField, Button, Alert } from '@mui/material';
import { Eye, EyeOff } from 'lucide-react';

export interface TuyaCredentials {
  accessKey: string;
  secretKey: string;
  apiHost: string;
  region: string;
}

interface TuyaSettingsTabProps {
  settings: TuyaCredentials;
  onChange: (settings: TuyaCredentials) => void;
}

const TuyaSettingsTab: React.FC<TuyaSettingsTabProps> = ({ settings, onChange }) => {
  const [showSecret, setShowSecret] = useState(false);

  return (
    <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 600 }}>
      <Alert severity="info">
        Obtén tus credenciales de Tuya en: https://iot.tuya.com/
      </Alert>

      <TextField
        label="Access Key"
        fullWidth
        value={settings.accessKey}
        onChange={e => onChange({ ...settings, accessKey: e.target.value })}
        type="password"
        InputProps={{
          endAdornment: (
            <Button size="small" onClick={() => setShowSecret(!showSecret)}>
              {showSecret ? <EyeOff size={18} /> : <Eye size={18} />}
            </Button>
          ),
        }}
      />

      <TextField
        label="Secret Key"
        fullWidth
        value={settings.secretKey}
        onChange={e => onChange({ ...settings, secretKey: e.target.value })}
        type={showSecret ? 'text' : 'password'}
        InputProps={{
          endAdornment: (
            <Button size="small" onClick={() => setShowSecret(!showSecret)}>
              {showSecret ? <EyeOff size={18} /> : <Eye size={18} />}
            </Button>
          ),
        }}
      />

      <TextField
        label="API Host"
        fullWidth
        value={settings.apiHost}
        onChange={e => onChange({ ...settings, apiHost: e.target.value })}
      />

      <TextField
        label="Región"
        select
        fullWidth
        value={settings.region}
        onChange={e => onChange({ ...settings, region: e.target.value })}
        SelectProps={{ native: true }}
      >
        <option value="US">Estados Unidos</option>
        <option value="EU">Europa</option>
        <option value="CN">China</option>
        <option value="IN">India</option>
      </TextField>

      <Alert severity="warning">
        Tus credenciales se almacenan de forma segura en el servidor. Nunca las compartas con terceros.
      </Alert>
    </Box>
  );
};

export default TuyaSettingsTab;
