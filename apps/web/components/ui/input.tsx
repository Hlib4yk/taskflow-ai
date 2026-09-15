import { InputHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/cn";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none transition-shadow focus:ring-2 focus:ring-brand-500",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";
