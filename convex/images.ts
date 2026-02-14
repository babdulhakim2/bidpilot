"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";

// Store an image from base64 data
export const storeFromBase64 = action({
  args: {
    base64Data: v.string(),
    mimeType: v.string(),
  },
  handler: async (ctx, args) => {
    // Remove data URL prefix if present
    let base64 = args.base64Data;
    if (base64.includes(',')) {
      base64 = base64.split(',')[1];
    }
    
    // Convert base64 to buffer
    const buffer = Buffer.from(base64, 'base64');
    const blob = new Blob([buffer], { type: args.mimeType });
    
    // Store in Convex storage
    const storageId = await ctx.storage.store(blob);
    
    // Get the URL
    const url = await ctx.storage.getUrl(storageId);
    
    return { storageId, url };
  },
});
