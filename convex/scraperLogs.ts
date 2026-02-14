import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";

// Log a scraper event
export const log = internalMutation({
  args: {
    source: v.string(),
    action: v.string(),
    message: v.string(),
    metadata: v.optional(v.object({
      tenderId: v.optional(v.string()),
      tenderTitle: v.optional(v.string()),
      count: v.optional(v.number()),
      added: v.optional(v.number()),
      skipped: v.optional(v.number()),
      error: v.optional(v.string()),
      url: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("scraperLogs", {
      ...args,
      timestamp: Date.now(),
    });
  },
});

// Get recent logs (for dashboard)
export const getRecent = query({
  args: {
    limit: v.optional(v.number()),
    source: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 100;
    
    let q = ctx.db.query("scraperLogs");
    
    if (args.source) {
      q = q.withIndex("by_source", (q) => q.eq("source", args.source));
    } else {
      q = q.withIndex("by_timestamp");
    }
    
    return await q.order("desc").take(limit);
  },
});

// Get logs since a timestamp (for real-time updates)
export const getSince = query({
  args: {
    since: v.number(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    
    return await ctx.db
      .query("scraperLogs")
      .withIndex("by_timestamp")
      .filter((q) => q.gt(q.field("timestamp"), args.since))
      .order("desc")
      .take(limit);
  },
});

// Get scraper stats
export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    
    const recentLogs = await ctx.db
      .query("scraperLogs")
      .withIndex("by_timestamp")
      .filter((q) => q.gt(q.field("timestamp"), oneDayAgo))
      .collect();
    
    // Group by source
    const bySource: Record<string, { added: number; skipped: number; errors: number; lastRun: number }> = {};
    
    for (const log of recentLogs) {
      if (!bySource[log.source]) {
        bySource[log.source] = { added: 0, skipped: 0, errors: 0, lastRun: 0 };
      }
      
      if (log.action === "complete" && log.metadata) {
        bySource[log.source].added += log.metadata.added ?? 0;
        bySource[log.source].skipped += log.metadata.skipped ?? 0;
        bySource[log.source].lastRun = Math.max(bySource[log.source].lastRun, log.timestamp);
      }
      
      if (log.action === "error") {
        bySource[log.source].errors++;
      }
    }
    
    return bySource;
  },
});

// Clear old logs (keep last 7 days)
export const cleanup = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    
    const oldLogs = await ctx.db
      .query("scraperLogs")
      .withIndex("by_timestamp")
      .filter((q) => q.lt(q.field("timestamp"), cutoff))
      .take(500);
    
    for (const log of oldLogs) {
      await ctx.db.delete(log._id);
    }
    
    return { deleted: oldLogs.length };
  },
});
