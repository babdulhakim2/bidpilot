import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireUser, getUser } from "./lib/auth";

// Get all proposals for current authenticated user
export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const user = await getUser(ctx);
    if (!user) return [];
    
    return await ctx.db
      .query("proposals")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();
  },
});

// Get all proposals for a user (by ID)
export const listByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("proposals")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();
  },
});

// Get proposal by ID
export const get = query({
  args: { id: v.id("proposals") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Get proposals for a tender
export const byTender = query({
  args: { tenderId: v.id("tenders") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("proposals")
      .withIndex("by_tender", (q) => q.eq("tenderId", args.tenderId))
      .collect();
  },
});

// Create a new proposal for current user
export const createMine = mutation({
  args: {
    tenderId: v.id("tenders"),
    tenderTitle: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const now = Date.now();
    
    return await ctx.db.insert("proposals", {
      userId: user._id,
      tenderId: args.tenderId,
      tenderTitle: args.tenderTitle,
      status: "draft",
      sections: [],
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Create a new proposal (legacy - with explicit userId)
export const create = mutation({
  args: {
    userId: v.id("users"),
    tenderId: v.id("tenders"),
    tenderTitle: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("proposals", {
      ...args,
      status: "draft",
      sections: [],
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Generate proposal content (with ownership check)
export const generate = mutation({
  args: { id: v.id("proposals") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const proposal = await ctx.db.get(args.id);
    
    if (!proposal) throw new Error("Proposal not found");
    if (proposal.userId !== user._id) throw new Error("Not authorized");

    // Get tender details
    const tender = await ctx.db.get(proposal.tenderId);
    if (!tender) throw new Error("Tender not found");

    // Simulated generated sections
    const sections = [
      "Cover Letter",
      "Technical Proposal",
      "Company Profile",
      "Past Experience",
      "Financial Proposal",
    ];

    // Simulated content (in production, this would call AI)
    const content = `
# Proposal for ${tender.title}

## Cover Letter
Dear ${tender.organization},

${user.companyName} is pleased to submit this proposal for ${tender.title}.

## Technical Proposal
[Technical details would be generated here based on tender requirements]

## Company Profile
${user.companyName} is a registered company specializing in ${user.categories.join(", ")}.

## Past Experience
[Relevant past experience would be listed here]

## Financial Proposal
Budget: ₦${tender.budget.toLocaleString()}
    `.trim();

    await ctx.db.patch(args.id, {
      status: "generated",
      sections,
      content,
      updatedAt: Date.now(),
    });

    return await ctx.db.get(args.id);
  },
});

// Update proposal (with ownership check)
export const updateMine = mutation({
  args: {
    id: v.id("proposals"),
    content: v.optional(v.string()),
    sections: v.optional(v.array(v.string())),
    status: v.optional(v.union(v.literal("draft"), v.literal("generated"), v.literal("submitted"))),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const proposal = await ctx.db.get(args.id);
    
    if (!proposal) throw new Error("Proposal not found");
    if (proposal.userId !== user._id) throw new Error("Not authorized");
    
    const { id, ...updates } = args;
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );
    await ctx.db.patch(id, { ...filtered, updatedAt: Date.now() });
    return await ctx.db.get(id);
  },
});

// Update proposal (legacy)
export const update = mutation({
  args: {
    id: v.id("proposals"),
    content: v.optional(v.string()),
    sections: v.optional(v.array(v.string())),
    status: v.optional(v.union(v.literal("draft"), v.literal("generated"), v.literal("submitted"))),
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

// Submit proposal (with ownership check)
export const submit = mutation({
  args: { id: v.id("proposals") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const proposal = await ctx.db.get(args.id);
    
    if (!proposal) throw new Error("Proposal not found");
    if (proposal.userId !== user._id) throw new Error("Not authorized");
    
    await ctx.db.patch(args.id, {
      status: "submitted",
      updatedAt: Date.now(),
    });
    return await ctx.db.get(args.id);
  },
});

// Delete proposal (with ownership check)
export const removeMine = mutation({
  args: { id: v.id("proposals") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const proposal = await ctx.db.get(args.id);
    
    if (!proposal) throw new Error("Proposal not found");
    if (proposal.userId !== user._id) throw new Error("Not authorized");
    
    // Delete all proposal images from storage
    const images = await ctx.db
      .query("proposalImages")
      .withIndex("by_proposal", (q) => q.eq("proposalId", args.id))
      .collect();
    
    for (const img of images) {
      await ctx.storage.delete(img.storageId);
      await ctx.db.delete(img._id);
    }
    
    // Delete PDF from storage if exists
    if (proposal.storageId) {
      await ctx.storage.delete(proposal.storageId);
    }
    
    await ctx.db.delete(args.id);
  },
});

// Delete proposal (legacy)
export const remove = mutation({
  args: { id: v.id("proposals") },
  handler: async (ctx, args) => {
    const proposal = await ctx.db.get(args.id);
    
    // Delete PDF from storage if exists
    if (proposal?.storageId) {
      await ctx.storage.delete(proposal.storageId);
    }
    
    await ctx.db.delete(args.id);
  },
});

// Update pipeline progress
export const updateProgress = mutation({
  args: {
    id: v.id("proposals"),
    progress: v.object({
      stage: v.string(),
      progress: v.number(),
      message: v.string(),
      structure: v.optional(v.any()),
      research: v.optional(v.any()),
      sections: v.optional(v.any()),
      error: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      pipelineProgress: args.progress,
      updatedAt: Date.now(),
    });
  },
});

// Get pipeline progress
export const getProgress = query({
  args: { id: v.id("proposals") },
  handler: async (ctx, args) => {
    const proposal = await ctx.db.get(args.id);
    return proposal?.pipelineProgress || null;
  },
});
