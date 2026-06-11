"use client";

import { motion } from "framer-motion";
import React, { useEffect, useRef } from "react";

interface AnimatedGradientBackgroundProps {
  /** Initial size of the radial gradient, defining the starting width. */
  startingGap?: number;
  /** Enables or disables the breathing animation effect. */
  Breathing?: boolean;
  /** Array of colors to use in the radial gradient. */
  gradientColors?: string[];
  /** Array of percentage stops corresponding to each color in `gradientColors`. */
  gradientStops?: number[];
  /** Speed of the breathing animation. Lower values result in slower animation. */
  animationSpeed?: number;
  /** Maximum range for the breathing animation in percentage points. */
  breathingRange?: number;
  containerStyle?: React.CSSProperties;
  containerClassName?: string;
  /** Additional top offset for the gradient container. */
  topOffset?: number;
}

/**
 * Renders an animated radial gradient background with a subtle breathing
 * effect. Defaults are tuned to the GymGear brand: deep navy with a warm
 * orange undertone rising from the focal point.
 */
const AnimatedGradientBackground: React.FC<AnimatedGradientBackgroundProps> = ({
  startingGap = 125,
  Breathing = false,
  gradientColors = ["#1b3060", "#0d1b35", "#43200f", "#081124"],
  gradientStops = [30, 55, 78, 100],
  animationSpeed = 0.04,
  breathingRange = 6,
  containerStyle = {},
  topOffset = 0,
  containerClassName = "",
}) => {
  if (gradientColors.length !== gradientStops.length) {
    throw new Error(
      `GradientColors and GradientStops must have the same length.
     Received gradientColors length: ${gradientColors.length},
     gradientStops length: ${gradientStops.length}`,
    );
  }

  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const paint = (width: number) => {
      const gradientStopsString = gradientStops
        .map((stop, index) => `${gradientColors[index]} ${stop}%`)
        .join(", ");
      if (containerRef.current) {
        containerRef.current.style.background = `radial-gradient(${width}% ${width + topOffset}% at 50% 20%, ${gradientStopsString})`;
      }
    };

    // Static paint unless breathing is on — a perpetual rAF loop forces a
    // full-section repaint every frame, which is wasteful on mobile.
    if (!Breathing) {
      paint(startingGap);
      return;
    }

    let animationFrame: number;
    let width = startingGap;
    let directionWidth = 1;

    const animateGradient = () => {
      if (width >= startingGap + breathingRange) directionWidth = -1;
      if (width <= startingGap - breathingRange) directionWidth = 1;

      width += directionWidth * animationSpeed;
      paint(width);

      animationFrame = requestAnimationFrame(animateGradient);
    };

    animationFrame = requestAnimationFrame(animateGradient);

    return () => cancelAnimationFrame(animationFrame);
  }, [
    startingGap,
    Breathing,
    gradientColors,
    gradientStops,
    animationSpeed,
    breathingRange,
    topOffset,
  ]);

  return (
    <motion.div
      key="animated-gradient-background"
      initial={{ opacity: 0, scale: 1.3 }}
      animate={{
        opacity: 1,
        scale: 1,
        transition: { duration: 1.6, ease: [0.25, 0.1, 0.25, 1] },
      }}
      className={`absolute inset-0 overflow-hidden ${containerClassName}`}
    >
      <div
        ref={containerRef}
        style={containerStyle}
        className="absolute inset-0"
      />
    </motion.div>
  );
};

export default AnimatedGradientBackground;
