import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

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

// Create or update user (upsert)
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
      completeness: 25, // Starting completeness
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Update user profile
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

    // Calculate completeness: base 25% + 15% per verified doc (up to 5 docs = 100%)
    const completeness = Math.min(100, 25 + docs.length * 15);
    
    await ctx.db.patch(args.userId, { 
      completeness,
      updatedAt: Date.now(),
    });
    
    return completeness;
  },
});
