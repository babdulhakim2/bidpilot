import { v } from "convex/values";
import { query, mutation, internalMutation } from "../_generated/server";
import { PLANS } from "./paystack";

// Get current user's subscription
export const getMine = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) return null;

    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (!subscription) {
      // Return free tier info
      return {
        plan: "free" as const,
        status: "active" as const,
        limits: { alerts: 5, proposals: 1 },
        usage: await getCurrentUsage(ctx, user._id),
      };
    }

    const planLimits = PLANS[subscription.plan];
    
    return {
      ...subscription,
      limits: {
        alerts: planLimits.alerts,
        proposals: planLimits.proposals,
      },
      usage: await getCurrentUsage(ctx, user._id),
    };
  },
});

// Get user's current usage for this period
async function getCurrentUsage(ctx: any, userId: any) {
  const now = Date.now();
  
  const usage = await ctx.db
    .query("usage")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .filter((q: any) => 
      q.and(
        q.lte(q.field("periodStart"), now),
        q.gte(q.field("periodEnd"), now)
      )
    )
    .first();

  if (!usage) {
    return {
      alertsUsed: 0,
      proposalsUsed: 0,
      alertsLimit: 5, // Free tier
      proposalsLimit: 1,
    };
  }

  return {
    alertsUsed: usage.alertsUsed,
    proposalsUsed: usage.proposalsUsed,
    alertsLimit: usage.alertsLimit,
    proposalsLimit: usage.proposalsLimit,
  };
}

// Get usage for display
export const getUsage = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) return null;

    return await getCurrentUsage(ctx, user._id);
  },
});

// Create subscription after successful payment
export const createFromPayment = mutation({
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
    const periodEnd = now + 30 * 24 * 60 * 60 * 1000; // 30 days

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

    // Create usage record for this period
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

// Record transaction
export const recordTransaction = mutation({
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

// Get transaction history
export const getTransactions = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) return [];

    return await ctx.db
      .query("transactions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(args.limit ?? 50);
  },
});

// Increment usage (called when user uses alerts/proposals)
export const incrementUsage = mutation({
  args: {
    type: v.union(v.literal("alert"), v.literal("proposal")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    const now = Date.now();

    // Get or create current usage record
    let usage = await ctx.db
      .query("usage")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) =>
        q.and(
          q.lte(q.field("periodStart"), now),
          q.gte(q.field("periodEnd"), now)
        )
      )
      .first();

    if (!usage) {
      // Create free tier usage for this month
      const periodStart = now;
      const periodEnd = now + 30 * 24 * 60 * 60 * 1000;

      const usageId = await ctx.db.insert("usage", {
        userId: user._id,
        periodStart,
        periodEnd,
        alertsLimit: 5,
        proposalsLimit: 1,
        alertsUsed: 0,
        proposalsUsed: 0,
        createdAt: now,
        updatedAt: now,
      });

      usage = await ctx.db.get(usageId);
    }

    if (!usage) throw new Error("Failed to get usage");

    // Check limits
    if (args.type === "alert") {
      if (usage.alertsLimit !== -1 && usage.alertsUsed >= usage.alertsLimit) {
        throw new Error("Alert limit reached. Please upgrade your plan.");
      }
      await ctx.db.patch(usage._id, {
        alertsUsed: usage.alertsUsed + 1,
        updatedAt: now,
      });
    } else {
      if (usage.proposalsLimit !== -1 && usage.proposalsUsed >= usage.proposalsLimit) {
        throw new Error("Proposal limit reached. Please upgrade your plan.");
      }
      await ctx.db.patch(usage._id, {
        proposalsUsed: usage.proposalsUsed + 1,
        updatedAt: now,
      });
    }

    return true;
  },
});

// Check if user can use a feature
export const canUse = query({
  args: {
    type: v.union(v.literal("alert"), v.literal("proposal")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { allowed: false, reason: "Not authenticated" };

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) return { allowed: false, reason: "User not found" };

    const usage = await getCurrentUsage(ctx, user._id);

    if (args.type === "alert") {
      if (usage.alertsLimit === -1) return { allowed: true };
      if (usage.alertsUsed >= usage.alertsLimit) {
        return {
          allowed: false,
          reason: `You've used all ${usage.alertsLimit} alerts this month`,
          used: usage.alertsUsed,
          limit: usage.alertsLimit,
        };
      }
      return {
        allowed: true,
        used: usage.alertsUsed,
        limit: usage.alertsLimit,
        remaining: usage.alertsLimit - usage.alertsUsed,
      };
    } else {
      if (usage.proposalsLimit === -1) return { allowed: true };
      if (usage.proposalsUsed >= usage.proposalsLimit) {
        return {
          allowed: false,
          reason: `You've used all ${usage.proposalsLimit} proposals this month`,
          used: usage.proposalsUsed,
          limit: usage.proposalsLimit,
        };
      }
      return {
        allowed: true,
        used: usage.proposalsUsed,
        limit: usage.proposalsLimit,
        remaining: usage.proposalsLimit - usage.proposalsUsed,
      };
    }
  },
});

// Cancel subscription
export const cancel = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (!subscription) throw new Error("No active subscription");

    const now = Date.now();
    await ctx.db.patch(subscription._id, {
      status: "cancelled",
      cancelledAt: now,
      updatedAt: now,
    });

    return true;
  },
});

// Update subscription status (from webhook)
export const updateStatus = internalMutation({
  args: {
    paystackSubscriptionCode: v.string(),
    status: v.union(v.literal("active"), v.literal("cancelled"), v.literal("expired"), v.literal("past_due")),
  },
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_paystack_subscription", (q) =>
        q.eq("paystackSubscriptionCode", args.paystackSubscriptionCode)
      )
      .first();

    if (!subscription) {
      console.error("Subscription not found:", args.paystackSubscriptionCode);
      return;
    }

    await ctx.db.patch(subscription._id, {
      status: args.status,
      updatedAt: Date.now(),
    });
  },
});
