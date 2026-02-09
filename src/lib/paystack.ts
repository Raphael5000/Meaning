const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY!;
const PAYSTACK_BASE_URL = "https://api.paystack.co";

async function paystackRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${PAYSTACK_BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || `Paystack API error: ${res.status}`);
  }

  return data as T;
}

// ── Types ────────────────────────────────────────────────────────────

interface PaystackInitResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

interface PaystackVerifyResponse {
  status: boolean;
  message: string;
  data: {
    id: number;
    status: string; // "success" | "failed" | "abandoned"
    reference: string;
    amount: number;
    currency: string;
    customer: {
      id: number;
      email: string;
      customer_code: string;
    };
    plan_object?: {
      id: number;
      name: string;
      plan_code: string;
    };
    authorization: {
      authorization_code: string;
      card_type: string;
      last4: string;
      exp_month: string;
      exp_year: string;
      bank: string;
    };
  };
}

interface PaystackSubscriptionResponse {
  status: boolean;
  message: string;
  data: {
    subscription_code: string;
    email_token: string;
    status: string;
    next_payment_date: string;
  };
}

// ── API Functions ────────────────────────────────────────────────────

export async function initializeTransaction(params: {
  email: string;
  amount: number; // in kobo/cents (e.g., 29900 = R299.00)
  plan?: string; // Paystack plan code for subscriptions
  reference?: string;
  callback_url?: string;
  metadata?: Record<string, unknown>;
}): Promise<PaystackInitResponse> {
  return paystackRequest<PaystackInitResponse>("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export async function verifyTransaction(
  reference: string
): Promise<PaystackVerifyResponse> {
  return paystackRequest<PaystackVerifyResponse>(
    `/transaction/verify/${encodeURIComponent(reference)}`
  );
}

export async function createSubscription(params: {
  customer: string; // customer email or code
  plan: string; // plan code
  authorization?: string; // authorization code from previous transaction
}): Promise<PaystackSubscriptionResponse> {
  return paystackRequest<PaystackSubscriptionResponse>("/subscription", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export async function disableSubscription(params: {
  code: string; // subscription code
  token: string; // email token
}): Promise<{ status: boolean; message: string }> {
  return paystackRequest("/subscription/disable", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export async function fetchSubscription(
  idOrCode: string
): Promise<PaystackSubscriptionResponse> {
  return paystackRequest<PaystackSubscriptionResponse>(
    `/subscription/${encodeURIComponent(idOrCode)}`
  );
}

export function verifyWebhookSignature(
  body: string,
  signature: string
): boolean {
  // Paystack signs webhooks with HMAC SHA-512 using your secret key
  const crypto = require("crypto") as typeof import("crypto");
  const hash = crypto
    .createHmac("sha512", PAYSTACK_SECRET_KEY)
    .update(body)
    .digest("hex");
  return hash === signature;
}
