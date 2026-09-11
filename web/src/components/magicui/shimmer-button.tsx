import React, { CSSProperties } from "react";
import { cn } from "@/lib/utils";

export interface ShimmerButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  shimmerColor?: string;
  shimmerSize?: string;
  borderRadius?: string;
  shimmerDuration?: string;
  background?: string;
  className?: string;
  children?: React.ReactNode;
}

const ShimmerButton = React.forwardRef<HTMLButtonElement, ShimmerButtonProps>(
  (
    {
      shimmerColor = "#ffffff",
      shimmerSize = "0.05em",
      shimmerDuration = "3s",
      borderRadius = "100px",
      background = "rgba(0, 0, 0, 1)",
      className,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        style={
          {
            "--radial-gradient-background": background,
            "--solid-color-background": background,
            "--shimmer-color": shimmerColor,
            "--shimmer-size": shimmerSize,
            "--shimmer-duration": shimmerDuration,
            "--border-radius": borderRadius,
          } as CSSProperties
        }
        className={cn(
          "group relative flex cursor-pointer items-center justify-center overflow-hidden whitespace-nowrap border border-white/10 px-6 py-3 text-white [background:var(--radial-gradient-background)] [border-radius:var(--border-radius)] dark:border-black/10",
          "transition-all duration-300 hover:scale-105 active:scale-95",
          className
        )}
        ref={ref}
        {...props}
      >
        {/* spark container */}
        <div
          className={cn(
            "-z-20 absolute inset-0 overflow-visible [container-type:size]"
          )}
        >
          {/* spark */}
          <div className="absolute inset-0 h-[100cqh] w-[100cqw] animate-shimmer [aspect-ratio:1] [background:radial-gradient(circle_at_center,var(--shimmer-color)_0%,transparent_50%)] [mask-image:radial-gradient(circle_at_center,transparent_30%,black_45%)]" />
        </div>
        {children}

        {/* Highlight */}
        <div
          className={cn(
            "insert-0 absolute size-full rounded-2xl px-4 py-1.5 text-sm font-medium shadow-[inset_0_-8px_8px_-8px_var(--shimmer-color)]",
            "transition-all duration-300 group-hover:shadow-[inset_0_-6px_6px_-6px_var(--shimmer-color)] group-active:shadow-[inset_0_-10px_10px_-10px_var(--shimmer-color)]"
          )}
        />

        {/* backdrop */}
        <div
          className={cn(
            "-z-30 absolute inset-px transition-all duration-300 [background:var(--solid-color-background)] [border-radius:calc(var(--border-radius)-1px)]"
          )}
        />
      </button>
    );
  }
);

ShimmerButton.displayName = "ShimmerButton";

export { ShimmerButton };
