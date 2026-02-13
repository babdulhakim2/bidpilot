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
    // Core fields
    title: v.string(),
    organization: v.string(),
    budget: v.number(),
    deadline: v.string(),
    category: v.string(),
    categories: v.optional(v.array(v.string())), // Multiple categories
    description: v.string(),
    location: v.string(),
    requirements: v.array(v.string()),
    missing: v.array(v.string()),
    
    // Matching
    matchScore: v.optional(v.number()),
    status: v.union(v.literal("qualified"), v.literal("partial"), v.literal("low")),
    
    // Source tracking (for deduplication)
    source: v.string(),           // e.g., "publicprocurement.ng"
    sourceId: v.optional(v.string()),  // Unique ID from source for dedup
    sourceUrl: v.optional(v.string()), // Original URL
    
    // Timestamps
    publishedAt: v.string(),
    scrapedAt: v.optional(v.number()), // When we scraped it
  })
    .index("by_category", ["category"])
    .index("by_deadline", ["deadline"])
    .index("by_status", ["status"])
    .index("by_source_id", ["source", "sourceId"])
    .index("by_scraped_at", ["scrapedAt"]),

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
    status: v.union(v.literal("verified"), v.literal("processing"), v.literal("rejected"), v.literal("extracting")),
    category: v.string(), // Registration, Tax, Profile, Experience, etc.
    size: v.string(),
    storageId: v.optional(v.id("_storage")), // Convex storage reference
    uploadedAt: v.number(),
    // LLM extracted content
    extractedContent: v.optional(v.string()), // Markdown content
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

  // Subscriptions - tracks active plans
  subscriptions: defineTable({
    userId: v.id("users"),
    plan: v.union(v.literal("starter"), v.literal("pro"), v.literal("enterprise")),
    status: v.union(v.literal("active"), v.literal("cancelled"), v.literal("expired"), v.literal("past_due")),
    
    // Paystack fields
    paystackCustomerId: v.optional(v.string()),
    paystackSubscriptionCode: v.optional(v.string()),
    paystackPlanCode: v.optional(v.string()),
    paystackAuthorizationCode: v.optional(v.string()),
    
    // Billing
    amountNaira: v.number(), // Amount in Naira
    billingCycle: v.union(v.literal("monthly"), v.literal("yearly")),
    
    // Dates
    currentPeriodStart: v.number(),
    currentPeriodEnd: v.number(),
    cancelledAt: v.optional(v.number()),
    
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_status", ["status"])
    .index("by_paystack_subscription", ["paystackSubscriptionCode"]),

  // Usage tracking - alerts and proposals used this period
  usage: defineTable({
    userId: v.id("users"),
    subscriptionId: v.optional(v.id("subscriptions")),
    
    // Period
    periodStart: v.number(),
    periodEnd: v.number(),
    
    // Limits based on plan
    alertsLimit: v.number(),
    proposalsLimit: v.number(),
    
    // Usage counts
    alertsUsed: v.number(),
    proposalsUsed: v.number(),
    
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_period", ["userId", "periodStart"]),

  // Transactions - payment history
  transactions: defineTable({
    userId: v.id("users"),
    subscriptionId: v.optional(v.id("subscriptions")),
    
    // Transaction details
    type: v.union(v.literal("subscription"), v.literal("one_time"), v.literal("refund")),
    status: v.union(v.literal("pending"), v.literal("success"), v.literal("failed"), v.literal("refunded")),
    
    // Amounts
    amountNaira: v.number(),
    currency: v.string(), // NGN
    
    // Paystack fields
    paystackReference: v.string(),
    paystackTransactionId: v.optional(v.number()),
    paystackChannel: v.optional(v.string()), // card, bank, ussd, etc.
    
    // Card details (masked)
    cardLast4: v.optional(v.string()),
    cardBrand: v.optional(v.string()),
    
    // Description
    description: v.string(),
    
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_subscription", ["subscriptionId"])
    .index("by_reference", ["paystackReference"])
    .index("by_status", ["status"]),

  // Credits - for one-time purchases or bonuses
  credits: defineTable({
    userId: v.id("users"),
    
    // Credit balances
    alertCredits: v.number(),
    proposalCredits: v.number(),
    
    // Track where credits came from
    source: v.union(v.literal("purchase"), v.literal("bonus"), v.literal("referral"), v.literal("promo")),
    transactionId: v.optional(v.id("transactions")),
    
    // Expiry (optional)
    expiresAt: v.optional(v.number()),
    
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_expiry", ["expiresAt"]),
});
