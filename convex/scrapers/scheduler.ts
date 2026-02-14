"use node";

import { internalAction, action } from "../_generated/server";
import { api, internal } from "../_generated/api";

// List of all scraper sources
const SCRAPERS = [
  { id: "publicprocurement.ng", action: api.scrapers.publicprocurement.scrapeListing, enabled: true },
  { id: "etenders.com.ng", action: api.scrapers.etenders.scrapeListing, enabled: false }, // Disabled - paywall
  { id: "nocopo.gov.ng", action: api.scrapers.nocopo.scrapeListing, enabled: true },
  { id: "tendersnigeria.com", action: api.scrapers.tendersnigeria.scrapeListing, enabled: true },
];

// Run all enabled scrapers
export const runAllScrapers = internalAction({
  args: {},
  handler: async (ctx): Promise<void> => {
    console.log("[Scraper] Starting scrape run...");
    
    await ctx.runMutation(internal.scraperLogs.log, {
      source: "scheduler",
      action: "start",
      message: `Starting scrape run for ${SCRAPERS.filter(s => s.enabled).length} sources`,
    });

    const results: Array<{ source: string; added: number; skipped: number; error?: string }> = [];

    for (const scraper of SCRAPERS) {
      if (!scraper.enabled) continue;

      try {
        const result = await ctx.runAction(scraper.action, {});
        console.log(`[Scraper] ${scraper.id}: ${result.added} added, ${result.skipped} skipped`);
        results.push({ source: scraper.id, added: result.added, skipped: result.skipped });
      } catch (error: any) {
        console.error(`[Scraper] ${scraper.id} error:`, error.message);
        results.push({ source: scraper.id, added: 0, skipped: 0, error: error.message });
      }
    }

    const totalAdded = results.reduce((sum, r) => sum + r.added, 0);
    const totalSkipped = results.reduce((sum, r) => sum + r.skipped, 0);
    const errors = results.filter(r => r.error).length;

    await ctx.runMutation(internal.scraperLogs.log, {
      source: "scheduler",
      action: "complete",
      message: `Scrape run complete: ${totalAdded} added, ${totalSkipped} skipped, ${errors} errors`,
      metadata: { added: totalAdded, skipped: totalSkipped, count: results.length },
    });

    console.log("[Scraper] Scrape run complete");
  },
});

// Manual trigger for a specific scraper
export const runScraper = action({
  args: {},
  handler: async (ctx) => {
    // Run all scrapers manually
    const results: Array<{ source: string; added: number; skipped: number; error?: string }> = [];

    for (const scraper of SCRAPERS) {
      if (!scraper.enabled) continue;

      try {
        const result = await ctx.runAction(scraper.action, {});
        results.push({ source: scraper.id, added: result.added, skipped: result.skipped });
      } catch (error: any) {
        results.push({ source: scraper.id, added: 0, skipped: 0, error: error.message });
      }
    }

    return results;
  },
});

// Get list of available scrapers
export const getSources = action({
  args: {},
  handler: async () => {
    return SCRAPERS.map(s => ({ id: s.id, enabled: s.enabled }));
  },
});
