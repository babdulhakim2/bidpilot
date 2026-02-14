"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";
import { api } from "../_generated/api";

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

interface MatchResult {
  title: string;
  organization: string;
  category: string;
  budget: number | null;
  deadline: string | null;
  location: string;
  description: string;
  requirements: string[];
  matchScore: number;
  matchReasons: string[];
  missingRequirements: string[];
  recommendations: string[];
  howToWin: string;
}

export const analyzeTenderText = action({
  args: {
    text: v.string(),
  },
  handler: async (ctx, args): Promise<MatchResult> => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY not configured");
    }

    // Get user's profile and documents
    const user = await ctx.runQuery(api.users.me);
    if (!user) {
      throw new Error("User not found");
    }

    // Get user's verified documents with extracted content
    const documents = await ctx.runQuery(api.documents.listMine);
    const verifiedDocs = documents.filter((d: any) => d.status === "verified" && d.extractedInsights);

    // Build company profile from documents
    const companyProfile = buildCompanyProfile(user, verifiedDocs);

    // Analyze tender with Gemini
    const prompt = `You are a tender matching assistant for Nigerian government contracts.

COMPANY PROFILE:
${companyProfile}

TENDER TEXT TO ANALYZE:
${args.text}

Analyze this tender and match it against the company profile. Return a JSON response with this exact structure:
{
  "title": "Tender title extracted from text",
  "organization": "Issuing organization",
  "category": "One of: Construction, ICT, Consultancy, Supplies, Healthcare, Solar & Renewable, Security, Logistics, Education, Other",
  "budget": null or number in Naira,
  "deadline": null or "YYYY-MM-DD",
  "location": "Location/State",
  "description": "Brief description of the tender",
  "requirements": ["List of requirements mentioned"],
  "matchScore": 0-100,
  "matchReasons": ["Why this company is a good match"],
  "missingRequirements": ["Requirements the company may not have"],
  "recommendations": ["Steps to improve chances"],
  "howToWin": "A paragraph explaining the best strategy to win this tender given the company's strengths"
}

Be specific and practical in your recommendations. The matchScore should reflect:
- 80-100: Excellent match, company meets most requirements
- 60-79: Good match, some gaps but winnable
- 40-59: Partial match, significant preparation needed
- 0-39: Poor match, major requirements missing

Return ONLY valid JSON, no markdown or explanation.`;

    const requestBody = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 4096,
      },
    };

    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${error}`);
    }

    const result = await response.json();
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error("No response from Gemini");
    }

    // Parse JSON response
    try {
      // Clean up the response (remove markdown if present)
      const cleanJson = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const parsed = JSON.parse(cleanJson);
      
      return {
        title: parsed.title || "Untitled Tender",
        organization: parsed.organization || "Unknown",
        category: parsed.category || "Other",
        budget: parsed.budget,
        deadline: parsed.deadline,
        location: parsed.location || "Nigeria",
        description: parsed.description || "",
        requirements: parsed.requirements || [],
        matchScore: Math.min(100, Math.max(0, parsed.matchScore || 50)),
        matchReasons: parsed.matchReasons || [],
        missingRequirements: parsed.missingRequirements || [],
        recommendations: parsed.recommendations || [],
        howToWin: parsed.howToWin || "",
      };
    } catch (e) {
      console.error("Failed to parse Gemini response:", text);
      throw new Error("Failed to analyze tender");
    }
  },
});

function buildCompanyProfile(user: any, documents: any[]): string {
  const parts: string[] = [];

  parts.push(`Company Name: ${user.companyName}`);
  
  if (user.categories?.length > 0) {
    parts.push(`Business Categories: ${user.categories.join(", ")}`);
  }

  // Extract insights from documents
  const allServices: string[] = [];
  const allCertifications: string[] = [];
  const allExperience: string[] = [];

  for (const doc of documents) {
    const insights = doc.extractedInsights;
    if (!insights) continue;

    if (insights.services) allServices.push(...insights.services);
    if (insights.certifications) allCertifications.push(...insights.certifications);
    if (insights.experience) allExperience.push(...insights.experience);
    if (insights.summary) parts.push(`From ${doc.category}: ${insights.summary}`);
  }

  if (allServices.length > 0) {
    parts.push(`Services: ${[...new Set(allServices)].join(", ")}`);
  }
  if (allCertifications.length > 0) {
    parts.push(`Certifications: ${[...new Set(allCertifications)].join(", ")}`);
  }
  if (allExperience.length > 0) {
    parts.push(`Experience: ${[...new Set(allExperience)].slice(0, 5).join("; ")}`);
  }

  // Document categories the company has
  const docCategories = [...new Set(documents.map((d: any) => d.category))];
  if (docCategories.length > 0) {
    parts.push(`Documents on file: ${docCategories.join(", ")}`);
  }

  return parts.join("\n");
}

// Save analyzed tender to user's tenders
export const saveTenderFromAnalysis = action({
  args: {
    analysis: v.object({
      title: v.string(),
      organization: v.string(),
      category: v.string(),
      budget: v.union(v.number(), v.null()),
      deadline: v.union(v.string(), v.null()),
      location: v.string(),
      description: v.string(),
      requirements: v.array(v.string()),
      matchScore: v.number(),
      missingRequirements: v.array(v.string()),
    }),
    sourceText: v.string(),
  },
  handler: async (ctx, args) => {
    // Increment usage
    await ctx.runMutation(api.billing.subscriptions.incrementUsage, {
      type: "alert",
    });

    // Create tender
    const tenderId = await ctx.runMutation(api.tenders.createFromAnalysis, {
      title: args.analysis.title,
      organization: args.analysis.organization,
      category: args.analysis.category,
      budget: args.analysis.budget ?? 0,
      deadline: args.analysis.deadline ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      location: args.analysis.location,
      description: args.analysis.description,
      requirements: args.analysis.requirements,
      missing: args.analysis.missingRequirements,
      matchScore: args.analysis.matchScore,
      source: "manual",
      sourceText: args.sourceText,
    });

    return tenderId;
  },
});
