"use node";

import { action } from "../_generated/server";
import { api, internal } from "../_generated/api";

const SOURCE_ID = "nocopo.gov.ng";
const DATA_URL = "https://data.open-contracting.org/api/v1/publication/64/releases?limit=100&offset=0";

// Parse OCDS release to our tender format
function parseRelease(release: any): {
  title: string;
  sourceId: string;
  sourceUrl: string;
  organization: string;
  deadline: string;
  category: string;
  location: string;
  publishedAt: string;
  budget: number;
  description: string;
} | null {
  try {
    const tender = release.tender;
    if (!tender) return null;

    const title = tender.title || release.planning?.budget?.description || "Untitled Tender";
    const ocid = release.ocid || `nocopo-${Date.now()}`;
    
    // Extract organization from buyer
    const buyer = release.buyer || release.parties?.find((p: any) => p.roles?.includes("buyer"));
    const organization = buyer?.name || "Nigerian Government";
    
    // Get deadline from tender period
    const deadline = tender.tenderPeriod?.endDate 
      ? tender.tenderPeriod.endDate.split("T")[0]
      : getFutureDate(30);
    
    // Get published date
    const publishedAt = release.date 
      ? release.date.split("T")[0] 
      : new Date().toISOString().split("T")[0];
    
    // Get budget
    const budget = tender.value?.amount || release.planning?.budget?.amount?.amount || 0;
    
    // Get category from items or procurement method
    let category = "General";
    if (tender.items?.length > 0) {
      const itemCat = tender.items[0].classification?.description;
      if (itemCat) category = normalizeCategory(itemCat);
    } else if (tender.procurementMethodDetails) {
      category = normalizeCategory(tender.procurementMethodDetails);
    }
    
    // Description
    const description = tender.description || 
      `${tender.procurementMethod || "Open"} procurement by ${organization}. ${tender.items?.length || 0} items.`;
    
    return {
      title: title.slice(0, 200),
      sourceId: ocid,
      sourceUrl: `https://data.open-contracting.org/en/publication/64/release/${encodeURIComponent(ocid)}`,
      organization,
      deadline,
      category,
      location: extractLocation(release) || "Nigeria",
      publishedAt,
      budget,
      description: description.slice(0, 500),
    };
  } catch (e) {
    console.error("Failed to parse release:", e);
    return null;
  }
}

function extractLocation(release: any): string {
  // Try to get location from parties or delivery address
  const buyer = release.parties?.find((p: any) => p.roles?.includes("buyer"));
  if (buyer?.address?.region) return buyer.address.region;
  if (buyer?.address?.locality) return buyer.address.locality;
  
  const delivery = release.tender?.items?.[0]?.deliveryLocation;
  if (delivery?.description) return delivery.description;
  
  return "Nigeria";
}

function normalizeCategory(cat: string): string {
  const lower = cat.toLowerCase();
  
  if (lower.includes("construct") || lower.includes("building") || lower.includes("civil")) {
    return "Construction";
  }
  if (lower.includes("ict") || lower.includes("computer") || lower.includes("software") || lower.includes("technology")) {
    return "ICT";
  }
  if (lower.includes("consult")) {
    return "Consultancy";
  }
  if (lower.includes("health") || lower.includes("medical") || lower.includes("pharma")) {
    return "Healthcare";
  }
  if (lower.includes("supply") || lower.includes("goods") || lower.includes("equipment")) {
    return "Supplies";
  }
  if (lower.includes("service")) {
    return "Services";
  }
  
  return cat.slice(0, 50);
}

function getFutureDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

// Main scraper action
export const scrapeListing = action({
  args: {},
  handler: async (ctx): Promise<{ scraped: number; added: number; skipped: number }> => {
    await ctx.runMutation(internal.scraperLogs.log, {
      source: SOURCE_ID,
      action: "start",
      message: "Starting NOCOPO data fetch",
    });

    try {
      // Fetch from OCDS API
      await ctx.runMutation(internal.scraperLogs.log, {
        source: SOURCE_ID,
        action: "fetch",
        message: `Fetching from Open Contracting API`,
        metadata: { url: DATA_URL },
      });

      const response = await fetch(DATA_URL, {
        headers: {
          "Accept": "application/json",
          "User-Agent": "BidPilot/1.0",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const releases = data.releases || data.results || [];
      
      await ctx.runMutation(internal.scraperLogs.log, {
        source: SOURCE_ID,
        action: "parse",
        message: `Received ${releases.length} OCDS releases`,
        metadata: { count: releases.length },
      });

      let added = 0;
      let skipped = 0;

      for (const release of releases) {
        const parsed = parseRelease(release);
        if (!parsed) {
          skipped++;
          continue;
        }

        // Check for duplicate
        const exists = await ctx.runQuery(api.tenders.getBySourceId, {
          source: SOURCE_ID,
          sourceId: parsed.sourceId,
        });

        if (exists) {
          skipped++;
          continue;
        }

        // Insert
        await ctx.runMutation(api.tenders.createFromScraper, {
          title: parsed.title,
          organization: parsed.organization,
          budget: parsed.budget,
          deadline: parsed.deadline,
          category: parsed.category,
          categories: [parsed.category],
          description: parsed.description,
          location: parsed.location,
          requirements: [],
          missing: [],
          source: SOURCE_ID,
          sourceId: parsed.sourceId,
          sourceUrl: parsed.sourceUrl,
          publishedAt: parsed.publishedAt,
          status: "partial",
        });

        await ctx.runMutation(internal.scraperLogs.log, {
          source: SOURCE_ID,
          action: "insert",
          message: `Added: ${parsed.title.slice(0, 80)}...`,
          metadata: { tenderId: parsed.sourceId, tenderTitle: parsed.title },
        });

        added++;
      }

      await ctx.runMutation(internal.scraperLogs.log, {
        source: SOURCE_ID,
        action: "complete",
        message: `Fetch complete: ${added} added, ${skipped} skipped`,
        metadata: { added, skipped, count: releases.length },
      });

      return { scraped: releases.length, added, skipped };
    } catch (error: any) {
      await ctx.runMutation(internal.scraperLogs.log, {
        source: SOURCE_ID,
        action: "error",
        message: `Fetch failed: ${error.message}`,
        metadata: { error: error.message },
      });
      throw error;
    }
  },
});
