import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Users table - company profiles
  users: defineTable({
    clerkId: v.string(),
    companyName: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    categories: v.array(v.string()),
    completeness: v.number(),
    googleConnected: v.optional(v.boolean()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_clerk_id", ["clerkId"]),

  // Tenders table - available opportunities
  tenders: defineTable({
    title: v.string(),
    organization: v.string(),
    budget: v.number(),
    deadline: v.string(),
    category: v.string(),
    matchScore: v.optional(v.number()),
    status: v.union(v.literal("qualified"), v.literal("partial"), v.literal("low")),
    requirements: v.array(v.string()),
    missing: v.array(v.string()),
    description: v.string(),
    location: v.string(),
    source: v.string(),
    publishedAt: v.string(),
  })
    .index("by_category", ["category"])
    .index("by_deadline", ["deadline"])
    .index("by_status", ["status"]),

  // User-specific tender data (saved status, match scores per user)
  userTenders: defineTable({
    userId: v.id("users"),
    tenderId: v.id("tenders"),
    saved: v.boolean(),
    matchScore: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_tender", ["tenderId"])
    .index("by_user_tender", ["userId", "tenderId"]),

  // Documents table - uploaded files
  documents: defineTable({
    userId: v.id("users"),
    name: v.string(),
    type: v.string(), // pdf, zip, doc, etc.
    status: v.union(v.literal("verified"), v.literal("processing"), v.literal("rejected")),
    category: v.string(), // Registration, Tax, Profile, Experience, etc.
    size: v.string(),
    storageId: v.optional(v.id("_storage")), // Convex storage reference
    uploadedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_category", ["category"])
    .index("by_status", ["status"]),

  // Proposals table - generated bid proposals
  proposals: defineTable({
    userId: v.id("users"),
    tenderId: v.id("tenders"),
    tenderTitle: v.string(),
    status: v.union(v.literal("draft"), v.literal("generated"), v.literal("submitted")),
    sections: v.array(v.string()),
    content: v.optional(v.string()), // Generated proposal content
    storageId: v.optional(v.id("_storage")), // PDF storage reference
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_tender", ["tenderId"])
    .index("by_status", ["status"]),
});
