# chore(ui): Migrate from Tailwind CSS to Material-UI

## 📋 Summary

This PR completely migrates the PKGrower application from Tailwind CSS to Material-UI (MUI) v5, removing all Tailwind dependencies and replacing them with MUI components and the `sx` prop for styling.

## 🎯 Objectives Completed

### 1. Dependency Management
- ✅ Added `@mui/material@^5.14.8`, `@emotion/react@^11.11.0`, `@emotion/styled@^11.11.0`, `@mui/icons-material@^5.14.0`
- ✅ Added `lucide-react@^0.276.0` (for icons)
- ✅ Removed `tailwind-merge` from utilities
- ✅ Updated `package.json` with new dependencies

### 2. Theme Integration
- ✅ Created MUI `createTheme()` that maps CSS variables from `src/index.css` to palette
  - Primary, secondary, background, text, error colors linked to `--primary`, `--secondary`, `--card`, etc.
  - Dark mode detection via `.dark` class on `document.documentElement`
- ✅ Mapped `--radius` CSS variable to `theme.shape.borderRadius`
- ✅ Added typography configuration (h1-h6, body1-2, subtitle1-2, button, caption)
- ✅ Configured component overrides for: `MuiPaper`, `MuiCard`, `MuiAlert`, `MuiButton`, `MuiSwitch`, `MuiOutlinedInput`, `MuiInputLabel`

### 3. Component Migration
| Component | Status | Notes |
|-----------|--------|-------|
| `components/ui/button.tsx` | ✅ | Replaced with MUI Button wrapper; preserves variant and size props |
| `components/ui/card.tsx` | ✅ | Replaced with MUI Card + subcomponents (CardHeader, CardContent, etc.) |
| `components/ui/switch.tsx` | ✅ | Replaced with MUI Switch + FormControlLabel export |
| `src/components/Layout.tsx` | ✅ | Converted to MUI (Box, List, Typography, Divider) |
| `src/components/Alerts.tsx` | ✅ | Replaced with MUI Alert + Stack |
| `src/components/dashboard/SensorCard.tsx` | ✅ | Uses MUI Paper, Avatar, Typography |
| `src/components/dashboard/DeviceSwitch.tsx` | ✅ | Uses MUI Paper, FormControlLabel, Switch |
| `src/components/dashboard/HistoryChart.tsx` | ✅ | Fixed JSX closing tag; wrapped in MUI Paper |
| `src/pages/Dashboard.tsx` | ✅ | Converted to MUI Grid, Box, Typography |
| `src/pages/AIAssistant.tsx` | ✅ | Uses MUI Box, Paper, TextField, Button, List |
| `src/pages/Automations.tsx` | ✅ | Uses MUI Paper and Typography |

### 4. Code Quality
- ✅ Removed all `className=""` attributes
- ✅ Removed references to Tailwind (no `bg-`, `flex`, `grid`, etc.)
- ✅ Removed Tailwind configuration from `components.json`
- ✅ Simplified `src/lib/utils.ts` — `cn()` now uses only `clsx()`
- ✅ Fixed TypeScript and React lint errors

### 5. Git & Documentation
- ✅ Created `feat/migrate-material-ui` branch
- ✅ Committed 30 files with migration (~7200 insertions)

## 🔄 Migration Details

### Before (Tailwind)
```tsx
<div className="flex h-screen bg-background text-foreground">
  <aside className="w-64 bg-card p-4 shadow-lg">
    <h1 className="text-2xl font-bold">PKGrower</h1>
  </aside>
</div>
```

### After (Material-UI)
```tsx
<Box sx={{ display: 'flex', height: '100vh' }}>
  <Box component="aside" sx={{ width: 256, bgcolor: 'background.paper', p: 2, boxShadow: 1 }}>
    <Typography variant="h5">PKGrower</Typography>
  </Box>
</Box>
```

## 📦 Key Changes

### `src/main.tsx`
- Wrapped app with `ThemeProvider` and `CssBaseline`
- Created theme from CSS variables (automatic palette mapping)
- Added typography and component overrides

### Component Overrides
- **MuiButton**: Disabled elevation, set `textTransform: 'none'`, mapped variant colors to CSS variables
- **MuiCard/MuiPaper**: Use `--card` background; applied borderRadius
- **MuiSwitch**: Track color mapped to `--input`
- **MuiInputLabel**: Color mapped to `--muted-foreground`
- **MuiAlert**: Applied borderRadius from theme token

## ✅ Testing Checklist

- [ ] Dev server starts without errors (`npm run dev`)
- [ ] App builds successfully (`npm run build`)
- [ ] No console errors or warnings
- [ ] Layout and spacing look correct
- [ ] Buttons, switches, inputs respond to interactions
- [ ] Dark mode detection works (if implemented)
- [ ] Responsive design works on mobile/tablet (Grid breakpoints)

## 🚀 Next Steps (Optional)

1. **Fine-tune spacing & sizing** — Use `sx` props to adjust margins, padding, sizes per component as needed
2. **Add dark mode toggle** — Implement UI to toggle `.dark` class and save preference
3. **Add custom SVG icons** — Replace some lucide-react icons with custom SVGs if desired
4. **Create Storybook** — Document MUI component overrides and custom variants
5. **Performance audit** — Check bundle size; MUI + Emotion may have different footprint than Tailwind

## 📝 Files Changed

- `package.json` — New dependencies
- `src/main.tsx` — ThemeProvider + theme config
- `src/lib/utils.ts` — Simplified cn() utility
- `components/` — Rewritten UI primitives (button, card, switch)
- `src/components/` — Converted Layout, Alerts, dashboard components
- `src/pages/` — Converted all pages to MUI
- `components.json` — Removed Tailwind config
- Plus JSX fixes in HistoryChart and App

**Total:** ~7,200 lines added, full UI framework migration

---

## 🤝 Questions?

If you have feedback on the migration or encounter any visual issues, please let me know and I'll adjust the theme or component styles.
