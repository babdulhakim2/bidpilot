import { v } from "convex/values";
import { query, internalMutation, internalQuery } from "./_generated/server";

// Internal mutation to store a chunk
export const storeChunk = internalMutation({
  args: {
    documentId: v.id("documents"),
    userId: v.id("users"),
    chunkIndex: v.number(),
    text: v.string(),
    embedding: v.array(v.float64()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("documentChunks", args);
  },
});

// Internal query to get document content
export const getDocumentContent = internalQuery({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.documentId);
    return doc;
  },
});

// Delete chunks for a document (when re-indexing or deleting)
export const deleteChunks = internalMutation({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    const chunks = await ctx.db
      .query("documentChunks")
      .withIndex("by_document", (q) => q.eq("documentId", args.documentId))
      .collect();
    
    for (const chunk of chunks) {
      await ctx.db.delete(chunk._id);
    }
    
    return chunks.length;
  },
});

// Query: Check if document is indexed
export const isIndexed = query({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    const chunks = await ctx.db
      .query("documentChunks")
      .withIndex("by_document", (q) => q.eq("documentId", args.documentId))
      .first();
    
    return !!chunks;
  },
});

// Query: Get chunk count for document
export const getChunkCount = query({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    const chunks = await ctx.db
      .query("documentChunks")
      .withIndex("by_document", (q) => q.eq("documentId", args.documentId))
      .collect();
    
    return chunks.length;
  },
});

// Internal query to get all verified documents for a user
export const getVerifiedDocuments = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("documents")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.and(
        q.eq(q.field("status"), "verified"),
        q.neq(q.field("extractedContent"), undefined)
      ))
      .collect();
  },
});
