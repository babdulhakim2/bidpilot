"use node";

import { action } from "../_generated/server";
import { api, internal } from "../_generated/api";

const BASE_URL = "https://etenders.com.ng";
const SOURCE_ID = "etenders.com.ng";

// Parse date from various formats
function parseDate(dateStr: string): string {
  try {
    // Handle formats like "Feb 13, 2026" or "13/02/2026" or "2026-02-13"
    const cleaned = dateStr.trim();
    
    // Try direct parse
    let date = new Date(cleaned);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split("T")[0];
    }
    
    // Try DD/MM/YYYY
    const ddmmyyyy = cleaned.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (ddmmyyyy) {
      const [, day, month, year] = ddmmyyyy;
      return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    }
    
    return new Date().toISOString().split("T")[0];
  } catch {
    return new Date().toISOString().split("T")[0];
  }
}

// Extract tender listings from HTML
function parseListingPage(html: string): Array<{
  title: string;
  sourceId: string;
  sourceUrl: string;
  organization: string;
  deadline: string;
  category: string;
  location: string;
  publishedAt: string;
}> {
  const tenders: Array<{
    title: string;
    sourceId: string;
    sourceUrl: string;
    organization: string;
    deadline: string;
    category: string;
    location: string;
    publishedAt: string;
  }> = [];

  // WordPress tender listing pattern - look for article/post entries
  // Pattern varies but typically has class containing "tender" or "post"
  const articleRegex = /<article[^>]*class="[^"]*post[^"]*"[^>]*>([\s\S]*?)<\/article>/gi;
  const linkRegex = /<a[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/gi;
  const titleRegex = /<h\d[^>]*class="[^"]*entry-title[^"]*"[^>]*>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/gi;
  
  // Try to find tender entries
  let match;
  
  // Method 1: Look for entry-title links
  while ((match = titleRegex.exec(html)) !== null) {
    const url = match[1];
    const title = match[2].trim();
    
    if (!title || !url) continue;
    
    // Extract sourceId from URL
    const urlParts = url.split("/").filter(Boolean);
    const sourceId = urlParts[urlParts.length - 1] || `hash-${Date.now()}`;
    
    // Try to find associated metadata
    const deadlineMatch = html.match(new RegExp(`${sourceId}[\\s\\S]{0,500}deadline[^<]*?([\\d]{1,2}[\\/\\-][\\d]{1,2}[\\/\\-][\\d]{4})`, "i"));
    const categoryMatch = html.match(new RegExp(`${sourceId}[\\s\\S]{0,300}category[^<]*?<[^>]*>([^<]+)`, "i"));
    
    tenders.push({
      title,
      sourceId,
      sourceUrl: url.startsWith("http") ? url : `${BASE_URL}${url}`,
      organization: extractOrg(title),
      deadline: deadlineMatch ? parseDate(deadlineMatch[1]) : getFutureDate(30),
      category: categoryMatch ? normalizeCategory(categoryMatch[1]) : "General",
      location: "Nigeria",
      publishedAt: new Date().toISOString().split("T")[0],
    });
  }

  // Method 2: Fallback - look for any tender links
  if (tenders.length === 0) {
    const tenderLinkRegex = /<a[^>]*href="([^"]*tender[^"]*)"[^>]*>([^<]+)<\/a>/gi;
    while ((match = tenderLinkRegex.exec(html)) !== null) {
      const url = match[1];
      const title = match[2].trim();
      
      if (!title || title.length < 10) continue;
      
      const urlParts = url.split("/").filter(Boolean);
      const sourceId = urlParts[urlParts.length - 1] || `hash-${Date.now()}-${tenders.length}`;
      
      // Skip if already have this
      if (tenders.some(t => t.sourceId === sourceId)) continue;
      
      tenders.push({
        title,
        sourceId,
        sourceUrl: url.startsWith("http") ? url : `${BASE_URL}${url}`,
        organization: extractOrg(title),
        deadline: getFutureDate(30),
        category: "General",
        location: "Nigeria",
        publishedAt: new Date().toISOString().split("T")[0],
      });
    }
  }

  return tenders;
}

function extractOrg(title: string): string {
  const parts = title.split(/[-–—:]/);
  return parts[0]?.trim().slice(0, 100) || "Unknown Organization";
}

function normalizeCategory(cat: string): string {
  const lower = cat.toLowerCase().trim();
  const mapping: Record<string, string> = {
    "construction": "Construction",
    "ict": "ICT",
    "information technology": "ICT",
    "oil & gas": "Oil & Gas",
    "oil and gas": "Oil & Gas",
    "consultancy": "Consultancy",
    "supplies": "Supplies",
    "services": "Services",
    "healthcare": "Healthcare",
    "education": "Education",
  };
  return mapping[lower] || cat.trim().slice(0, 50);
}

function getFutureDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

// Fetch with logging
async function fetchWithLog(ctx: any, url: string): Promise<string> {
  await ctx.runMutation(internal.scraperLogs.log, {
    source: SOURCE_ID,
    action: "fetch",
    message: `Fetching ${url}`,
    metadata: { url },
  });

  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return await response.text();
}

// Main scraper action
export const scrapeListing = action({
  args: {},
  handler: async (ctx): Promise<{ scraped: number; added: number; skipped: number }> => {
    await ctx.runMutation(internal.scraperLogs.log, {
      source: SOURCE_ID,
      action: "start",
      message: "Starting scrape run",
    });

    try {
      // Fetch main listing page
      const html = await fetchWithLog(ctx, `${BASE_URL}/category/tenders/`);
      
      await ctx.runMutation(internal.scraperLogs.log, {
        source: SOURCE_ID,
        action: "parse",
        message: `Received ${html.length} bytes, parsing...`,
      });

      const listings = parseListingPage(html);
      
      await ctx.runMutation(internal.scraperLogs.log, {
        source: SOURCE_ID,
        action: "parse",
        message: `Found ${listings.length} tender listings`,
        metadata: { count: listings.length },
      });

      let added = 0;
      let skipped = 0;

      for (const listing of listings) {
        // Check for duplicate
        const exists = await ctx.runQuery(api.tenders.getBySourceId, {
          source: SOURCE_ID,
          sourceId: listing.sourceId,
        });

        if (exists) {
          skipped++;
          continue;
        }

        // Insert
        await ctx.runMutation(api.tenders.createFromScraper, {
          title: listing.title,
          organization: listing.organization,
          budget: 0,
          deadline: listing.deadline,
          category: listing.category,
          categories: [listing.category],
          description: `Tender opportunity from ${listing.organization}. View full details at source.`,
          location: listing.location,
          requirements: [],
          missing: [],
          source: SOURCE_ID,
          sourceId: listing.sourceId,
          sourceUrl: listing.sourceUrl,
          publishedAt: listing.publishedAt,
          status: "partial",
        });

        await ctx.runMutation(internal.scraperLogs.log, {
          source: SOURCE_ID,
          action: "insert",
          message: `Added: ${listing.title.slice(0, 80)}...`,
          metadata: { tenderId: listing.sourceId, tenderTitle: listing.title },
        });

        added++;
      }

      await ctx.runMutation(internal.scraperLogs.log, {
        source: SOURCE_ID,
        action: "complete",
        message: `Scrape complete: ${added} added, ${skipped} skipped`,
        metadata: { added, skipped, count: listings.length },
      });

      return { scraped: listings.length, added, skipped };
    } catch (error: any) {
      await ctx.runMutation(internal.scraperLogs.log, {
        source: SOURCE_ID,
        action: "error",
        message: `Scrape failed: ${error.message}`,
        metadata: { error: error.message },
      });
      throw error;
    }
  },
});
