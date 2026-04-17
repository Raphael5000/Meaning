"use client";

import { useState, useEffect, useCallback } from "react";

const STEPS = [
  {
    id: "create-team",
    title: "Create a team",
    description: "Click here to set up your first team. You'll organize your data sources and invite collaborators.",
    target: "[data-onboarding='team-selector']",
    position: "right" as const,
    action: "click-target",
    actionLabel: "Create team",
  },
  {
    id: "connect-sources",
    title: "Connect your data",
    description: "Open this menu and click Connections to link GA4, Google Ads, LinkedIn, Mailchimp, and more.",
    target: "[data-onboarding='connections']",
    position: "right" as const,
    action: "click-target",
    actionLabel: "Open menu",
  },
  {
    id: "new-chat",
    title: "Start a conversation",
    description: "Ask anything about your analytics in plain English. Meaning picks the right data source and returns an answer.",
    target: "[data-onboarding='new-chat']",
    position: "right" as const,
    action: "next",
    actionLabel: "Next",
  },
  {
    id: "dashboards",
    title: "Build a dashboard",
    description: "Pin any answer to a drag-and-drop dashboard with 14 chart types.",
    target: "[data-onboarding='dashboards']",
    position: "right" as const,
    action: "next",
    actionLabel: "Done",
  },
];

function Bubble({
  step,
  stepIndex,
  totalSteps,
  onNext,
  onSkip,
  targetRect,
}: {
  step: (typeof STEPS)[number];
  stepIndex: number;
  totalSteps: number;
  onNext: () => void;
  onSkip: () => void;
  targetRect: DOMRect | null;
}) {
  if (!targetRect) return null;

  // If target is in the bottom third of the viewport, show bubble above
  const placeAbove = targetRect.top > window.innerHeight * 0.6;

  const bubbleStyle: React.CSSProperties = placeAbove
    ? {
        bottom: window.innerHeight - targetRect.top + 12,
        left: targetRect.left,
      }
    : {
        top: Math.max(16, targetRect.top + targetRect.height / 2 - 60),
        left: Math.min(targetRect.right + 16, window.innerWidth - 304),
      };

  return (
    <>
      {/* Highlight ring around target */}
      <div
        className="pointer-events-none fixed z-[9998] rounded-lg"
        style={{
          top: targetRect.top - 4,
          left: targetRect.left - 4,
          width: targetRect.width + 8,
          height: targetRect.height + 8,
          boxShadow: "0 0 0 4000px rgba(0,0,0,0.4)",
          border: "2px solid var(--text-primary)",
        }}
      />
      {/* Bubble */}
      <div
        className="fixed z-[9999] w-72 rounded-xl p-4 shadow-xl"
        style={{
          ...bubbleStyle,
          background: "var(--text-primary)",
          color: "var(--bg-primary)",
        }}
      >
        {/* Arrow */}
        <div
          style={placeAbove ? {
            position: "absolute",
            bottom: -6,
            left: 24,
            width: 0,
            height: 0,
            borderLeft: "6px solid transparent",
            borderRight: "6px solid transparent",
            borderTop: "6px solid var(--text-primary)",
          } : {
            position: "absolute",
            left: -6,
            top: 24,
            width: 0,
            height: 0,
            borderTop: "6px solid transparent",
            borderBottom: "6px solid transparent",
            borderRight: "6px solid var(--text-primary)",
          }}
        />

        {/* Step counter */}
        <p className="mb-1 text-[11px] font-medium" style={{ opacity: 0.5 }}>
          Step {stepIndex + 1} of {totalSteps}
        </p>

        {/* Content */}
        <h3 className="mb-1 text-sm font-semibold">{step.title}</h3>
        <p className="mb-4 text-xs leading-relaxed" style={{ opacity: 0.7 }}>
          {step.description}
        </p>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <button
            onClick={onSkip}
            className="text-xs transition-opacity hover:opacity-100"
            style={{ opacity: 0.5 }}
          >
            Skip tour
          </button>
          <button
            onClick={() => {
              if (step.action === "click-target") {
                const el = document.querySelector(step.target);
                if (el instanceof HTMLElement) el.click();
              }
              onNext();
            }}
            className="rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
            style={{
              background: "var(--bg-primary)",
              color: "var(--text-primary)",
            }}
          >
            {step.actionLabel ?? (stepIndex === totalSteps - 1 ? "Done" : "Next")}
          </button>
        </div>

        {/* Progress dots */}
        <div className="mt-3 flex justify-center gap-1.5">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className="h-1.5 rounded-full transition-all"
              style={{
                width: i === stepIndex ? 16 : 6,
                background: i === stepIndex ? "var(--bg-primary)" : "rgba(128,128,128,0.3)",
              }}
            />
          ))}
        </div>
      </div>
    </>
  );
}

export function OnboardingGuide({
  show,
  onComplete,
}: {
  show: boolean;
  onComplete: () => void;
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [visible, setVisible] = useState(show);

  const updateTargetRect = useCallback(() => {
    const step = STEPS[currentStep];
    if (!step) return;
    const el = document.querySelector(step.target);
    if (el) {
      setTargetRect(el.getBoundingClientRect());
    }
  }, [currentStep]);

  useEffect(() => {
    if (!visible) return;
    // Small delay to let the DOM settle
    const timer = setTimeout(updateTargetRect, 300);
    window.addEventListener("resize", updateTargetRect);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", updateTargetRect);
    };
  }, [visible, currentStep, updateTargetRect]);

  useEffect(() => {
    setVisible(show);
  }, [show]);

  if (!visible) return null;

  function handleNext() {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      handleComplete();
    }
  }

  function handleComplete() {
    setVisible(false);
    onComplete();
    // Persist that onboarding is done
    try {
      localStorage.setItem("meaning-onboarding-done", "true");
    } catch {}
  }

  return (
    <Bubble
      step={STEPS[currentStep]}
      stepIndex={currentStep}
      totalSteps={STEPS.length}
      onNext={handleNext}
      onSkip={handleComplete}
      targetRect={targetRect}
    />
  );
}
