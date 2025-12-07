import * as React from "react"
import ButtonBase, { type ButtonProps as MUIButtonProps } from "@mui/material/Button"

type Variant = "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
type Size = "default" | "sm" | "lg" | "icon"

export interface ButtonProps extends Omit<MUIButtonProps, "size" | "variant"> {
  asChild?: boolean
  variant?: Variant
  size?: Size
}

const mapVariant = (v?: Variant) => {
  switch (v) {
    case "destructive":
      return { variant: "contained", color: "error" as const }
    case "outline":
      return { variant: "outlined" as const }
    case "secondary":
      return { variant: "contained", color: "secondary" as const }
    case "ghost":
      return { variant: "text" as const }
    case "link":
      return { variant: "text" as const }
    default:
      return { variant: "contained" as const, color: "primary" as const }
  }
}

const mapSize = (s?: Size) => {
  switch (s) {
    case "sm":
      return "small"
    case "lg":
      return "large"
    case "icon":
      return "small"
    default:
      return "medium"
  }
}

const Button = React.forwardRef<HTMLElement, ButtonProps>(
  ({ asChild = false, variant, size, children, ...props }, ref) => {
    const muiVariant = mapVariant(variant)
    const muiSize = mapSize(size)

    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children as React.ReactElement, { ref, ...props })
    }

    return (
      <ButtonBase ref={ref as any} size={muiSize} {...muiVariant} {...props}>
        {children}
      </ButtonBase>
    )
  }
)

Button.displayName = "Button"

export { Button }
