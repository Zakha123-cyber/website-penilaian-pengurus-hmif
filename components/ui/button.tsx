import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "../utils";

type Variant = "default" | "outline" | "ghost";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
  variant?: Variant;
};

const variantClass: Record<Variant, string> = {
  default: "bg-slate-900 text-white hover:bg-slate-800",
  outline: "border border-slate-200 hover:border-slate-300 text-slate-900",
  ghost: "text-slate-700 hover:bg-slate-100",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant = "default", asChild, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp className={cn("inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-slate-300", variantClass[variant], className)} ref={ref} {...props} />
  );
});
Button.displayName = "Button";
