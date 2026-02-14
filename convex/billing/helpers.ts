import { v } from "convex/values";
import { internalQuery, internalMutation } from "../_generated/server";
import { PLANS } from "./paystack";

// Get user by email (internal)
export const getUserByEmail = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), args.email))
      .first();
  },
});

// Record transaction (internal)
export const recordTransaction = internalMutation({
  args: {
    userId: v.id("users"),
    subscriptionId: v.optional(v.id("subscriptions")),
    type: v.union(v.literal("subscription"), v.literal("one_time"), v.literal("refund")),
    status: v.union(v.literal("pending"), v.literal("success"), v.literal("failed"), v.literal("refunded")),
    amountNaira: v.number(),
    paystackReference: v.string(),
    paystackTransactionId: v.optional(v.number()),
    paystackChannel: v.optional(v.string()),
    cardLast4: v.optional(v.string()),
    cardBrand: v.optional(v.string()),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("transactions", {
      ...args,
      currency: "NGN",
      createdAt: Date.now(),
    });
  },
});

// Create subscription (internal - from webhook)
export const createSubscription = internalMutation({
  args: {
    userId: v.id("users"),
    plan: v.union(v.literal("starter"), v.literal("pro"), v.literal("enterprise")),
    paystackCustomerId: v.optional(v.string()),
    paystackSubscriptionCode: v.optional(v.string()),
    paystackAuthorizationCode: v.optional(v.string()),
    transactionReference: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const planDetails = PLANS[args.plan];
    
    // Cancel any existing active subscription
    const existing = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        status: "cancelled",
        cancelledAt: now,
        updatedAt: now,
      });
    }

    // Calculate period (monthly)
    const periodEnd = now + 30 * 24 * 60 * 60 * 1000;

    // Create new subscription
    const subscriptionId = await ctx.db.insert("subscriptions", {
      userId: args.userId,
      plan: args.plan,
      status: "active",
      paystackCustomerId: args.paystackCustomerId,
      paystackSubscriptionCode: args.paystackSubscriptionCode,
      paystackAuthorizationCode: args.paystackAuthorizationCode,
      amountNaira: planDetails.amountNaira,
      billingCycle: "monthly",
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      createdAt: now,
      updatedAt: now,
    });

    // Create usage record
    await ctx.db.insert("usage", {
      userId: args.userId,
      subscriptionId,
      periodStart: now,
      periodEnd,
      alertsLimit: planDetails.alerts,
      proposalsLimit: planDetails.proposals,
      alertsUsed: 0,
      proposalsUsed: 0,
      createdAt: now,
      updatedAt: now,
    });

    return subscriptionId;
  },
});

// Update subscription with Paystack codes
export const updateSubscriptionCode = internalMutation({
  args: {
    userId: v.id("users"),
    paystackSubscriptionCode: v.string(),
    paystackPlanCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .order("desc")
      .first();

    if (subscription) {
      await ctx.db.patch(subscription._id, {
        paystackSubscriptionCode: args.paystackSubscriptionCode,
        paystackPlanCode: args.paystackPlanCode,
        updatedAt: Date.now(),
      });
    }
  },
});
