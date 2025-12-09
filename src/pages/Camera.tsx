import React from 'react';
import { Box } from '@mui/material';
import CameraViewer from '../components/camera/CameraViewer';

const CameraPage: React.FC = () => {
  return (
    <Box sx={{ width: '100%' }}>
      <CameraViewer />
    </Box>
  );
};

export default CameraPage;
