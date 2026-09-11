import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface Sparkle {
  id: string;
  color: string;
  size: number;
  createdAt: number;
  style: {
    top: string;
    left: string;
    zIndex: number;
  };
}

interface SparklesTextProps {
  text: string;
  className?: string;
  sparklesCount?: number;
  colors?: {
    first?: string;
    second?: string;
  };
}

const random = (min: number, max: number) => Math.floor(Math.random() * (max - min)) + min;

const generateSparkle = (color: string): Sparkle => {
  return {
    id: String(Math.random()),
    color,
    size: random(10, 20),
    createdAt: Date.now(),
    style: {
      top: random(-10, 110) + "%",
      left: random(-10, 110) + "%",
      zIndex: 2,
    },
  };
};

export function SparklesText({
  text,
  className,
  sparklesCount = 6,
  colors = { first: "#9E7AFF", second: "#FE8BBB" },
}: SparklesTextProps) {
  const [sparkles, setSparkles] = useState<Sparkle[]>([]);

  useEffect(() => {
    const activeColors = [colors.first!, colors.second!];
    const initialSparkles = Array.from({ length: sparklesCount }, () =>
      generateSparkle(activeColors[random(0, activeColors.length)])
    );
    setSparkles(initialSparkles);

    const interval = setInterval(() => {
      setSparkles((prev) => {
        const next = prev.filter((sp) => Date.now() - sp.createdAt < 1000);
        if (next.length < sparklesCount) {
          next.push(generateSparkle(activeColors[random(0, activeColors.length)]));
        }
        return next;
      });
    }, 150);

    return () => clearInterval(interval);
  }, [sparklesCount, colors.first, colors.second]);

  return (
    <div className={cn("relative inline-block", className)}>
      {sparkles.map((sparkle) => (
        <span
          key={sparkle.id}
          className="pointer-events-none absolute block animate-sparkle"
          style={sparkle.style}
        >
          <svg
            width={sparkle.size}
            height={sparkle.size}
            viewBox="0 0 68 68"
            fill="none"
            className="block"
          >
            <path
              d="M34 0C34 18.7778 18.7778 34 0 34C18.7778 34 34 49.2222 34 68C34 49.2222 49.2222 34 68 34C49.2222 34 34 18.7778 34 0Z"
              fill={sparkle.color}
            />
          </svg>
        </span>
      ))}
      <span className="relative z-10 font-bold">{text}</span>
    </div>
  );
}
