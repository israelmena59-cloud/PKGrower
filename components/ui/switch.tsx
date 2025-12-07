"use client"

import * as React from "react"
import MuiSwitch from "@mui/material/Switch"
import FormControlLabel from "@mui/material/FormControlLabel"

const Switch = React.forwardRef<HTMLElement, React.ComponentProps<typeof MuiSwitch>>(
  (props, ref) => {
    // The wrapper returns just the MUI Switch; callers can wrap with FormControlLabel if needed.
    return <MuiSwitch ref={ref as any} {...props} />
  }
)

Switch.displayName = "Switch"

export { Switch, FormControlLabel }
