"use node";

import { action } from "../_generated/server";
import { api, internal } from "../_generated/api";

const SOURCE_ID = "tendersnigeria.com";
const RSS_URL = "https://feeds.feedburner.com/multonion/tenders";

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

// Extract deadline from content (look for date patterns)
function extractDeadline(content: string): string {
  // Look for deadline mentions
  const patterns = [
    /deadline[:\s]*(\d{1,2}[\/-]\d{1,2}[\/-]\d{4})/i,
    /closing[:\s]*(\d{1,2}[\/-]\d{1,2}[\/-]\d{4})/i,
    /submission[:\s]*(\d{1,2}[\/-]\d{1,2}[\/-]\d{4})/i,
    /(\d{1,2}[\/-]\d{1,2}[\/-]\d{4})/,
  ];
  
  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match) {
      const parts = match[1].split(/[\/-]/);
      if (parts.length === 3) {
        const [a, b, c] = parts;
        // Assume DD/MM/YYYY or MM/DD/YYYY
        const year = c.length === 4 ? c : `20${c}`;
        return `${year}-${b.padStart(2, "0")}-${a.padStart(2, "0")}`;
      }
    }
  }
  
  // Default: 30 days from now
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().split("T")[0];
}

// Extract organization from title
function extractOrg(title: string): string {
  const parts = title.split(/[-–—:|]/);
  const org = parts[0]?.trim();
  if (org && org.length > 3 && org.length < 150) {
    return org;
  }
  return "Nigerian Organization";
}

// Normalize category from title/content
function detectCategory(text: string): string {
  const lower = text.toLowerCase();
  
  if (lower.includes("construct") || lower.includes("building") || lower.includes("road") || lower.includes("bridge")) {
    return "Construction";
  }
  if (lower.includes("ict") || lower.includes("software") || lower.includes("computer") || lower.includes("technology") || lower.includes("digital")) {
    return "ICT";
  }
  if (lower.includes("consult")) {
    return "Consultancy";
  }
  if (lower.includes("supply") || lower.includes("procurement") || lower.includes("goods") || lower.includes("equipment")) {
    return "Supplies";
  }
  if (lower.includes("health") || lower.includes("medical") || lower.includes("hospital") || lower.includes("pharma")) {
    return "Healthcare";
  }
  if (lower.includes("oil") || lower.includes("gas") || lower.includes("petroleum")) {
    return "Oil & Gas";
  }
  if (lower.includes("solar") || lower.includes("renewable") || lower.includes("energy")) {
    return "Energy";
  }
  if (lower.includes("service")) {
    return "Services";
  }
  
  return "General";
}

// Parse RSS feed
function parseRssFeed(xml: string): Array<{
  title: string;
  sourceId: string;
  sourceUrl: string;
  organization: string;
  deadline: string;
  category: string;
  publishedAt: string;
  description: string;
}> {
  const items: Array<{
    title: string;
    sourceId: string;
    sourceUrl: string;
    organization: string;
    deadline: string;
    category: string;
    publishedAt: string;
    description: string;
  }> = [];

  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const itemXml = match[1];
    
    const titleMatch = itemXml.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/);
    const linkMatch = itemXml.match(/<link>([\s\S]*?)<\/link>/) || itemXml.match(/<feedburner:origLink>([\s\S]*?)<\/feedburner:origLink>/);
    const pubDateMatch = itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
    const descMatch = itemXml.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/);
    const guidMatch = itemXml.match(/<guid[^>]*>([\s\S]*?)<\/guid>/);
    
    if (!titleMatch || !linkMatch) continue;
    
    const title = titleMatch[1].trim().replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
    const link = linkMatch[1].trim().replace(/&amp;/g, "&");
    
    // Extract sourceId
    let sourceId = "";
    if (guidMatch) {
      sourceId = guidMatch[1].split("/").pop() || "";
    }
    if (!sourceId) {
      sourceId = link.split("/").filter(Boolean).pop() || `hash-${title.slice(0, 20)}`;
    }
    
    // Clean description
    let description = descMatch ? descMatch[1] : "";
    description = description
      .replace(/<[^>]+>/g, " ")
      .replace(/&[^;]+;/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 500);
    
    const fullText = `${title} ${description}`;
    
    items.push({
      title,
      sourceId,
      sourceUrl: link,
      organization: extractOrg(title),
      deadline: extractDeadline(fullText),
      category: detectCategory(fullText),
      publishedAt: pubDateMatch ? parseRssDate(pubDateMatch[1]) : new Date().toISOString().split("T")[0],
      description: description || `Tender opportunity. View details at source.`,
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
        message: `Fetching RSS feed`,
        metadata: { url: RSS_URL },
      });

      const response = await fetch(RSS_URL, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; BidPilot/1.0)",
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
          category: listing.category,
          categories: [listing.category],
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
