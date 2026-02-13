import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Get all documents for a user
export const listByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("documents")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();
  },
});

// Get document by ID
export const get = query({
  args: { id: v.id("documents") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Get documents by category
export const byCategory = query({
  args: { userId: v.id("users"), category: v.string() },
  handler: async (ctx, args) => {
    const docs = await ctx.db
      .query("documents")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    return docs.filter((d) => d.category === args.category);
  },
});

// Generate upload URL for Convex storage
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

// Create document record after upload
export const create = mutation({
  args: {
    userId: v.id("users"),
    name: v.string(),
    type: v.string(),
    category: v.string(),
    size: v.string(),
    storageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const docId = await ctx.db.insert("documents", {
      ...args,
      status: "processing",
      uploadedAt: Date.now(),
    });

    // Simulate processing - in production, this would trigger a background job
    // For now, we'll auto-verify after a delay via a separate mutation
    return docId;
  },
});

// Update document status (called after processing)
export const updateStatus = mutation({
  args: {
    id: v.id("documents"),
    status: v.union(v.literal("verified"), v.literal("processing"), v.literal("rejected")),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { status: args.status });
    
    // If verified, recalculate user completeness
    if (args.status === "verified") {
      const doc = await ctx.db.get(args.id);
      if (doc) {
        const docs = await ctx.db
          .query("documents")
          .withIndex("by_user", (q) => q.eq("userId", doc.userId))
          .filter((q) => q.eq(q.field("status"), "verified"))
          .collect();
        
        const completeness = Math.min(100, 25 + docs.length * 15);
        await ctx.db.patch(doc.userId, { 
          completeness,
          updatedAt: Date.now(),
        });
      }
    }
    
    return await ctx.db.get(args.id);
  },
});

// Delete document
export const remove = mutation({
  args: { id: v.id("documents") },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.id);
    
    // Delete from storage if exists
    if (doc?.storageId) {
      await ctx.storage.delete(doc.storageId);
    }
    
    await ctx.db.delete(args.id);
    
    // Recalculate completeness
    if (doc) {
      const docs = await ctx.db
        .query("documents")
        .withIndex("by_user", (q) => q.eq("userId", doc.userId))
        .filter((q) => q.eq(q.field("status"), "verified"))
        .collect();
      
      const completeness = Math.min(100, 25 + docs.length * 15);
      await ctx.db.patch(doc.userId, { 
        completeness,
        updatedAt: Date.now(),
      });
    }
  },
});

// Get download URL for a document
export const getUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});
