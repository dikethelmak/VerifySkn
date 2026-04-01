import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          // Base
          "inline-flex items-center justify-center rounded-lg font-syne font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          // Variants
          variant === "primary" &&
            "bg-lime text-[#0b1e0f] hover:bg-lime/90 focus-visible:ring-lime",
          variant === "secondary" &&
            "border text-lime hover:bg-lime/5 focus-visible:ring-lime",
          variant === "ghost" &&
            "text-lime hover:bg-lime/5 focus-visible:ring-lime",
          // Sizes
          size === "sm" && "h-8 px-3 text-sm",
          size === "md" && "h-10 px-5 text-base",
          size === "lg" && "h-12 px-7 text-lg",
          className
        )}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";

export { Button };
