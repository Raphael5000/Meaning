"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";

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

  // Google Ads state
  const [adsCustomerIds, setAdsCustomerIds] = useState<string[]>([]);
  const [loadingAds, setLoadingAds] = useState(false);
  const [adsStatuses, setAdsStatuses] = useState<Record<string, { status: string; datasetId?: string }>>({});
  const [enablingAds, setEnablingAds] = useState<Record<string, boolean>>({});
  const [adsErrors, setAdsErrors] = useState<Record<string, string>>({});

  const connected = searchParams.get("connected") === "true";
  const adminConnected = searchParams.get("admin_connected") === "true";
  const adsConnected = searchParams.get("ads_connected") === "true";
  const oauthError = searchParams.get("error");

  // Detect Google Account from DB. Free-tier users are allowed here —
  // gating happens at enable-export (source-count cap) and chat (message
  // cap), not at "can you visit this page".
  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/user/onboarding-status")
      .then((res) => res.json())
      .then((data) => {
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

  // Fetch accessible Google Ads customer IDs
  const loadAdsCustomers = useCallback(async () => {
    setLoadingAds(true);
    try {
      const res = await fetch("/api/ads/accessible-customers");
      if (!res.ok) {
        if (res.status === 403) return; // No ads scope — user hasn't connected yet
        return;
      }
      const data = await res.json();
      setAdsCustomerIds(data.customerIds || []);
    } catch {
      // Silently fail
    } finally {
      setLoadingAds(false);
    }
  }, []);

  // Check Ads transfer status for a customer
  const checkAdsStatus = useCallback(async (customerId: string) => {
    try {
      const res = await fetch(`/api/ads/transfer-status?customerId=${customerId}`);
      if (!res.ok) {
        if (res.status === 404) {
          setAdsStatuses((prev) => ({ ...prev, [customerId]: { status: "NOT_CONNECTED" } }));
        }
        return;
      }
      const data = await res.json();
      setAdsStatuses((prev) => ({
        ...prev,
        [customerId]: {
          status: data.dataSource?.status || "NOT_CONNECTED",
          datasetId: data.dataSource?.bigqueryDataset,
        },
      }));
    } catch {
      // Silently fail
    }
  }, []);

  // Enable Ads export for a customer
  async function enableAdsExport(customerId: string) {
    setEnablingAds((prev) => ({ ...prev, [customerId]: true }));
    setAdsErrors((prev) => ({ ...prev, [customerId]: "" }));
    try {
      const res = await fetch("/api/ads/enable-export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAdsErrors((prev) => ({
          ...prev,
          [customerId]: data.message || data.error || "Failed to enable.",
        }));
        return;
      }
      await checkAdsStatus(customerId);
    } catch {
      setAdsErrors((prev) => ({
        ...prev,
        [customerId]: "Something went wrong. Please try again.",
      }));
    } finally {
      setEnablingAds((prev) => ({ ...prev, [customerId]: false }));
    }
  }

  // Start Ads OAuth flow
  function startAdsConnect() {
    window.location.href = "/api/auth/connect-google-ads";
  }

  // Load Ads customers when token is available
  useEffect(() => {
    if (!hasToken) return;
    loadAdsCustomers();
  }, [hasToken, loadAdsCustomers]);

  // After Ads OAuth callback, reload customers
  useEffect(() => {
    if (!adsConnected) return;
    loadAdsCustomers();
  }, [adsConnected, loadAdsCustomers]);

  // Check Ads status for each customer
  useEffect(() => {
    if (adsCustomerIds.length === 0) return;
    for (const cid of adsCustomerIds) {
      checkAdsStatus(cid);
    }
  }, [adsCustomerIds, checkAdsStatus]);

  // Poll Ads status while any customer is BACKFILLING
  useEffect(() => {
    const backfilling = Object.entries(adsStatuses).filter(
      ([, s]) => s.status === "BACKFILLING"
    );
    if (backfilling.length === 0) return;

    const interval = setInterval(() => {
      for (const [cid] of backfilling) {
        checkAdsStatus(cid);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [adsStatuses, checkAdsStatus]);

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
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a]">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-white"
          style={{ borderTopColor: "transparent" }}
        />
      </div>
    );
  }

  if (status === "unauthenticated") {
    if (typeof window !== "undefined") window.location.href = "/login";
    return null;
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#0a0a0a] px-4">
      {/* Back link */}
      <a
        href="/"
        className="absolute left-5 top-5 inline-flex items-center gap-1.5 text-sm text-[rgba(255,255,255,0.4)] transition-colors hover:text-white"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Home
      </a>

      <div className="w-full max-w-md">
          {/* Step indicator: Account → Plan → Analytics */}
          <div className="mb-6 flex items-center justify-center gap-2">
            <div className="flex items-center gap-1.5">
              <div
                className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold bg-white text-black"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <span className="text-xs font-medium text-[rgba(255,255,255,0.4)]">Account</span>
            </div>
            <div className="h-px w-6 bg-[rgba(255,255,255,0.1)]" />
            <div className="flex items-center gap-1.5">
              <div
                className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold bg-white text-black"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <span className="text-xs font-medium text-[rgba(255,255,255,0.4)]">Plan</span>
            </div>
            <div className="h-px w-6 bg-[rgba(255,255,255,0.1)]" />
            <div className="flex items-center gap-1.5">
              <div
                className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold bg-white text-black"
              >
                3
              </div>
              <span className="text-xs font-medium text-white">Analytics</span>
            </div>
          </div>

          <div className="mb-6 text-center">
            <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
              <svg width="28" height="28" viewBox="0 0 436 436" fill="white" xmlns="http://www.w3.org/2000/svg">
                <path d="M352.65 128.054L234.755 58.7598C225.248 53.1732 213.469 53.0716 203.872 58.516L84.8758 125.941C75.2785 131.376 69.308 141.523 69.2171 152.554L68.1261 289.273C68.0351 300.304 73.844 310.543 83.3503 316.14L201.255 385.454C210.772 391.041 222.541 391.143 232.138 385.698L351.134 318.273C360.732 312.839 366.702 302.691 366.793 291.66L367.874 154.931C367.965 143.9 362.156 133.661 352.65 128.074V128.054ZM362.611 187.303L338.82 308.816C336.9 318.618 329.899 326.653 320.443 329.893L203.276 370.046C193.82 373.286 183.364 371.234 175.828 364.672L82.4512 283.311C74.9149 276.749 71.4598 266.663 73.3793 256.861L97.1805 135.357C99.1 125.555 106.101 117.521 115.557 114.281L232.724 74.128C242.18 70.8878 252.636 72.9396 260.172 79.5013L353.539 160.842C361.075 167.404 364.53 177.49 362.611 187.292V187.303Z" />
                <path d="M340.65 191.158L274.712 109.055C269.388 102.433 260.942 99.1519 252.547 100.442L148.442 116.481C140.047 117.771 132.975 123.449 129.894 131.361L91.7273 229.493C88.646 237.405 90.0301 246.364 95.354 252.987L161.302 335.1C166.626 341.722 175.072 345.013 183.467 343.713L287.572 327.685C295.967 326.395 303.039 320.717 306.12 312.804L344.277 214.652C347.358 206.74 345.974 197.771 340.65 191.158ZM324.769 244.404L270.843 317.477C266.488 323.368 259.326 326.496 252.042 325.674L161.777 315.526C154.493 314.704 148.2 310.072 145.27 303.358L108.932 220.127C106.002 213.413 106.871 205.643 111.225 199.751L165.151 126.689C169.506 120.797 176.668 117.669 183.952 118.492L274.217 128.649C281.501 129.472 287.784 134.104 290.724 140.818L327.062 224.028C329.992 230.742 329.123 238.512 324.769 244.404Z" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-white">
              Connect Google Analytics
            </h1>
            <p className="mt-2 text-sm text-[rgba(255,255,255,0.5)]">
              Link your Google Analytics so Meaning can read your data
            </p>
          </div>

          {/* Error messages */}
          {(error || oauthError) && (
            <div
              className="mb-4 rounded-lg px-4 py-3 text-sm"
              style={{
                background: "rgba(239, 68, 68, 0.1)",
                color: "#f87171",
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
              <p className="text-center text-sm text-[rgba(255,255,255,0.5)]">
                Authorize Meaning to access your Google Analytics data. We only
                request <strong className="text-white">read-only</strong> access.
              </p>
              <a
                href="/api/auth/connect-google"
                className="flex w-full items-center justify-center gap-2.5 rounded-lg bg-[rgba(255,255,255,0.06)] px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-[rgba(255,255,255,0.1)]"
                style={{ border: "1px solid rgba(255,255,255,0.1)" }}
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
                className="h-8 w-8 animate-spin rounded-full border-2 border-white"
                style={{ borderTopColor: "transparent" }}
              />
              <p className="text-sm text-[rgba(255,255,255,0.5)]">
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
                    className="h-8 w-8 animate-spin rounded-full border-2 border-white"
                    style={{ borderTopColor: "transparent" }}
                  />
                  <p className="text-sm text-[rgba(255,255,255,0.5)]">
                    Loading your analytics properties...
                  </p>
                </div>
              ) : properties.length > 0 ? (
                <>
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-full"
                    style={{ background: "rgba(255,255,255,0.06)" }}
                  >
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="white"
                      strokeWidth="2"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <p className="text-center text-sm text-[rgba(255,255,255,0.5)]">
                    Google Analytics connected! We found{" "}
                    <strong className="text-white">
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
                          className="rounded-lg bg-[rgba(255,255,255,0.06)] px-4 py-3"
                          style={{ border: "1px solid rgba(255,255,255,0.1)" }}
                        >
                          <div className="flex items-center gap-3">
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="rgba(255,255,255,0.5)"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M18 20V10" />
                              <path d="M12 20V4" />
                              <path d="M6 20v-6" />
                            </svg>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-white">
                                {prop.displayName}
                              </p>
                              <p className="truncate text-xs text-[rgba(255,255,255,0.4)]">
                                {prop.account}
                              </p>
                            </div>
                          </div>

                          {/* BigQuery status */}
                          <div className="mt-2">
                            {isChecking ? (
                              <span className="text-xs text-[rgba(255,255,255,0.4)]">
                                Checking...
                              </span>
                            ) : bq?.hasExport ? (
                              bq.dataSource?.status === "BACKFILLING" ? (
                                <div className="flex items-center gap-2 text-xs text-white">
                                  <div
                                    className="h-3 w-3 animate-spin rounded-full border-2 border-white"
                                    style={{ borderTopColor: "transparent" }}
                                  />
                                  Importing your historical data... this takes about a minute
                                </div>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-xs text-white">
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
                                  className="inline-flex items-center gap-1.5 text-xs font-medium text-white transition-opacity"
                                  style={{
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
                                  className="text-xs text-[rgba(255,255,255,0.4)]"
                                >
                                  Refresh
                                </button>
                              </div>
                            ) : null}
                            {bqErrors[prop.propertyId] && (
                              <p className="mt-1 text-xs text-red-400">
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
                <p className="text-center text-sm text-[rgba(255,255,255,0.5)]">
                  Google connected, but no GA4 properties were found. Make sure
                  your Google account has access to at least one GA4 property.
                </p>
              )}

              {/* Google Ads section */}
              <div
                className="w-full rounded-lg bg-[rgba(255,255,255,0.06)] p-4"
                style={{ border: "1px solid rgba(255,255,255,0.1)" }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                    <line x1="9" y1="9" x2="9.01" y2="9" />
                    <line x1="15" y1="9" x2="15.01" y2="9" />
                  </svg>
                  <h3 className="text-sm font-medium text-white">
                    Google Ads (Optional)
                  </h3>
                </div>
                <p className="text-xs mb-3 text-[rgba(255,255,255,0.5)]">
                  Connect Google Ads to see campaign attribution, keyword-level
                  ROI, and which ads drive conversions.
                </p>

                {adsCustomerIds.length === 0 ? (
                  <button
                    onClick={startAdsConnect}
                    disabled={loadingAds}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-white transition-opacity"
                    style={{ opacity: loadingAds ? 0.5 : 1 }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                    {loadingAds ? "Checking..." : "Connect Google Ads"}
                  </button>
                ) : (
                  <ul className="space-y-2">
                    {adsCustomerIds.map((cid) => {
                      const status = adsStatuses[cid];
                      return (
                        <li
                          key={cid}
                          className="flex items-center justify-between rounded-lg bg-[rgba(255,255,255,0.04)] px-3 py-2"
                          style={{ border: "1px solid rgba(255,255,255,0.08)" }}
                        >
                          <div>
                            <p className="text-xs font-medium text-white">
                              Account {cid}
                            </p>
                            {status?.status === "ACTIVE" && (
                              <span className="inline-flex items-center gap-1 text-xs text-white">
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                                Active
                              </span>
                            )}
                            {status?.status === "BACKFILLING" && (
                              <div className="flex items-center gap-2 text-xs text-white">
                                <div
                                  className="h-3 w-3 animate-spin rounded-full border-2 border-white"
                                  style={{ borderTopColor: "transparent" }}
                                />
                                Syncing...
                              </div>
                            )}
                            {status?.status === "ERROR" && (
                              <span className="text-xs text-red-400">
                                Sync error
                              </span>
                            )}
                          </div>
                          {(!status || status.status === "NOT_CONNECTED") && (
                            <button
                              onClick={() => enableAdsExport(cid)}
                              disabled={enablingAds[cid]}
                              className="text-xs font-medium text-white"
                              style={{ opacity: enablingAds[cid] ? 0.5 : 1 }}
                            >
                              {enablingAds[cid] ? "Enabling..." : "Enable"}
                            </button>
                          )}
                          {adsErrors[cid] && (
                            <p className="text-xs text-red-400">
                              {adsErrors[cid]}
                            </p>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <button
                onClick={handleContinue}
                disabled={completing}
                className="w-full rounded-lg py-3 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50"
                style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)" }}
              >
                {completing ? "Setting up..." : "Continue to Dashboard"}
              </button>
            </div>
          )}
      </div>
    </div>
  );
}

export default function ConnectAnalyticsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a]">
          <div
            className="h-8 w-8 animate-spin rounded-full border-2 border-white"
            style={{ borderTopColor: "transparent" }}
          />
        </div>
      }
    >
      <ConnectAnalyticsContent />
    </Suspense>
  );
}
