import * as React from "react"
import MuiCard from "@mui/material/Card"
import CardHeader from "@mui/material/CardHeader"
import CardContent from "@mui/material/CardContent"
import CardActions from "@mui/material/CardActions"
import Typography from "@mui/material/Typography"

const Card = React.forwardRef<HTMLDivElement, React.ComponentProps<typeof MuiCard>>(
  ({ children, ...props }, ref) => (
    <MuiCard ref={ref} elevation={1} {...props}>
      {children}
    </MuiCard>
  )
)
Card.displayName = "Card"

const CardHeaderWrapper = (props: React.ComponentProps<typeof CardHeader>) => (
  <CardHeader {...props} />
)

const CardTitle = (props: { children?: React.ReactNode }) => (
  <Typography variant="h6" component="h3" {...props} />
)

const CardDescription = (props: { children?: React.ReactNode }) => (
  <Typography variant="body2" color="text.secondary" {...props} />
)

const CardContentWrapper = ({ children, ...props }: React.ComponentProps<typeof CardContent>) => (
  <CardContent {...props}>{children}</CardContent>
)

const CardFooter = (props: React.ComponentProps<typeof CardActions>) => (
  <CardActions disableSpacing {...props} />
)

export { Card, CardHeaderWrapper as CardHeader, CardFooter, CardTitle, CardDescription, CardContentWrapper as CardContent }
