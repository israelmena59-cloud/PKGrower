import React from 'react';
import { SensorWidget } from './SensorWidget';
import { ControlWidget } from './ControlWidget';
import { ChartWidget } from './ChartWidget';
import { DeviceDataWidget } from './DeviceDataWidget';

// Define the widget types
export type WidgetType = 'sensor' | 'control' | 'chart' | 'camera' | 'text' | 'device';

export interface WidgetDefinition {
    id: string; // Unique ID in the layout
    type: WidgetType;
    title: string;
    props?: any; // Generic props passed to the specific component
}

// Map types to components
export const WIDGET_COMPONENTS: Record<WidgetType, React.ComponentType<any>> = {
    'sensor': SensorWidget,
    'control': ControlWidget,
    'chart': ChartWidget,
    'device': DeviceDataWidget, // New: device-specific widget
    'camera': (props) => <div>Camera Placeholder</div>,
    'text': (props) => <div style={{ fontSize: 24, padding: 10 }}>{props.text || 'Label'}</div>
};

export const getDefaultSize = (type: WidgetType) => {
    switch (type) {
        case 'chart': return { w: 4, h: 3 };
        case 'camera': return { w: 2, h: 2 };
        case 'control': return { w: 1, h: 1 };
        case 'sensor': return { w: 1, h: 1 };
        case 'device': return { w: 2, h: 2 }; // Device widgets are medium sized
        default: return { w: 1, h: 1 };
    }
};
