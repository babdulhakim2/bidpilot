"use node";

import { internalAction } from "../_generated/server";
import { api } from "../_generated/api";

// Run all enabled scrapers
export const runAllScrapers = internalAction({
  args: {},
  handler: async (ctx): Promise<void> => {
    console.log("[Scraper] Starting scrape run...");
    
    try {
      // Run publicprocurement.ng scraper
      const result = await ctx.runAction(api.scrapers.publicprocurement.scrapeListing, {});
      console.log(`[Scraper] publicprocurement.ng: ${result.added} added, ${result.skipped} skipped`);
    } catch (error) {
      console.error("[Scraper] Error:", error);
    }
    
    console.log("[Scraper] Scrape run complete");
  },
});
