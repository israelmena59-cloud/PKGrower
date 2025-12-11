import React, { useState } from 'react';
import { Responsive } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { WidthProvider } from './WidthProvider';
import { BaseWidgetWrapper } from './BaseWidgetWrapper';
import { WIDGET_COMPONENTS, WidgetDefinition, WidgetType } from './WidgetRegistry';
import { Box, Button, SpeedDial, SpeedDialIcon, SpeedDialAction } from '@mui/material';
import { Check, Edit2 } from 'lucide-react';
import _ from 'lodash';

// Using local WidthProvider because lib export is broken in v2
// Using standard 'Responsive' from react-grid-layout (it is exported in index.mjs)
const ResponsiveGridLayout = WidthProvider(Responsive);

interface DashboardLayoutProps {
    widgets: WidgetDefinition[];
    layout: any[];
    onLayoutChange: (layout: any[]) => void;
    onAddWidget?: (type: WidgetType) => void;
    onRemoveWidget?: (id: string) => void;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
    widgets,
    layout,
    onLayoutChange,
    onAddWidget,
    onRemoveWidget
}) => {
    const [isEditMode, setIsEditMode] = useState(false);

    // Map internal RGL layout handling
    const handleLayoutChange = (currentLayout: any) => {
        onLayoutChange(currentLayout);
    };

    return (
        <Box sx={{ position: 'relative', minHeight: '80vh' }}>
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                <Button
                    variant={isEditMode ? "contained" : "outlined"}
                    color={isEditMode ? "primary" : "inherit"}
                    startIcon={isEditMode ? <Check size={18} /> : <Edit2 size={18} />}
                    onClick={() => setIsEditMode(!isEditMode)}
                >
                    {isEditMode ? "Terminar Edición" : "Editar Dashboard"}
                </Button>
            </Box>

            <ResponsiveGridLayout
                className="layout"
                layouts={{ lg: layout }}
                breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
                cols={{ lg: 4, md: 4, sm: 2, xs: 1, xxs: 1 }}
                rowHeight={100}
                isDraggable={isEditMode}
                isResizable={isEditMode}
                onLayoutChange={handleLayoutChange}
                margin={[16, 16]}
                draggableHandle=".drag-handle" // Only drag from header in edit mode? OR use entire card
            >
                {widgets.map((widget) => {
                    const Component = WIDGET_COMPONENTS[widget.type];
                    return (
                        <div key={widget.id}>
                            <BaseWidgetWrapper
                                title={widget.title}
                                isEditMode={isEditMode}
                                onRemove={() => onRemoveWidget?.(widget.id)}
                            >
                                <Component {...widget.props} />
                            </BaseWidgetWrapper>
                        </div>
                    );
                })}
            </ResponsiveGridLayout>

            {/* Manual Add Button (Only in Edit Mode) */}
            {isEditMode && (
                 <SpeedDial
                    ariaLabel="Add Widget"
                    sx={{ position: 'fixed', bottom: 32, right: 32 }}
                    icon={<SpeedDialIcon />}
                 >
                    <SpeedDialAction
                        icon={<span role="img" aria-label="chart">📊</span>}
                        tooltipTitle="Gráfico"
                        onClick={() => onAddWidget?.('chart')}
                    />
                    <SpeedDialAction
                        icon={<span role="img" aria-label="switch">🔌</span>}
                        tooltipTitle="Control"
                        onClick={() => onAddWidget?.('control')}
                    />
                 </SpeedDial>
            )}
        </Box>
    );
};
