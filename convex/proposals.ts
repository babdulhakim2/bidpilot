import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Get all proposals for a user
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

// Create a new proposal (draft)
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

// Generate proposal content (simulated AI generation)
export const generate = mutation({
  args: { id: v.id("proposals") },
  handler: async (ctx, args) => {
    const proposal = await ctx.db.get(args.id);
    if (!proposal) throw new Error("Proposal not found");

    // Get tender details
    const tender = await ctx.db.get(proposal.tenderId);
    if (!tender) throw new Error("Tender not found");

    // Get user details
    const user = await ctx.db.get(proposal.userId);
    if (!user) throw new Error("User not found");

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

// Update proposal
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

// Submit proposal
export const submit = mutation({
  args: { id: v.id("proposals") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: "submitted",
      updatedAt: Date.now(),
    });
    return await ctx.db.get(args.id);
  },
});

// Delete proposal
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
