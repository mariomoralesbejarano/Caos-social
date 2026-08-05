import { Loader2Icon } from "lucide-react"

import { cn } from "@/lib/utils"

function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
  // lucide-react and this workspace currently resolve different React 19
  // type packages; do not forward the incompatible ref type to the icon.
  const { ref: _ref, ...svgProps } = props
  return (
    <Loader2Icon
      role="status"
      aria-label="Loading"
      className={cn("size-4 animate-spin", className)}
      {...svgProps}
    />
  )
}

export { Spinner }
