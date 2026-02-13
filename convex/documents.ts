import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireUser, getUser } from "./lib/auth";

// Get all documents for current authenticated user
export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const user = await getUser(ctx);
    if (!user) return [];
    
    return await ctx.db
      .query("documents")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();
  },
});

// Get all documents for a user (by ID)
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

// Get documents by category for current user
export const myByCategory = query({
  args: { category: v.string() },
  handler: async (ctx, args) => {
    const user = await getUser(ctx);
    if (!user) return [];
    
    const docs = await ctx.db
      .query("documents")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    return docs.filter((d) => d.category === args.category);
  },
});

// Get documents by category (legacy)
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

// Create document for current authenticated user
export const createMine = mutation({
  args: {
    name: v.string(),
    type: v.string(),
    category: v.string(),
    size: v.string(),
    storageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    
    const docId = await ctx.db.insert("documents", {
      userId: user._id,
      ...args,
      status: "processing",
      uploadedAt: Date.now(),
    });

    return docId;
  },
});

// Create document record after upload (legacy - with explicit userId)
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

    return docId;
  },
});

// Update document status (called after processing)
export const updateStatus = mutation({
  args: {
    id: v.id("documents"),
    status: v.union(v.literal("verified"), v.literal("processing"), v.literal("rejected"), v.literal("extracting")),
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

// Delete document (with ownership check)
export const removeMine = mutation({
  args: { id: v.id("documents") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const doc = await ctx.db.get(args.id);
    
    if (!doc) throw new Error("Document not found");
    if (doc.userId !== user._id) throw new Error("Not authorized");
    
    // Delete from storage if exists
    if (doc.storageId) {
      await ctx.storage.delete(doc.storageId);
    }
    
    await ctx.db.delete(args.id);
    
    // Recalculate completeness
    const docs = await ctx.db
      .query("documents")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("status"), "verified"))
      .collect();
    
    const completeness = Math.min(100, 25 + docs.length * 15);
    await ctx.db.patch(user._id, { 
      completeness,
      updatedAt: Date.now(),
    });
  },
});

// Delete document (legacy)
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

// Update document with extracted content (called by extraction pipeline)
export const updateExtraction = mutation({
  args: {
    id: v.id("documents"),
    extractedContent: v.optional(v.string()),
    extractedInsights: v.optional(v.object({
      summary: v.optional(v.string()),
      companyName: v.optional(v.string()),
      industry: v.optional(v.string()),
      services: v.optional(v.array(v.string())),
      experience: v.optional(v.array(v.string())),
      certifications: v.optional(v.array(v.string())),
      contacts: v.optional(v.object({
        email: v.optional(v.string()),
        phone: v.optional(v.string()),
        address: v.optional(v.string()),
      })),
      keyFacts: v.optional(v.array(v.string())),
    })),
    extractionError: v.optional(v.string()),
    status: v.optional(v.union(v.literal("verified"), v.literal("processing"), v.literal("rejected"), v.literal("extracting"))),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );
    
    await ctx.db.patch(id, filtered);
    
    // If status is verified, recalculate completeness
    if (args.status === "verified") {
      const doc = await ctx.db.get(id);
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
    
    return await ctx.db.get(id);
  },
});
