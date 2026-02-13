import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireUser, getUser } from "./lib/auth";

// Get all saved tenders for current user
export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const user = await getUser(ctx);
    if (!user) return [];
    
    const userTenders = await ctx.db
      .query("userTenders")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    
    // Fetch full tender data
    const tenders = await Promise.all(
      userTenders.map(async (ut) => {
        const tender = await ctx.db.get(ut.tenderId);
        return tender ? { ...tender, userTender: ut } : null;
      })
    );
    
    return tenders.filter(Boolean);
  },
});

// Get saved tenders for a user
export const listByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("userTenders")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

// Check if current user has saved a tender
export const isSaved = query({
  args: { tenderId: v.id("tenders") },
  handler: async (ctx, args) => {
    const user = await getUser(ctx);
    if (!user) return false;
    
    const existing = await ctx.db
      .query("userTenders")
      .withIndex("by_user_tender", (q) => 
        q.eq("userId", user._id).eq("tenderId", args.tenderId)
      )
      .first();
    
    return existing?.saved ?? false;
  },
});

// Get user-tender relationship
export const get = query({
  args: { tenderId: v.id("tenders") },
  handler: async (ctx, args) => {
    const user = await getUser(ctx);
    if (!user) return null;
    
    return await ctx.db
      .query("userTenders")
      .withIndex("by_user_tender", (q) => 
        q.eq("userId", user._id).eq("tenderId", args.tenderId)
      )
      .first();
  },
});

// Save/unsave a tender for current user
export const toggleSave = mutation({
  args: { tenderId: v.id("tenders") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    
    const existing = await ctx.db
      .query("userTenders")
      .withIndex("by_user_tender", (q) => 
        q.eq("userId", user._id).eq("tenderId", args.tenderId)
      )
      .first();
    
    if (existing) {
      await ctx.db.patch(existing._id, { saved: !existing.saved });
      return !existing.saved;
    }
    
    // Create new with saved = true
    await ctx.db.insert("userTenders", {
      userId: user._id,
      tenderId: args.tenderId,
      saved: true,
      matchScore: 0, // Will be calculated
    });
    
    return true;
  },
});

// Update match score for a tender
export const updateMatchScore = mutation({
  args: { 
    tenderId: v.id("tenders"),
    matchScore: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    
    const existing = await ctx.db
      .query("userTenders")
      .withIndex("by_user_tender", (q) => 
        q.eq("userId", user._id).eq("tenderId", args.tenderId)
      )
      .first();
    
    if (existing) {
      await ctx.db.patch(existing._id, { matchScore: args.matchScore });
      return existing._id;
    }
    
    return await ctx.db.insert("userTenders", {
      userId: user._id,
      tenderId: args.tenderId,
      saved: false,
      matchScore: args.matchScore,
    });
  },
});
