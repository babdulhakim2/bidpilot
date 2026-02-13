"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";
import { api } from "../_generated/api";

const RSS_URL = "https://www.publicprocurement.ng/feed/";
const SOURCE_ID = "publicprocurement.ng";

// Parse date from RSS format to ISO string
function parseRssDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toISOString().split("T")[0];
  } catch {
    return new Date().toISOString().split("T")[0];
  }
}

// Extract deadline from categories (format: "10/03/2026")
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

// Extract organization from title (before the hyphen)
function extractOrganization(title: string): string {
  const parts = title.split(/[-–—]/);
  return parts[0]?.trim() || title;
}

// Normalize category name
function normalizeCategory(cat: string): string {
  // Skip date categories
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(cat)) return "";
  
  const mapping: Record<string, string> = {
    "construction": "Construction",
    "construction and engineering": "Construction",
    "ict & software": "ICT",
    "ict software": "ICT",
    "computer hardware": "ICT",
    "consultancy": "Consultancy",
    "furniture and furnishing": "Supplies",
    "office equipment & supplies": "Supplies",
    "office equipment supplies": "Supplies",
    "general supplies and services": "Supplies",
    "solar and renewable": "Solar & Renewable",
    "rehabilitation/renovations": "Construction",
    "rehabilitation renovations": "Construction",
    "conference hall": "Services",
  };
  
  const lower = cat.toLowerCase().trim();
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

  // Extract items from RSS
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const itemXml = match[1];
    
    // Extract fields
    const titleMatch = itemXml.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/);
    const linkMatch = itemXml.match(/<link>([\s\S]*?)<\/link>/);
    const pubDateMatch = itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
    const descMatch = itemXml.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/);
    const guidMatch = itemXml.match(/<guid[^>]*>([\s\S]*?)<\/guid>/);
    
    // Extract categories
    const categoryRegex = /<category>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/category>/g;
    const categories: string[] = [];
    let catMatch;
    while ((catMatch = categoryRegex.exec(itemXml)) !== null) {
      categories.push(catMatch[1].trim());
    }
    
    if (!titleMatch || !linkMatch) continue;
    
    const title = titleMatch[1].trim();
    const link = linkMatch[1].replace(/&amp;/g, "&").split("?")[0]; // Clean URL
    
    // Extract sourceId from URL or guid
    let sourceId = "";
    if (guidMatch) {
      const guidUrl = guidMatch[1];
      const pMatch = guidUrl.match(/\?p=(\d+)/);
      if (pMatch) {
        sourceId = `post-${pMatch[1]}`;
      }
    }
    if (!sourceId) {
      const urlParts = link.split("/").filter(Boolean);
      sourceId = urlParts[urlParts.length - 1] || `hash-${title.slice(0, 20)}`;
    }
    
    // Clean description (remove HTML)
    let description = descMatch ? descMatch[1] : "";
    description = description
      .replace(/<[^>]+>/g, " ")
      .replace(/&[^;]+;/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 500);
    
    // Get normalized categories (excluding dates)
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
      description,
    });
  }

  return items;
}

// Fetch with retry
async function fetchWithRetry(url: string, maxRetries = 3): Promise<string> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept": "application/rss+xml, application/xml, text/xml, */*",
          "Accept-Language": "en-US,en;q=0.9",
        },
      });

      if (response.ok) {
        return await response.text();
      }
      
      if (response.status === 503 || response.status === 429) {
        console.log(`[Scraper] Got ${response.status}, retry ${i + 1}/${maxRetries}...`);
        await new Promise(r => setTimeout(r, 2000 * (i + 1)));
        continue;
      }
      
      throw new Error(`HTTP ${response.status}`);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      console.log(`[Scraper] Fetch error, retry ${i + 1}...`);
      await new Promise(r => setTimeout(r, 2000 * (i + 1)));
    }
  }
  throw new Error("Max retries exceeded");
}

// Scrape the RSS feed
export const scrapeListing = action({
  args: {},
  handler: async (ctx): Promise<{ scraped: number; added: number; skipped: number }> => {
    console.log("[Scraper] Fetching RSS feed...");
    
    const xml = await fetchWithRetry(RSS_URL);
    console.log(`[Scraper] Got ${xml.length} bytes`);
    
    const listings = parseRssFeed(xml);
    console.log(`[Scraper] Parsed ${listings.length} items`);

    let added = 0;
    let skipped = 0;

    for (const listing of listings) {
      // Check if already exists
      const exists = await ctx.runQuery(api.tenders.getBySourceId, {
        source: SOURCE_ID,
        sourceId: listing.sourceId,
      });

      if (exists) {
        skipped++;
        continue;
      }

      // Insert new tender
      await ctx.runMutation(api.tenders.createFromScraper, {
        title: listing.title,
        organization: listing.organization,
        budget: 0, // Unknown from RSS
        deadline: listing.deadline,
        category: listing.categories[0] || "General",
        categories: listing.categories,
        description: listing.description || `Tender from ${listing.organization}. View full details at source.`,
        location: "Nigeria",
        requirements: [],
        missing: [],
        source: SOURCE_ID,
        sourceId: listing.sourceId,
        sourceUrl: listing.sourceUrl,
        publishedAt: listing.publishedAt,
        status: "partial",
      });

      added++;
    }

    console.log(`[Scraper] Done: ${added} added, ${skipped} skipped`);
    return { scraped: listings.length, added, skipped };
  },
});

// Manual trigger for testing
export const triggerScrape = action({
  args: {},
  handler: async (ctx) => {
    return await ctx.runAction(api.scrapers.publicprocurement.scrapeListing, {});
  },
});
