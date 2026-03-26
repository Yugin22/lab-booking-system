"use client";

import React, { useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";

interface AnimatedContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  distance?: number;
  duration?: number;
  delay?: number;
  direction?: "vertical" | "horizontal";
  reverse?: boolean;
  scale?: number;
}

export default function AnimatedContent({
  children,
  distance = 60,
  duration = 0.8,
  delay = 0,
  direction = "vertical",
  reverse = false,
  scale = 0.95,
  className = "",
  style,
  ...props
}: AnimatedContentProps) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const axis = direction === "horizontal" ? "x" : "y";
    const offset = reverse ? -distance : distance;

    const ctx = gsap.context(() => {
      gsap.set(el, {
        opacity: 0,
        [axis]: offset,
        scale,
      });

      gsap.to(el, {
        opacity: 1,
        [axis]: 0,
        scale: 1,
        duration,
        delay,
        ease: "power3.out",
      });
    }, ref);

    return () => ctx.revert();
  }, [distance, duration, delay, direction, reverse, scale]);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: 0,
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}