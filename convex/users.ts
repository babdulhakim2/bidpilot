import { v } from "convex/values";
import { query, mutation, QueryCtx, MutationCtx } from "./_generated/server";

// Helper: Get current user from auth context
async function getCurrentUserFromAuth(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  
  return await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
    .first();
}

// Get current authenticated user
export const me = query({
  args: {},
  handler: async (ctx) => {
    return await getCurrentUserFromAuth(ctx);
  },
});

// Get user by Clerk ID
export const getByClerkId = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();
  },
});

// Get user by ID
export const get = query({
  args: { id: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Ensure user exists (create if not) - called on sign in
export const ensureUser = mutation({
  args: {
    companyName: v.optional(v.string()),
    email: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const clerkId = identity.subject;
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
      .first();

    if (existing) {
      // Update email if changed
      if (args.email && args.email !== existing.email) {
        await ctx.db.patch(existing._id, { 
          email: args.email,
          updatedAt: Date.now() 
        });
      }
      return existing._id;
    }

    // Create new user
    const now = Date.now();
    return await ctx.db.insert("users", {
      clerkId,
      companyName: args.companyName || identity.name || "My Company",
      email: args.email || identity.email,
      categories: [],
      completeness: 25,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Create or update user (upsert) - legacy, prefer ensureUser
export const upsert = mutation({
  args: {
    clerkId: v.string(),
    companyName: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    categories: v.array(v.string()),
    googleConnected: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...args,
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("users", {
      ...args,
      completeness: 25,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Update current user's profile
export const updateMe = mutation({
  args: {
    companyName: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    categories: v.optional(v.array(v.string())),
    googleConnected: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserFromAuth(ctx);
    if (!user) throw new Error("Not authenticated");

    const updates = Object.fromEntries(
      Object.entries(args).filter(([_, v]) => v !== undefined)
    );
    
    await ctx.db.patch(user._id, { ...updates, updatedAt: Date.now() });
    return await ctx.db.get(user._id);
  },
});

// Update user profile by ID
export const update = mutation({
  args: {
    id: v.id("users"),
    companyName: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    categories: v.optional(v.array(v.string())),
    completeness: v.optional(v.number()),
    googleConnected: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );
    await ctx.db.patch(id, { ...filtered, updatedAt: Date.now() });
    return await ctx.db.get(id);
  },
});

// Update completeness based on documents
export const recalculateCompleteness = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const docs = await ctx.db
      .query("documents")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("status"), "verified"))
      .collect();

    const completeness = Math.min(100, 25 + docs.length * 15);
    
    await ctx.db.patch(args.userId, { 
      completeness,
      updatedAt: Date.now(),
    });
    
    return completeness;
  },
});
