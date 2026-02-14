import { v } from "convex/values";
import { query, mutation, internalMutation } from "../_generated/server";
import { PLANS, FREE_LIMITS } from "./paystack";

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
      // Return free tier info (lifetime limits, not monthly)
      return {
        plan: "free" as const,
        status: "active" as const,
        limits: { analysis: FREE_LIMITS.analysis, proposals: FREE_LIMITS.proposals },
        usage: await getCurrentUsage(ctx, user._id, null, true),
      };
    }

    const planLimits = PLANS[subscription.plan];
    
    return {
      ...subscription,
      limits: {
        analysis: planLimits.analysis,
        proposals: planLimits.proposals,
      },
      usage: await getCurrentUsage(ctx, user._id, subscription, false),
    };
  },
});

// Get user's current usage for this period
async function getCurrentUsage(ctx: any, userId: any, subscription: any, isFree: boolean) {
  const now = Date.now();
  
  // Determine limits based on current subscription (always use live plan limits)
  let analysisLimit = FREE_LIMITS.analysis;  // Free tier default (lifetime)
  let proposalsLimit = FREE_LIMITS.proposals;
  
  if (subscription && subscription.status === "active") {
    const planLimits = PLANS[subscription.plan as keyof typeof PLANS];
    analysisLimit = planLimits?.analysis ?? FREE_LIMITS.analysis;
    proposalsLimit = planLimits?.proposals ?? FREE_LIMITS.proposals;
  }
  
  // For free users, check lifetime usage (no period filter)
  // For paid users, check current billing period
  let usage;
  if (isFree) {
    // Get total lifetime usage for free users
    usage = await ctx.db
      .query("usage")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .first();
  } else {
    // Get usage record for current period
    usage = await ctx.db
      .query("usage")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .filter((q: any) => 
        q.and(
          q.lte(q.field("periodStart"), now),
          q.gte(q.field("periodEnd"), now)
        )
      )
      .first();
  }

  if (!usage) {
    // No usage record - return defaults with plan limits
    return {
      analysisUsed: 0,
      proposalsUsed: 0,
      analysisLimit,
      proposalsLimit,
    };
  }

  // Return actual usage but with CURRENT plan limits (in case of upgrade)
  return {
    analysisUsed: usage.analysisUsed ?? usage.alertsUsed ?? 0,
    proposalsUsed: usage.proposalsUsed,
    analysisLimit,  // Always use current plan limits
    proposalsLimit,  // Always use current plan limits
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

    // Check if user has active subscription
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    return await getCurrentUsage(ctx, user._id, subscription, !subscription);
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

    // Get existing usage record to preserve usage counts on upgrade
    const existingUsage = await ctx.db
      .query("usage")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => 
        q.and(
          q.lte(q.field("periodStart"), now),
          q.gte(q.field("periodEnd"), now)
        )
      )
      .first();

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

    // If upgrading: update existing usage record with new limits
    // If new: create fresh usage record
    if (existingUsage) {
      await ctx.db.patch(existingUsage._id, {
        subscriptionId,
        analysisLimit: planDetails.analysis,
        proposalsLimit: planDetails.proposals,
        periodEnd, // Extend period to new subscription end
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("usage", {
        userId: args.userId,
        subscriptionId,
        periodStart: now,
        periodEnd,
        analysisLimit: planDetails.analysis,
        proposalsLimit: planDetails.proposals,
        analysisUsed: 0,
        proposalsUsed: 0,
        createdAt: now,
        updatedAt: now,
      });
    }

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

// Increment usage (called when user uses analysis/proposals)
export const incrementUsage = mutation({
  args: {
    type: v.union(v.literal("analysis"), v.literal("proposal")),
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

    // Check if user has active subscription
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    const isFree = !subscription;

    // Get or create usage record
    let usage;
    if (isFree) {
      // For free users, get/create lifetime usage record
      usage = await ctx.db
        .query("usage")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .first();

      if (!usage) {
        // Create lifetime usage for free tier
        const usageId = await ctx.db.insert("usage", {
          userId: user._id,
          periodStart: 0, // Epoch - lifetime
          periodEnd: 9999999999999, // Far future - lifetime
          analysisLimit: FREE_LIMITS.analysis,
          proposalsLimit: FREE_LIMITS.proposals,
          analysisUsed: 0,
          proposalsUsed: 0,
          createdAt: now,
          updatedAt: now,
        });
        usage = await ctx.db.get(usageId);
      }
    } else {
      // For paid users, get usage for current billing period
      usage = await ctx.db
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
        // Create usage for current period
        const planLimits = PLANS[subscription.plan as keyof typeof PLANS];
        const periodStart = now;
        const periodEnd = now + 30 * 24 * 60 * 60 * 1000;

        const usageId = await ctx.db.insert("usage", {
          userId: user._id,
          subscriptionId: subscription._id,
          periodStart,
          periodEnd,
          analysisLimit: planLimits.analysis,
          proposalsLimit: planLimits.proposals,
          analysisUsed: 0,
          proposalsUsed: 0,
          createdAt: now,
          updatedAt: now,
        });
        usage = await ctx.db.get(usageId);
      }
    }

    if (!usage) throw new Error("Failed to get usage");

    // Get current counts (handle old field name)
    const analysisUsed = usage.analysisUsed ?? usage.alertsUsed ?? 0;
    const analysisLimit = usage.analysisLimit ?? usage.alertsLimit ?? FREE_LIMITS.analysis;

    // Check limits
    if (args.type === "analysis") {
      if (analysisLimit !== -1 && analysisUsed >= analysisLimit) {
        throw new Error("Analysis limit reached. Please upgrade your plan.");
      }
      await ctx.db.patch(usage._id, {
        analysisUsed: analysisUsed + 1,
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
    type: v.union(v.literal("analysis"), v.literal("proposal")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { allowed: false, reason: "Not authenticated" };

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) return { allowed: false, reason: "User not found" };

    // Check if user has active subscription
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    const usage = await getCurrentUsage(ctx, user._id, subscription, !subscription);

    if (args.type === "analysis") {
      if (usage.analysisLimit === -1) return { allowed: true };
      if (usage.analysisUsed >= usage.analysisLimit) {
        return {
          allowed: false,
          reason: `You've used all ${usage.analysisLimit} analysis`,
          used: usage.analysisUsed,
          limit: usage.analysisLimit,
        };
      }
      return {
        allowed: true,
        used: usage.analysisUsed,
        limit: usage.analysisLimit,
        remaining: usage.analysisLimit - usage.analysisUsed,
      };
    } else {
      if (usage.proposalsLimit === -1) return { allowed: true };
      if (usage.proposalsUsed >= usage.proposalsLimit) {
        return {
          allowed: false,
          reason: `You've used all ${usage.proposalsLimit} proposals`,
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
