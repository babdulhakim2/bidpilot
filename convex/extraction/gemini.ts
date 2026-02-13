"use node";

import { action, internalAction } from "../_generated/server";
import { v } from "convex/values";
import { api, internal } from "../_generated/api";
import { Id } from "../_generated/dataModel";

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

interface ExtractionResult {
  markdown: string;
  insights: {
    summary?: string;
    companyName?: string;
    industry?: string;
    services?: string[];
    experience?: string[];
    certifications?: string[];
    contacts?: {
      email?: string;
      phone?: string;
      address?: string;
    };
    keyFacts?: string[];
  };
}

// Extract content from document using Gemini
async function extractWithGemini(
  fileData: ArrayBuffer,
  mimeType: string,
  category: string
): Promise<ExtractionResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY not configured");
  }

  // Convert to base64
  const base64Data = Buffer.from(fileData).toString("base64");

  // Build prompt based on category
  const extractionPrompt = getExtractionPrompt(category);

  const requestBody = {
    contents: [
      {
        parts: [
          {
            inline_data: {
              mime_type: mimeType,
              data: base64Data,
            },
          },
          {
            text: extractionPrompt,
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 8192,
    },
  };

  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${error}`);
  }

  const result = await response.json();
  const text = result.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error("No content returned from Gemini");
  }

  // Parse the response
  return parseGeminiResponse(text);
}

function getExtractionPrompt(category: string): string {
  const basePrompt = `You are a document extraction assistant. Extract all content from this document and provide:

1. MARKDOWN CONTENT: Convert the entire document to clean, well-formatted markdown. Preserve structure, headings, lists, and tables.

2. INSIGHTS: Extract key information as JSON.

Respond in this exact format:
---MARKDOWN---
[Full markdown content here]
---INSIGHTS---
{
  "summary": "Brief 2-3 sentence summary",
  "companyName": "Company name if found",
  "industry": "Primary industry/sector",
  "services": ["List of services offered"],
  "experience": ["Past projects or experience"],
  "certifications": ["Certifications, registrations"],
  "contacts": {
    "email": "Email if found",
    "phone": "Phone if found", 
    "address": "Address if found"
  },
  "keyFacts": ["Other important facts"]
}
---END---`;

  const categoryPrompts: Record<string, string> = {
    Profile: `${basePrompt}

This is a COMPANY PROFILE document. Pay special attention to:
- Company overview and history
- Services and capabilities
- Key personnel and team
- Past projects and clients
- Certifications and registrations`,

    Registration: `${basePrompt}

This is a REGISTRATION document (e.g., CAC certificate). Extract:
- Company registration number
- Registration date
- Company type
- Registered address
- Directors/shareholders`,

    Tax: `${basePrompt}

This is a TAX document. Extract:
- Tax ID/TIN
- Tax clearance validity
- Amounts if shown
- Issuing authority`,

    Experience: `${basePrompt}

This is an EXPERIENCE/PAST CONTRACTS document. Extract:
- Project names and descriptions
- Contract values
- Clients/organizations
- Completion dates
- Scope of work`,

    Certificates: `${basePrompt}

This is a CERTIFICATE document. Extract:
- Certificate type and name
- Issuing organization
- Issue and expiry dates
- Certificate number`,

    Financial: `${basePrompt}

This is a FINANCIAL document. Extract:
- Financial period covered
- Key figures (revenue, assets)
- Auditor information if present`,
  };

  return categoryPrompts[category] || basePrompt;
}

function parseGeminiResponse(text: string): ExtractionResult {
  const markdownMatch = text.match(/---MARKDOWN---\s*([\s\S]*?)\s*---INSIGHTS---/);
  const insightsMatch = text.match(/---INSIGHTS---\s*([\s\S]*?)\s*---END---/);

  let markdown = "";
  let insights: ExtractionResult["insights"] = {};

  if (markdownMatch) {
    markdown = markdownMatch[1].trim();
  } else {
    // Fallback: use entire text as markdown
    markdown = text;
  }

  if (insightsMatch) {
    try {
      insights = JSON.parse(insightsMatch[1].trim());
    } catch (e) {
      console.error("Failed to parse insights JSON:", e);
    }
  }

  return { markdown, insights };
}

// Process a document through the extraction pipeline
export const processDocument = internalAction({
  args: {
    documentId: v.id("documents"),
    storageId: v.id("_storage"),
    category: v.string(),
  },
  handler: async (ctx, args) => {
    console.log(`[Extraction] Processing document ${args.documentId}`);

    try {
      // Get file from storage
      const fileUrl = await ctx.storage.getUrl(args.storageId);
      if (!fileUrl) {
        throw new Error("File not found in storage");
      }

      // Fetch file data
      const response = await fetch(fileUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.status}`);
      }

      const contentType = response.headers.get("content-type") || "application/pdf";
      const fileData = await response.arrayBuffer();

      console.log(`[Extraction] File fetched, size: ${fileData.byteLength}, type: ${contentType}`);

      // Extract with Gemini
      const result = await extractWithGemini(fileData, contentType, args.category);

      console.log(`[Extraction] Extracted ${result.markdown.length} chars, insights:`, Object.keys(result.insights));

      // Update document with extracted content
      await ctx.runMutation(api.documents.updateExtraction, {
        id: args.documentId,
        extractedContent: result.markdown,
        extractedInsights: result.insights,
        status: "verified",
      });

      console.log(`[Extraction] Document ${args.documentId} processed successfully`);
    } catch (error: any) {
      console.error(`[Extraction] Error processing document:`, error);

      // Update document with error
      await ctx.runMutation(api.documents.updateExtraction, {
        id: args.documentId,
        extractionError: error.message || "Unknown error",
        status: "rejected",
      });
    }
  },
});

// Trigger extraction for a document (called after upload)
export const triggerExtraction = action({
  args: {
    documentId: v.id("documents"),
  },
  handler: async (ctx, args) => {
    // Get document details
    const doc = await ctx.runQuery(api.documents.get, { id: args.documentId });
    if (!doc || !doc.storageId) {
      throw new Error("Document not found or no file attached");
    }

    // Update status to extracting
    await ctx.runMutation(api.documents.updateStatus, {
      id: args.documentId,
      status: "extracting",
    });

    // Schedule extraction
    await ctx.scheduler.runAfter(0, internal.extraction.gemini.processDocument, {
      documentId: args.documentId,
      storageId: doc.storageId,
      category: doc.category,
    });

    return { scheduled: true };
  },
});
