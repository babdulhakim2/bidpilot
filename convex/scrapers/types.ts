// Scraper types - source-agnostic

export interface ScrapedTender {
  sourceId: string;        // Unique ID from source (e.g., URL slug)
  source: string;          // Source identifier (e.g., "publicprocurement.ng")
  title: string;
  organization: string;
  description: string;
  deadline: string;        // ISO date string
  publishedAt: string;     // ISO date string
  categories: string[];
  location: string;
  budget?: number;
  requirements?: string[];
  sourceUrl: string;
  rawHtml?: string;        // For debugging
  scrapedAt: string;       // ISO date string
}

export interface ScraperSource {
  id: string;
  name: string;
  baseUrl: string;
  enabled: boolean;
}
