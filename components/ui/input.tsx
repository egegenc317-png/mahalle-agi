import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(({ className, type, ...props }, ref) => (
  <input
    type={type}
    className={cn("h-10 w-full rounded-md border border-input bg-background px-3 text-sm", className)}
    ref={ref}
    {...props}
  />
));
Input.displayName = "Input";

export { Input };
