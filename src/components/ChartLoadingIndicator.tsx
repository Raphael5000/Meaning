"use client";

import { useState, useEffect } from "react";

const PHRASES = [
  "Querying your data",
  "Crunching numbers",
  "Analysing trends",
  "Mapping dimensions",
  "Plotting data points",
  "Building your chart",
  "Shaping the visualisation",
  "Connecting the dots",
  "Rendering insights",
  "Painting the picture",
  "Arranging the axes",
  "Calibrating scales",
  "Fetching metrics",
  "Sorting dimensions",
  "Composing the layout",
];

export default function ChartLoadingIndicator() {
  const [index, setIndex] = useState(
    () => Math.floor(Math.random() * PHRASES.length)
  );
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % PHRASES.length);
        setFade(true);
      }, 300);
    }, 2400);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex w-full justify-center px-4 py-4">
      <div className="w-full max-w-3xl">
        <div
          className="relative overflow-hidden rounded-2xl border"
          style={{
            borderColor: "var(--border-color)",
            background: "var(--bg-secondary)",
            height: "400px",
          }}
        >
          {/* Animated bars — absolutely positioned so they don't affect text */}
          <div className="absolute inset-x-0 top-1/2 flex -translate-y-8 items-end justify-center gap-1.5">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="chart-loading-bar rounded-sm"
                style={{
                  width: "6px",
                  background: "var(--accent)",
                  animationDelay: `${i * 0.15}s`,
                }}
              />
            ))}
          </div>

          {/* Rotating phrase — fixed position below bars */}
          <div className="absolute inset-x-0 top-1/2 flex translate-y-8 justify-center">
            <p
              className="text-sm font-medium transition-opacity duration-300"
              style={{
                color: "var(--text-secondary)",
                opacity: fade ? 1 : 0,
              }}
            >
              {PHRASES[index]}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
