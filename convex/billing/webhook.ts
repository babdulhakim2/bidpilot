import { httpAction } from "../_generated/server";
import { internal } from "../_generated/api";

// Simple signature verification using Web Crypto API
async function verifySignature(body: string, signature: string, secret: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"]
  );
  
  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(body)
  );
  
  const hashArray = Array.from(new Uint8Array(signatureBuffer));
  const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hash === signature;
}

export const handleWebhook = httpAction(async (ctx, request) => {
  const body = await request.text();
  const signature = request.headers.get("x-paystack-signature") || "";
  const secret = process.env.PAYSTACK_SECRET_KEY;

  // Verify signature
  if (!secret) {
    console.error("PAYSTACK_SECRET_KEY not configured");
    return new Response("Configuration error", { status: 500 });
  }

  const isValid = await verifySignature(body, signature, secret);
  if (!isValid) {
    console.error("Invalid Paystack webhook signature");
    return new Response("Invalid signature", { status: 401 });
  }

  const event = JSON.parse(body);
  console.log("Paystack webhook event:", event.event);

  try {
    switch (event.event) {
      case "charge.success":
        await handleChargeSuccess(ctx, event.data);
        break;

      case "subscription.create":
        await handleSubscriptionCreate(ctx, event.data);
        break;

      case "subscription.not_renew":
        await handleSubscriptionNotRenew(ctx, event.data);
        break;

      case "subscription.disable":
        await handleSubscriptionDisable(ctx, event.data);
        break;

      case "invoice.payment_failed":
        await handlePaymentFailed(ctx, event.data);
        break;

      case "invoice.update":
        await handleInvoiceUpdate(ctx, event.data);
        break;

      default:
        console.log("Unhandled webhook event:", event.event);
    }

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return new Response("Processing error", { status: 500 });
  }
});

async function handleChargeSuccess(ctx: any, data: any) {
  console.log("Charge successful:", data.reference);

  // Extract user info from metadata
  const { plan } = data.metadata || {};
  const customerEmail = data.customer?.email;

  if (!customerEmail) {
    console.error("No customer email in charge data");
    return;
  }

  // Find user by email
  const user = await ctx.runQuery(internal.billing.helpers.getUserByEmail, {
    email: customerEmail,
  });

  if (!user) {
    console.error("User not found for email:", customerEmail);
    return;
  }

  // Record transaction
  await ctx.runMutation(internal.billing.helpers.recordTransaction, {
    userId: user._id,
    type: "subscription",
    status: "success",
    amountNaira: data.amount / 100,
    paystackReference: data.reference,
    paystackTransactionId: data.id,
    paystackChannel: data.channel,
    cardLast4: data.authorization?.last4,
    cardBrand: data.authorization?.brand,
    description: `${plan || "Subscription"} payment`,
  });

  // If this is a subscription payment, create/update subscription
  if (plan && ["starter", "pro"].includes(plan)) {
    await ctx.runMutation(internal.billing.helpers.createSubscription, {
      userId: user._id,
      plan,
      paystackCustomerId: data.customer?.customer_code,
      paystackAuthorizationCode: data.authorization?.authorization_code,
      transactionReference: data.reference,
    });
  }
}

async function handleSubscriptionCreate(ctx: any, data: any) {
  console.log("Subscription created:", data.subscription_code);

  const customerEmail = data.customer?.email;
  if (!customerEmail) return;

  const user = await ctx.runQuery(internal.billing.helpers.getUserByEmail, {
    email: customerEmail,
  });

  if (!user) {
    console.error("User not found for subscription:", customerEmail);
    return;
  }

  // Update subscription with Paystack subscription code
  await ctx.runMutation(internal.billing.helpers.updateSubscriptionCode, {
    userId: user._id,
    paystackSubscriptionCode: data.subscription_code,
    paystackPlanCode: data.plan?.plan_code,
  });
}

async function handleSubscriptionNotRenew(ctx: any, data: any) {
  console.log("Subscription will not renew:", data.subscription_code);

  await ctx.runMutation(internal.billing.subscriptions.updateStatus, {
    paystackSubscriptionCode: data.subscription_code,
    status: "cancelled",
  });
}

async function handleSubscriptionDisable(ctx: any, data: any) {
  console.log("Subscription disabled:", data.subscription_code);

  await ctx.runMutation(internal.billing.subscriptions.updateStatus, {
    paystackSubscriptionCode: data.subscription_code,
    status: "cancelled",
  });
}

async function handlePaymentFailed(ctx: any, data: any) {
  console.log("Payment failed for subscription:", data.subscription?.subscription_code);

  if (data.subscription?.subscription_code) {
    await ctx.runMutation(internal.billing.subscriptions.updateStatus, {
      paystackSubscriptionCode: data.subscription.subscription_code,
      status: "past_due",
    });
  }
}

async function handleInvoiceUpdate(ctx: any, data: any) {
  console.log("Invoice updated:", data.id);
  // Handle invoice updates if needed
}
