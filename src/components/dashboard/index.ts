/**
 * Dashboard Widgets - Central Export
 * Easy imports for all dashboard-related widgets
 */

// Main Widgets
export { default as UnifiedAIPanel } from './UnifiedAIPanel';
export { default as CropSteeringWidget } from './CropSteeringWidget';
export { default as QuickActionsWidget } from './QuickActionsWidget';
export { default as HistoryChart } from './HistoryChart';
export { default as AIInsightsWidget } from './AIInsightsWidget';

// Config Components
export { default as ConfigModal } from './ConfigModal';
export { default as RulesModal } from './RulesModal';

// Widget System
export * from '../widgets/DashboardLayout';
export * from '../widgets/WidgetRegistry';
