"use client";

import React from "react";

export interface GlassIconsItem {
  icon: React.ReactElement;
  color: string;
  label: string;
  onClick?: () => void;
  customClass?: string;
}

export interface GlassIconsProps {
  items: GlassIconsItem[];
  className?: string;
  colorful?: boolean;
}

const gradientMapping: Record<string, string> = {
  blue: "linear-gradient(hsl(223, 90%, 50%), hsl(208, 90%, 50%))",
  purple: "linear-gradient(hsl(283, 90%, 50%), hsl(268, 90%, 50%))",
  red: "linear-gradient(hsl(3, 90%, 50%), hsl(348, 90%, 50%))",
  indigo: "linear-gradient(hsl(253, 90%, 50%), hsl(238, 90%, 50%))",
  orange: "linear-gradient(hsl(43, 90%, 50%), hsl(28, 90%, 50%))",
  green: "linear-gradient(hsl(123, 90%, 40%), hsl(108, 90%, 40%))",
};

export default function GlassIcons({
  items,
  className,
  colorful = false,
}: GlassIconsProps) {
  const getBackgroundStyle = (color: string): React.CSSProperties => {
    if (!colorful) {
      return {
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.16), rgba(255,255,255,0.05))",
      };
    }

    if (gradientMapping[color]) {
      return { background: gradientMapping[color] };
    }

    return { background: color };
  };

  return (
    <div
      className={`flex flex-wrap items-center justify-center gap-4 overflow-visible pt-3 ${className || ""}`}
    >
      {items.map((item, index) => (
        <button
          key={`${item.label}-${index}`}
          type="button"
          aria-label={item.label}
          title={item.label}
          onClick={item.onClick}
          className={`group relative mt-2.5 h-[50px] w-[50px] cursor-pointer border-none bg-transparent outline-none [perspective:24em] [transform-style:preserve-3d] [-webkit-tap-highlight-color:transparent] ${item.customClass || ""}`}
        >
          <span
            className="absolute left-0 top-0 block h-full w-full rounded-[1.15em] origin-[100%_100%] rotate-[15deg] transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.83,0,0.17,1)] [will-change:transform] group-hover:[transform:rotate(21deg)_translate3d(-0.32em,-0.32em,0.4em)]"
            style={{
              ...getBackgroundStyle(item.color),
              boxShadow: "0.4em -0.4em 0.7em hsla(223, 10%, 10%, 0.14)",
            }}
          />

          <span
            className="absolute left-0 top-0 flex h-full w-full rounded-[1.15em] bg-[hsla(0,0%,100%,0.14)] backdrop-blur-[0.7em] transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.83,0,0.17,1)] origin-[80%_50%] [will-change:transform] group-hover:[transform:translate3d(0,0,1.35em)]"
            style={{
              boxShadow: "0 0 0 0.1em hsla(0, 0%, 100%, 0.24) inset",
            }}
          >
            <span className="m-auto flex h-[1.2em] w-[1.2em] items-center justify-center text-white">
              {item.icon}
            </span>
          </span>

          <span className="pointer-events-none absolute left-1/2 top-full z-20 mt-1 -translate-x-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-black/70 px-2.5 py-1 text-[11px] font-medium text-white opacity-0 shadow-[0_10px_24px_rgba(0,0,0,0.24)] backdrop-blur-xl transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.83,0,0.17,1)] translate-y-0 group-hover:translate-y-[2px] group-hover:opacity-100">
            {item.label}
          </span>
        </button>
      ))}
    </div>
  );
}