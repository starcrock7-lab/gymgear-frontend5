"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button, type buttonVariants } from "@/components/ui/button";
import type { VariantProps } from "class-variance-authority";

interface HighlightButtonProps
  extends React.ComponentProps<"button">,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  highlightColor?: string;
  highlightSize?: number;
  borderColor?: string;
}

/**
 * Button with a cursor-tracked glow inside the surface and a ripple on
 * click. Defaults tuned to the brand ember instead of currentColor.
 */
function HighlightButton({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  highlightColor = "rgba(255, 158, 110, 0.65)",
  highlightSize = 72,
  borderColor = "rgba(255, 158, 110, 0.8)",
  children,
  onClick,
  ...props
}: HighlightButtonProps) {
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const [position, setPosition] = React.useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = React.useState(false);
  const [isClicked, setIsClicked] = React.useState(false);
  const [clickPosition, setClickPosition] = React.useState({ x: 0, y: 0 });

  const handleMouseMove = React.useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!buttonRef.current || isClicked) return;
      const rect = buttonRef.current.getBoundingClientRect();
      setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    },
    [isClicked],
  );

  const handleMouseEnter = React.useCallback(() => setIsHovering(true), []);

  const handleMouseLeave = React.useCallback(() => {
    setIsHovering(false);
    setIsClicked(false);
  }, []);

  const handleClick = React.useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!buttonRef.current) return;
      const rect = buttonRef.current.getBoundingClientRect();
      setClickPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      setIsClicked(true);
      onClick?.(e);
    },
    [onClick],
  );

  return (
    <Button
      ref={buttonRef}
      variant={variant}
      size={size}
      asChild={asChild}
      className={cn(
        "relative overflow-hidden shadow-sm transition-[border-color,box-shadow,transform]",
        className,
      )}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      style={{
        borderColor: isHovering ? borderColor : undefined,
        borderWidth: isHovering ? "1px" : undefined,
      }}
      {...props}
    >
      {isHovering && !isClicked && (
        <div
          className="pointer-events-none absolute rounded-full transition-transform duration-100 ease-out"
          style={{
            left: position.x,
            top: position.y,
            width: highlightSize,
            height: highlightSize,
            backgroundColor: highlightColor,
            transform: "translate(-50%, -50%)",
            filter: "blur(24px)",
          }}
        />
      )}

      <div className="pointer-events-none absolute inset-0 rounded-md bg-current/[0.04]" />

      {isClicked && (
        <div
          className="pointer-events-none absolute rounded-full"
          style={{
            left: clickPosition.x,
            top: clickPosition.y,
            backgroundColor: highlightColor,
            transform: "translate(-50%, -50%)",
            animation: "highlight-button-ripple 0.6s ease-out forwards",
          }}
        />
      )}

      <span className="relative z-10 inline-flex items-center justify-center text-inherit">
        {children}
      </span>
    </Button>
  );
}

export { HighlightButton, type HighlightButtonProps };
export default HighlightButton;
