import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Get all tenders (newest first by scrapedAt or publishedAt)
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("tenders").order("desc").collect();
  },
});

// Get tenders with pagination for live feed
export const listRecent = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;
    return await ctx.db
      .query("tenders")
      .withIndex("by_scraped_at")
      .order("desc")
      .take(limit);
  },
});

// Check if tender exists by source ID (for deduplication)
export const getBySourceId = query({
  args: { source: v.string(), sourceId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tenders")
      .withIndex("by_source_id", (q) => 
        q.eq("source", args.source).eq("sourceId", args.sourceId)
      )
      .first();
  },
});

// Create tender from scraper
export const createFromScraper = mutation({
  args: {
    title: v.string(),
    organization: v.string(),
    budget: v.number(),
    deadline: v.string(),
    category: v.string(),
    categories: v.optional(v.array(v.string())),
    description: v.string(),
    location: v.string(),
    requirements: v.array(v.string()),
    missing: v.array(v.string()),
    source: v.string(),
    sourceId: v.string(),
    sourceUrl: v.string(),
    publishedAt: v.string(),
    status: v.union(v.literal("qualified"), v.literal("partial"), v.literal("low")),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("tenders", {
      ...args,
      scrapedAt: Date.now(),
    });
  },
});

// Get tender by ID
export const get = query({
  args: { id: v.id("tenders") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Get tenders by category
export const byCategory = query({
  args: { category: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tenders")
      .withIndex("by_category", (q) => q.eq("category", args.category))
      .collect();
  },
});

// Get tenders with upcoming deadlines
export const upcoming = query({
  args: { days: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const tenders = await ctx.db.query("tenders").collect();
    const now = new Date();
    const daysAhead = args.days ?? 7;
    const cutoff = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);
    
    return tenders.filter((t) => {
      const deadline = new Date(t.deadline);
      return deadline >= now && deadline <= cutoff;
    });
  },
});

// Create a new tender
export const create = mutation({
  args: {
    title: v.string(),
    organization: v.string(),
    budget: v.number(),
    deadline: v.string(),
    category: v.string(),
    status: v.union(v.literal("qualified"), v.literal("partial"), v.literal("low")),
    requirements: v.array(v.string()),
    missing: v.array(v.string()),
    description: v.string(),
    location: v.string(),
    source: v.string(),
    publishedAt: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("tenders", args);
  },
});

// Update a tender
export const update = mutation({
  args: {
    id: v.id("tenders"),
    title: v.optional(v.string()),
    organization: v.optional(v.string()),
    budget: v.optional(v.number()),
    deadline: v.optional(v.string()),
    category: v.optional(v.string()),
    status: v.optional(v.union(v.literal("qualified"), v.literal("partial"), v.literal("low"))),
    requirements: v.optional(v.array(v.string())),
    missing: v.optional(v.array(v.string())),
    description: v.optional(v.string()),
    location: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );
    await ctx.db.patch(id, filtered);
    return await ctx.db.get(id);
  },
});

// Delete a tender
export const remove = mutation({
  args: { id: v.id("tenders") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
