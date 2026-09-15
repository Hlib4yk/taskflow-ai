import { TextareaHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/cn";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition-shadow focus:ring-2 focus:ring-brand-500",
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";
