"use node";

import { action, internalAction } from "../_generated/server";
import { v } from "convex/values";
import { api, internal } from "../_generated/api";

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY!;
const PAYSTACK_BASE_URL = "https://api.paystack.co";

// Plan codes and pricing
export const PLANS = {
  starter: {
    name: "Starter",
    amountKobo: 2000000, // ₦20,000
    amountNaira: 20000,
    alerts: 15,
    proposals: 3,
  },
  pro: {
    name: "Pro",
    amountKobo: 5000000, // ₦50,000
    amountNaira: 50000,
    alerts: 100,
    proposals: 10,
  },
  enterprise: {
    name: "Enterprise",
    amountKobo: 0, // Custom
    amountNaira: 0,
    alerts: -1, // Unlimited
    proposals: -1,
  },
};

// Helper to make Paystack API calls
async function paystackFetch(
  endpoint: string,
  options: RequestInit = {}
): Promise<any> {
  const response = await fetch(`${PAYSTACK_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Paystack API error");
  }

  return data;
}

// Initialize a transaction for subscription
export const initializeTransaction = action({
  args: {
    plan: v.union(v.literal("starter"), v.literal("pro")),
    email: v.string(),
    callbackUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const planDetails = PLANS[args.plan];
    
    // Generate unique reference
    const reference = `bp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const response = await paystackFetch("/transaction/initialize", {
      method: "POST",
      body: JSON.stringify({
        email: args.email,
        amount: planDetails.amountKobo,
        reference,
        callback_url: args.callbackUrl,
        metadata: {
          plan: args.plan,
          custom_fields: [
            {
              display_name: "Plan",
              variable_name: "plan",
              value: planDetails.name,
            },
          ],
        },
        channels: ["card", "bank", "ussd", "bank_transfer"],
      }),
    });

    return {
      authorizationUrl: response.data.authorization_url,
      accessCode: response.data.access_code,
      reference: response.data.reference,
    };
  },
});

// Verify a transaction after payment
export const verifyTransaction = action({
  args: {
    reference: v.string(),
  },
  handler: async (ctx, args) => {
    const response = await paystackFetch(`/transaction/verify/${args.reference}`);
    
    if (response.data.status !== "success") {
      throw new Error("Transaction not successful");
    }

    return {
      status: response.data.status,
      amount: response.data.amount,
      channel: response.data.channel,
      currency: response.data.currency,
      reference: response.data.reference,
      transactionId: response.data.id,
      paidAt: response.data.paid_at,
      authorization: response.data.authorization,
      customer: response.data.customer,
      metadata: response.data.metadata,
    };
  },
});

// Create or get Paystack customer
export const createCustomer = action({
  args: {
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    phone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const response = await paystackFetch("/customer", {
      method: "POST",
      body: JSON.stringify({
        email: args.email,
        first_name: args.firstName,
        last_name: args.lastName,
        phone: args.phone,
      }),
    });

    return {
      customerCode: response.data.customer_code,
      customerId: response.data.id,
      email: response.data.email,
    };
  },
});

// Create a subscription
export const createSubscription = action({
  args: {
    customerEmail: v.string(),
    plan: v.union(v.literal("starter"), v.literal("pro")),
    authorizationCode: v.string(), // From a previous successful transaction
  },
  handler: async (ctx, args) => {
    const planCode = process.env[`PAYSTACK_PLAN_${args.plan.toUpperCase()}`];
    
    if (!planCode) {
      throw new Error(`Plan code not configured for ${args.plan}`);
    }

    const response = await paystackFetch("/subscription", {
      method: "POST",
      body: JSON.stringify({
        customer: args.customerEmail,
        plan: planCode,
        authorization: args.authorizationCode,
      }),
    });

    return {
      subscriptionCode: response.data.subscription_code,
      status: response.data.status,
      nextPaymentDate: response.data.next_payment_date,
    };
  },
});

// Get subscription details
export const getSubscription = action({
  args: {
    subscriptionCode: v.string(),
  },
  handler: async (ctx, args) => {
    const response = await paystackFetch(`/subscription/${args.subscriptionCode}`);

    return {
      status: response.data.status,
      subscriptionCode: response.data.subscription_code,
      amount: response.data.amount,
      nextPaymentDate: response.data.next_payment_date,
      plan: response.data.plan,
      authorization: response.data.authorization,
    };
  },
});

// Cancel a subscription
export const cancelSubscription = action({
  args: {
    subscriptionCode: v.string(),
    emailToken: v.string(),
  },
  handler: async (ctx, args) => {
    const response = await paystackFetch("/subscription/disable", {
      method: "POST",
      body: JSON.stringify({
        code: args.subscriptionCode,
        token: args.emailToken,
      }),
    });

    return {
      status: response.data.status,
    };
  },
});

// Generate a subscription manage link
export const getManageLink = action({
  args: {
    subscriptionCode: v.string(),
  },
  handler: async (ctx, args) => {
    const response = await paystackFetch(
      `/subscription/${args.subscriptionCode}/manage/link`
    );

    return {
      link: response.data.link,
    };
  },
});

// List banks (for bank transfer)
export const listBanks = action({
  args: {},
  handler: async () => {
    const response = await paystackFetch("/bank?country=nigeria&perPage=100");
    
    return response.data.map((bank: any) => ({
      name: bank.name,
      code: bank.code,
      type: bank.type,
    }));
  },
});
