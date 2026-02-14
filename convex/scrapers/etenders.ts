"use node";

import { action } from "../_generated/server";
import { api, internal } from "../_generated/api";

const SOURCE_ID = "etenders.com.ng";
const RSS_URL = "https://etenders.com.ng/feed/";

// Parse date from RSS format
function parseRssDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split("T")[0];
    }
    return new Date().toISOString().split("T")[0];
  } catch {
    return new Date().toISOString().split("T")[0];
  }
}

// Extract deadline from categories (format: "26/02/2026" or "27/02/2026")
function extractDeadline(categories: string[]): string {
  for (const cat of categories) {
    const match = cat.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (match) {
      const [, day, month, year] = match;
      return `${year}-${month}-${day}`;
    }
  }
  // Default: 30 days from now
  const future = new Date();
  future.setDate(future.getDate() + 30);
  return future.toISOString().split("T")[0];
}

// Extract organization from title (before the hyphen/dash)
function extractOrganization(title: string): string {
  // Common patterns: "ORG NAME - INVITATION TO..." or "ORG NAME-INVITATION..."
  const parts = title.split(/[-–—]/);
  const org = parts[0]?.trim();
  if (org && org.length > 3 && org.length < 150) {
    return org;
  }
  return "Nigerian Organization";
}

// Normalize category name
function normalizeCategory(cat: string): string {
  // Skip date categories
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(cat)) return "";
  if (cat === "N/A") return "";
  
  const lower = cat.toLowerCase().trim();
  const mapping: Record<string, string> = {
    "construction & engineering": "Construction",
    "building construction": "Construction",
    "rehabilitation/renovation": "Construction",
    "borehole & dredging works": "Construction",
    "ict and software": "ICT",
    "computer hardware": "ICT",
    "solar and renewable": "Solar & Renewable",
    "supply of vehicles": "Supplies",
    "office equipment & supplies": "Supplies",
    "general supplies and services": "Supplies",
    "medical, health & laboratory": "Healthcare",
    "medical supply": "Healthcare",
    "medical outreach": "Healthcare",
    "consultancy": "Consultancy",
    "professional services": "Services",
  };
  
  return mapping[lower] || cat.trim();
}

// Parse RSS feed
function parseRssFeed(xml: string): Array<{
  title: string;
  organization: string;
  sourceUrl: string;
  sourceId: string;
  deadline: string;
  publishedAt: string;
  categories: string[];
  description: string;
}> {
  const items: Array<{
    title: string;
    organization: string;
    sourceUrl: string;
    sourceId: string;
    deadline: string;
    publishedAt: string;
    categories: string[];
    description: string;
  }> = [];

  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const itemXml = match[1];
    
    const titleMatch = itemXml.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/);
    const linkMatch = itemXml.match(/<link>([\s\S]*?)<\/link>/);
    const pubDateMatch = itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
    const guidMatch = itemXml.match(/<guid[^>]*>([\s\S]*?)<\/guid>/);
    
    // Extract categories
    const categoryRegex = /<category>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/category>/g;
    const categories: string[] = [];
    let catMatch;
    while ((catMatch = categoryRegex.exec(itemXml)) !== null) {
      categories.push(catMatch[1].trim());
    }
    
    if (!titleMatch || !linkMatch) continue;
    
    const title = titleMatch[1]
      .trim()
      .replace(/&amp;/g, "&")
      .replace(/&#038;/g, "&")
      .replace(/&#8211;/g, "-")
      .replace(/&#8217;/g, "'");
    
    const link = linkMatch[1].trim();
    
    // Extract sourceId from guid or URL
    let sourceId = "";
    if (guidMatch) {
      const pMatch = guidMatch[1].match(/\?p=(\d+)/);
      if (pMatch) {
        sourceId = `post-${pMatch[1]}`;
      }
    }
    if (!sourceId) {
      const urlParts = link.split("/").filter(Boolean);
      sourceId = urlParts[urlParts.length - 1] || `hash-${Date.now()}`;
    }
    
    // Get normalized categories (excluding dates and N/A)
    const normalizedCats = categories
      .map(normalizeCategory)
      .filter(c => c.length > 0);
    
    items.push({
      title,
      organization: extractOrganization(title),
      sourceUrl: link,
      sourceId,
      deadline: extractDeadline(categories),
      publishedAt: pubDateMatch ? parseRssDate(pubDateMatch[1]) : new Date().toISOString().split("T")[0],
      categories: [...new Set(normalizedCats)].slice(0, 3),
      description: `Tender opportunity from ${extractOrganization(title)}. Categories: ${normalizedCats.join(", ") || "General"}`,
    });
  }

  return items;
}

// Main scraper action
export const scrapeListing = action({
  args: {},
  handler: async (ctx): Promise<{ scraped: number; added: number; skipped: number }> => {
    await ctx.runMutation(internal.scraperLogs.log, {
      source: SOURCE_ID,
      action: "start",
      message: "Starting RSS feed fetch",
    });

    try {
      await ctx.runMutation(internal.scraperLogs.log, {
        source: SOURCE_ID,
        action: "fetch",
        message: `Fetching ${RSS_URL}`,
        metadata: { url: RSS_URL },
      });

      const response = await fetch(RSS_URL, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept": "application/rss+xml, application/xml, text/xml, */*",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const xml = await response.text();
      
      await ctx.runMutation(internal.scraperLogs.log, {
        source: SOURCE_ID,
        action: "parse",
        message: `Received ${xml.length} bytes, parsing RSS...`,
      });

      const listings = parseRssFeed(xml);
      
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
          category: listing.categories[0] || "General",
          categories: listing.categories.length > 0 ? listing.categories : ["General"],
          description: listing.description,
          location: "Nigeria",
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
