import {
  lemonSqueezySetup,
  createCheckout,
  getSubscription,
  updateSubscription,
  cancelSubscription,
  type Subscription,
} from "@lemonsqueezy/lemonsqueezy.js";
import crypto from "crypto";

const API_KEY = process.env.LEMONSQUEEZY_API_KEY!;
const STORE_ID = process.env.LEMONSQUEEZY_STORE_ID!;
const VARIANT_ID = process.env.LEMONSQUEEZY_VARIANT_ID!;
const WEBHOOK_SECRET = process.env.LEMONSQUEEZY_WEBHOOK_SECRET!;

let initialized = false;

function ensureSetup() {
  if (!initialized) {
    lemonSqueezySetup({ apiKey: API_KEY });
    initialized = true;
  }
}

// ── Checkout ──────────────────────────────────────────────────────

export async function createLsCheckout(params: {
  userId: string;
  email: string;
  name?: string;
  redirectUrl?: string;
}) {
  ensureSetup();

  const { data, error } = await createCheckout(STORE_ID, VARIANT_ID, {
    checkoutData: {
      email: params.email,
      name: params.name || undefined,
      custom: {
        user_id: params.userId,
      },
    },
    productOptions: {
      redirectUrl: params.redirectUrl,
    },
  });

  if (error) {
    throw new Error(error.message || "Failed to create checkout");
  }

  return data!.data.attributes.url;
}

// ── Subscriptions ─────────────────────────────────────────────────

export async function getLsSubscription(subscriptionId: string) {
  ensureSetup();
  const { data, error } = await getSubscription(subscriptionId);
  if (error) throw new Error(error.message);
  return data!.data;
}

export async function cancelLsSubscription(subscriptionId: string) {
  ensureSetup();
  const { data, error } = await cancelSubscription(subscriptionId);
  if (error) throw new Error(error.message);
  return data!.data;
}

export async function updateLsSubscription(
  subscriptionId: string,
  params: {
    variantId?: number;
    pause?: { mode: "void" | "free"; resumesAt?: string | null } | null;
    cancelled?: boolean;
  }
) {
  ensureSetup();
  const { data, error } = await updateSubscription(subscriptionId, params);
  if (error) throw new Error(error.message);
  return data!.data;
}

// ── Webhook verification ──────────────────────────────────────────

export function verifyWebhookSignature(
  rawBody: string,
  signature: string
): boolean {
  const hash = crypto
    .createHmac("sha256", WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signature));
}

// ── Types ─────────────────────────────────────────────────────────

export type LsSubscriptionAttributes = Subscription["data"]["attributes"];
