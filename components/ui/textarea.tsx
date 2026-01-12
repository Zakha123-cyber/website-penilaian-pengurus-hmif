import * as React from "react";
import { cn } from "../utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn("w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-slate-400 focus:outline-none", "min-h-[120px]", className)}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";
