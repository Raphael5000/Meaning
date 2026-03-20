"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";

interface Property {
  propertyId: string;
  displayName: string;
  account: string;
}

interface BqStatus {
  hasExport: boolean;
  link: { project: string; dailyExportEnabled: boolean; streamingExportEnabled: boolean } | null;
  dataSource: { id: string; status: string; bigqueryDataset: string | null } | null;
}

function ConnectAnalyticsContent() {
  const { status } = useSession();
  const searchParams = useSearchParams();

  const [properties, setProperties] = useState<Property[]>([]);
  const [loadingProps, setLoadingProps] = useState(false);
  const [hasToken, setHasToken] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingConnection, setCheckingConnection] = useState(true);

  // BigQuery status per property
  const [bqStatuses, setBqStatuses] = useState<Record<string, BqStatus>>({});
  const [checkingBq, setCheckingBq] = useState<Record<string, boolean>>({});
  const [enablingBq, setEnablingBq] = useState<Record<string, boolean>>({});
  const [bqErrors, setBqErrors] = useState<Record<string, string>>({});

  const connected = searchParams.get("connected") === "true";
  const adminConnected = searchParams.get("admin_connected") === "true";
  const oauthError = searchParams.get("error");

  // Enforce onboarding order and detect Google Account from DB.
  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/user/onboarding-status")
      .then((res) => res.json())
      .then((data) => {
        if (data.hasSubscription === false) {
          window.location.href = "/pricing";
          return;
        }
        if (data.hasGoogleAccount) {
          setHasToken(true);
        }
      })
      .catch(() => {})
      .finally(() => setCheckingConnection(false));
  }, [status]);

  // Once we know Google is linked, fetch GA properties
  useEffect(() => {
    if (!hasToken) return;
    setLoadingProps(true);
    fetch("/api/analytics/properties")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load properties");
        return res.json();
      })
      .then((data) => setProperties(data.properties || []))
      .catch(() => setError("Could not load your GA4 properties."))
      .finally(() => setLoadingProps(false));
  }, [hasToken]);

  // After redirect from the connect-google OAuth flow, re-check
  useEffect(() => {
    if (!connected) return;
    fetch("/api/user/onboarding-status")
      .then((res) => res.json())
      .then((data) => {
        if (data.hasGoogleAccount) {
          setHasToken(true);
        }
      })
      .catch(() => {});
  }, [connected]);

  // Check BigQuery status for a property
  const checkBqStatus = useCallback(async (propertyId: string) => {
    setCheckingBq((prev) => ({ ...prev, [propertyId]: true }));
    try {
      const res = await fetch(`/api/analytics/bigquery-status?propertyId=${propertyId}`);
      if (!res.ok) throw new Error("Failed to check");
      const data = await res.json();
      setBqStatuses((prev) => ({
        ...prev,
        [propertyId]: {
          hasExport: data.hasExport,
          link: data.link,
          dataSource: data.dataSource,
        },
      }));
    } catch {
      // Silently fail — user can retry
    } finally {
      setCheckingBq((prev) => ({ ...prev, [propertyId]: false }));
    }
  }, []);

  // Auto-check BQ status when properties load
  useEffect(() => {
    if (properties.length === 0) return;
    for (const prop of properties) {
      checkBqStatus(prop.propertyId);
    }
  }, [properties, checkBqStatus]);

  // Poll BQ status while any property is BACKFILLING
  useEffect(() => {
    const backfilling = Object.entries(bqStatuses).filter(
      ([, bq]) => bq.dataSource?.status === "BACKFILLING"
    );
    if (backfilling.length === 0) return;

    const interval = setInterval(() => {
      for (const [pid] of backfilling) {
        checkBqStatus(pid);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [bqStatuses, checkBqStatus]);

  // After elevated OAuth callback, auto-enable BQ export for the pending property
  useEffect(() => {
    if (!adminConnected || properties.length === 0) return;
    // Find the property that doesn't have BQ export yet
    const pendingPropId = sessionStorage.getItem("bq_enable_property");
    if (pendingPropId) {
      sessionStorage.removeItem("bq_enable_property");
      enableBqExport(pendingPropId);
    }
  }, [adminConnected, properties]); // eslint-disable-line react-hooks/exhaustive-deps

  // Enable BigQuery export for a property
  async function enableBqExport(propertyId: string) {
    setEnablingBq((prev) => ({ ...prev, [propertyId]: true }));
    setBqErrors((prev) => ({ ...prev, [propertyId]: "" }));
    try {
      const res = await fetch("/api/analytics/enable-bigquery-export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "permission_denied") {
          setBqErrors((prev) => ({
            ...prev,
            [propertyId]:
              "You need Admin or Editor access on this GA4 property.",
          }));
        } else {
          setBqErrors((prev) => ({
            ...prev,
            [propertyId]: data.message || data.error || "Failed to enable.",
          }));
        }
        return;
      }
      // Refresh BQ status to show the new link
      await checkBqStatus(propertyId);
    } catch {
      setBqErrors((prev) => ({
        ...prev,
        [propertyId]: "Something went wrong. Please try again.",
      }));
    } finally {
      setEnablingBq((prev) => ({ ...prev, [propertyId]: false }));
    }
  }

  // Start the elevated OAuth flow, then enable BQ export on callback
  function startBqEnable(propertyId: string) {
    sessionStorage.setItem("bq_enable_property", propertyId);
    window.location.href = "/api/auth/connect-google-admin";
  }

  async function handleContinue() {
    setCompleting(true);
    setError(null);
    try {
      const res = await fetch("/api/user/complete-onboarding", {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data?.error === "string" ? data.error : "Failed");
      }
      window.location.href = "/";
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
      setCompleting(false);
    }
  }

  if (status === "loading" || (status === "authenticated" && checkingConnection && !hasToken)) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ background: "var(--bg-primary)" }}
      >
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-current"
          style={{ color: "var(--accent)", borderTopColor: "transparent" }}
        />
      </div>
    );
  }

  if (status === "unauthenticated") {
    if (typeof window !== "undefined") window.location.href = "/login";
    return null;
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4"
      style={{
        background:
          "var(--page-bg)",
      }}
    >
      <div
        className="relative mx-auto w-full max-w-md overflow-hidden rounded-2xl p-8"
        style={{
          background:
            "var(--card-bg)",
          border: "1px solid var(--border-color)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        <div className="card-noise" aria-hidden />
        <div className="relative z-10">
          {/* Step indicator: Account → Plan → Analytics */}
          <div className="mb-6 flex items-center justify-center gap-2">
            <div className="flex items-center gap-1.5">
              <div
                className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold"
                style={{ background: "var(--accent)", color: "white" }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Account</span>
            </div>
            <div className="h-px w-6" style={{ background: "var(--border-color)" }} />
            <div className="flex items-center gap-1.5">
              <div
                className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold"
                style={{ background: "var(--accent)", color: "white" }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Plan</span>
            </div>
            <div className="h-px w-6" style={{ background: "var(--border-color)" }} />
            <div className="flex items-center gap-1.5">
              <div
                className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold"
                style={{ background: "var(--accent)", color: "white" }}
              >
                3
              </div>
              <span className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>Analytics</span>
            </div>
          </div>

          <div className="mb-6 text-center">
            <Image
              className="mx-auto mb-4 invert dark:invert-0"
              src="/Logo.svg"
              alt="Meaning logo"
              width={120}
              height={43}
              priority
            />
            <h1
              className="text-xl"
              style={{ color: "var(--text-primary)" }}
            >
              Connect Google Analytics
            </h1>
            <p
              className="mt-1 text-sm"
              style={{ color: "var(--text-secondary)" }}
            >
              Link your Google Analytics so Meaning can read your data
            </p>
          </div>

          {/* Error messages */}
          {(error || oauthError) && (
            <div
              className="mb-4 rounded-lg px-4 py-3 text-sm"
              style={{
                background: "rgba(239, 68, 68, 0.1)",
                color: "var(--error)",
                border: "1px solid rgba(239, 68, 68, 0.2)",
              }}
            >
              {error ||
                (oauthError === "oauth_denied"
                  ? "Google authorization was cancelled. Please try again."
                  : "Something went wrong connecting Google. Please try again.")}
            </div>
          )}

          {/* STATE: No Google token — show Connect button */}
          {!hasToken && !connected && (
            <div className="flex flex-col items-center gap-4">
              <div
                className="flex h-16 w-16 items-center justify-center rounded-full"
                style={{ background: "rgba(16, 163, 127, 0.1)" }}
              >
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 20V10" />
                  <path d="M12 20V4" />
                  <path d="M6 20v-6" />
                </svg>
              </div>
              <p
                className="text-center text-sm"
                style={{ color: "var(--text-secondary)" }}
              >
                Authorize Meaning to access your Google Analytics data. We only
                request <strong>read-only</strong> access.
              </p>
              <a
                href="/api/auth/connect-google"
                className="btn-google"
              >
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Connect with Google
              </a>
            </div>
          )}

          {/* STATE: Connecting — redirect just happened, waiting for session */}
          {!hasToken && connected && (
            <div className="flex flex-col items-center gap-3 py-4">
              <div
                className="h-8 w-8 animate-spin rounded-full border-2 border-current"
                style={{
                  color: "var(--accent)",
                  borderTopColor: "transparent",
                }}
              />
              <p
                className="text-sm"
                style={{ color: "var(--text-secondary)" }}
              >
                Finishing connection...
              </p>
            </div>
          )}

          {/* STATE: Token available — show properties with BQ status */}
          {hasToken && (
            <div className="flex flex-col items-center gap-4">
              {loadingProps ? (
                <div className="flex flex-col items-center gap-3 py-4">
                  <div
                    className="h-8 w-8 animate-spin rounded-full border-2 border-current"
                    style={{
                      color: "var(--accent)",
                      borderTopColor: "transparent",
                    }}
                  />
                  <p
                    className="text-sm"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Loading your analytics properties...
                  </p>
                </div>
              ) : properties.length > 0 ? (
                <>
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-full"
                    style={{ background: "rgba(16, 163, 127, 0.15)" }}
                  >
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="var(--accent)"
                      strokeWidth="2"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <p
                    className="text-center text-sm"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Google Analytics connected! We found{" "}
                    <strong style={{ color: "var(--text-primary)" }}>
                      {properties.length}{" "}
                      {properties.length === 1 ? "property" : "properties"}
                    </strong>{" "}
                    linked to your account.
                  </p>
                  <ul className="w-full space-y-2 overflow-y-auto" style={{ maxHeight: "400px" }}>
                    {properties.map((prop) => {
                      const bq = bqStatuses[prop.propertyId];
                      const isChecking = checkingBq[prop.propertyId];

                      return (
                        <li
                          key={prop.propertyId}
                          className="rounded-lg px-4 py-3"
                          style={{
                            background: "var(--bg-primary)",
                            border: "1px solid var(--border-color)",
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="var(--accent)"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M18 20V10" />
                              <path d="M12 20V4" />
                              <path d="M6 20v-6" />
                            </svg>
                            <div className="min-w-0 flex-1">
                              <p
                                className="truncate text-sm font-medium"
                                style={{ color: "var(--text-primary)" }}
                              >
                                {prop.displayName}
                              </p>
                              <p
                                className="truncate text-xs"
                                style={{ color: "var(--text-muted)" }}
                              >
                                {prop.account}
                              </p>
                            </div>
                          </div>

                          {/* BigQuery status */}
                          <div className="mt-2">
                            {isChecking ? (
                              <span
                                className="text-xs"
                                style={{ color: "var(--text-muted)" }}
                              >
                                Checking...
                              </span>
                            ) : bq?.hasExport ? (
                              bq.dataSource?.status === "BACKFILLING" ? (
                                <div className="flex items-center gap-2 text-xs" style={{ color: "var(--accent)" }}>
                                  <div
                                    className="h-3 w-3 animate-spin rounded-full border-2 border-current"
                                    style={{ borderTopColor: "transparent" }}
                                  />
                                  Importing your historical data... this takes about a minute
                                </div>
                              ) : (
                                <span
                                  className="inline-flex items-center gap-1 text-xs"
                                  style={{ color: "var(--accent)" }}
                                >
                                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                    <polyline points="20 6 9 17 4 12" />
                                  </svg>
                                  Enhanced analytics active
                                </span>
                              )
                            ) : bq && !bq.hasExport ? (
                              <div className="flex items-center justify-between">
                                <button
                                  onClick={() => startBqEnable(prop.propertyId)}
                                  disabled={enablingBq[prop.propertyId]}
                                  className="inline-flex items-center gap-1.5 text-xs font-medium transition-opacity"
                                  style={{
                                    color: "var(--accent)",
                                    opacity: enablingBq[prop.propertyId] ? 0.5 : 1,
                                  }}
                                >
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                                  </svg>
                                  {enablingBq[prop.propertyId]
                                    ? "Enabling..."
                                    : "Enable enhanced analytics"}
                                </button>
                                <button
                                  onClick={() => checkBqStatus(prop.propertyId)}
                                  className="text-xs"
                                  style={{ color: "var(--text-muted)" }}
                                >
                                  Refresh
                                </button>
                              </div>
                            ) : null}
                            {bqErrors[prop.propertyId] && (
                              <p
                                className="mt-1 text-xs"
                                style={{ color: "var(--error)" }}
                              >
                                {bqErrors[prop.propertyId]}
                              </p>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </>
              ) : (
                <p
                  className="text-center text-sm"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Google connected, but no GA4 properties were found. Make sure
                  your Google account has access to at least one GA4 property.
                </p>
              )}

              <button
                onClick={handleContinue}
                disabled={completing}
                className="btn-primary-gradient w-full"
              >
                {completing ? "Setting up..." : "Continue to Dashboard"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ConnectAnalyticsPage() {
  return (
    <Suspense
      fallback={
        <div
          className="flex min-h-screen items-center justify-center"
          style={{ background: "var(--bg-primary)" }}
        >
          <div
            className="h-8 w-8 animate-spin rounded-full border-2 border-current"
            style={{ color: "var(--accent)", borderTopColor: "transparent" }}
          />
        </div>
      }
    >
      <ConnectAnalyticsContent />
    </Suspense>
  );
}
