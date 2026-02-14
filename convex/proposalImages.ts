import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Get all images for a proposal
export const listByProposal = query({
  args: { proposalId: v.id("proposals") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("proposalImages")
      .withIndex("by_proposal", (q) => q.eq("proposalId", args.proposalId))
      .collect();
  },
});

// Get image for a specific section
export const getBySection = query({
  args: { 
    proposalId: v.id("proposals"),
    sectionId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("proposalImages")
      .withIndex("by_section", (q) => 
        q.eq("proposalId", args.proposalId).eq("sectionId", args.sectionId)
      )
      .first();
  },
});

// Save or update an image for a section
export const upsert = mutation({
  args: {
    proposalId: v.id("proposals"),
    sectionId: v.string(),
    sectionTitle: v.string(),
    prompt: v.string(),
    storageId: v.id("_storage"),
    url: v.string(),
    order: v.number(),
  },
  handler: async (ctx, args) => {
    // Check if image already exists for this section
    const existing = await ctx.db
      .query("proposalImages")
      .withIndex("by_section", (q) => 
        q.eq("proposalId", args.proposalId).eq("sectionId", args.sectionId)
      )
      .first();

    if (existing) {
      // Delete old image from storage
      await ctx.storage.delete(existing.storageId);
      
      // Update record
      await ctx.db.patch(existing._id, {
        prompt: args.prompt,
        storageId: args.storageId,
        url: args.url,
        sectionTitle: args.sectionTitle,
        order: args.order,
      });
      return existing._id;
    } else {
      // Create new record
      return await ctx.db.insert("proposalImages", {
        ...args,
        createdAt: Date.now(),
      });
    }
  },
});

// Update just the prompt for an image
export const updatePrompt = mutation({
  args: {
    proposalId: v.id("proposals"),
    sectionId: v.string(),
    prompt: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("proposalImages")
      .withIndex("by_section", (q) => 
        q.eq("proposalId", args.proposalId).eq("sectionId", args.sectionId)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { prompt: args.prompt });
    }
  },
});

// Delete image for a section
export const deleteBySection = mutation({
  args: {
    proposalId: v.id("proposals"),
    sectionId: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("proposalImages")
      .withIndex("by_section", (q) => 
        q.eq("proposalId", args.proposalId).eq("sectionId", args.sectionId)
      )
      .first();

    if (existing) {
      await ctx.storage.delete(existing.storageId);
      await ctx.db.delete(existing._id);
    }
  },
});

// Delete all images for a proposal
export const deleteByProposal = mutation({
  args: { proposalId: v.id("proposals") },
  handler: async (ctx, args) => {
    const images = await ctx.db
      .query("proposalImages")
      .withIndex("by_proposal", (q) => q.eq("proposalId", args.proposalId))
      .collect();

    for (const img of images) {
      await ctx.storage.delete(img.storageId);
      await ctx.db.delete(img._id);
    }
  },
});
