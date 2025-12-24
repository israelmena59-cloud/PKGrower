import React from 'react';
import { Tabs, Tab, Button, IconButton, Tooltip } from '@mui/material';
import { RefreshCw, Settings, Zap, Plus, X, LucideIcon } from 'lucide-react';

interface PageHeaderProps {
    title: string;
    subtitle?: string;
    icon?: LucideIcon;
    action?: React.ReactNode;

    // Dashboard specific (optional)
    activePage?: string;
    pages?: string[];
    onPageChange?: (page: string) => void;
    onAddPage?: () => void;
    onDeletePage?: (e: React.MouseEvent, page: string) => void;
    onRefresh?: () => void;
    onReset?: () => void;
    onOpenConfig?: () => void;
    onOpenRules?: () => void;
    refreshing?: boolean;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
    title,
    subtitle = "SISTEMA ONLINE",
    icon: Icon,
    action,
    activePage,
    pages,
    onPageChange,
    onAddPage,
    onDeletePage,
    onRefresh,
    onReset,
    onOpenConfig,
    onOpenRules,
    refreshing
}) => {
    return (
        <div className="p-4 mb-4 rounded-[24px] bg-background/60 backdrop-blur-xl border border-white/10 flex flex-wrap justify-between items-center gap-4 shadow-sm">
            <div className="flex items-center gap-4">
                {Icon && (
                    <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 text-indigo-400">
                        <Icon size={32} />
                    </div>
                )}
                <div>
                    <span className="text-xs font-bold text-muted-foreground tracking-wider uppercase">{subtitle}</span>
                    <h1 className="text-3xl font-black bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
                        {title}
                    </h1>
                </div>
            </div>

            {/* Custom Action (e.g. Automations buttons) */}
            {action && (
                <div className="flex-1 flex justify-end">
                    {action}
                </div>
            )}

            {/* Dashboard Tabs & Controls */}
            {pages && onPageChange && (
                <>
                    <div className="flex-1 flex justify-center">
                        <Tabs
                            value={activePage}
                            onChange={(_, val) => onPageChange(val)}
                            textColor="inherit"
                            indicatorColor="secondary"
                            variant="scrollable"
                            scrollButtons="auto"
                            sx={{
                                '& .MuiButtonBase-root': {
                                    minHeight: '40px',
                                    fontWeight: 600,
                                    textTransform: 'none',
                                }
                            }}
                        >
                            {pages.map(page => (
                                <Tab
                                    key={page}
                                    value={page}
                                    label={
                                        <div className="flex items-center gap-2 px-2">
                                            {page}
                                            {page !== 'General' && onDeletePage && (
                                                <X size={14} onClick={(e) => onDeletePage(e, page)} className="opacity-60 hover:opacity-100 cursor-pointer" />
                                            )}
                                        </div>
                                    }
                                />
                            ))}
                        </Tabs>
                        {onAddPage && (
                            <IconButton size="small" onClick={onAddPage} className="ml-2 bg-white/5 hover:bg-white/10 !rounded-full !w-8 !h-8">
                                <Plus size={16} />
                            </IconButton>
                        )}
                    </div>

                    <div className="flex gap-2">
                        {onRefresh && (
                            <Button
                                variant="outlined"
                                startIcon={<RefreshCw className={refreshing ? 'animate-spin' : ''} size={16} />}
                                onClick={onRefresh}
                                className="!border-white/10 !text-foreground hover:!bg-white/5 !normal-case !rounded-lg"
                            >
                                Refrescar
                            </Button>
                        )}

                        {onReset && (
                            <Tooltip title="Restablecer Diseño (Si hay errores)">
                                <Button
                                    variant="outlined"
                                    onClick={onReset}
                                    className="!border-red-500/30 !text-red-500 hover:!bg-red-500/10 !normal-case !rounded-lg"
                                >
                                    Reset
                                </Button>
                            </Tooltip>
                        )}

                        {onOpenConfig && (
                            <IconButton onClick={onOpenConfig} className="!bg-white/5 hover:!bg-white/10 !text-foreground !rounded-lg !w-10 !h-10">
                                <Settings size={20} />
                            </IconButton>
                        )}
                        {onOpenRules && (
                            <IconButton onClick={onOpenRules} className="!bg-amber-500/10 hover:!bg-amber-500/20 !text-amber-500 !rounded-lg !w-10 !h-10">
                                <Zap size={20} />
                            </IconButton>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};
