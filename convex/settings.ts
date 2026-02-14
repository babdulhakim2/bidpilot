import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Get a setting by key
export const get = query({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    const setting = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();
    return setting?.value ?? null;
  },
});

// Get all settings
export const getAll = query({
  args: {},
  handler: async (ctx) => {
    const settings = await ctx.db.query("settings").collect();
    return Object.fromEntries(settings.map((s) => [s.key, s.value]));
  },
});

// Set a setting (upsert)
export const set = mutation({
  args: { 
    key: v.string(), 
    value: v.string() 
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { 
        value: args.value, 
        updatedAt: Date.now() 
      });
      return existing._id;
    } else {
      return await ctx.db.insert("settings", {
        key: args.key,
        value: args.value,
        updatedAt: Date.now(),
      });
    }
  },
});

// Initialize default settings
export const initDefaults = mutation({
  args: {},
  handler: async (ctx) => {
    const defaults: Record<string, string> = {
      "scraper.interval": "10",
      "scraper.enabled": "true",
    };

    for (const [key, value] of Object.entries(defaults)) {
      const existing = await ctx.db
        .query("settings")
        .withIndex("by_key", (q) => q.eq("key", key))
        .first();
      
      if (!existing) {
        await ctx.db.insert("settings", {
          key,
          value,
          updatedAt: Date.now(),
        });
      }
    }
  },
});
