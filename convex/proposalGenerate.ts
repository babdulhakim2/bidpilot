"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { GoogleGenAI } from "@google/genai";

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent";
const GEMINI_IMAGE_API = "https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict";

interface ProposalSection {
  id: string;
  title: string;
  content: string;
  imagePrompt?: string;
  imageUrl?: string;
}

// Generate full proposal with sections and image prompts
export const generateWithAI = action({
  args: {
    proposalId: v.id("proposals"),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY not configured");
    }

    // Get proposal
    const proposal = await ctx.runQuery(api.proposals.get, { id: args.proposalId });
    if (!proposal) throw new Error("Proposal not found");

    // Get tender
    const tender = await ctx.runQuery(api.tenders.get, { id: proposal.tenderId });
    if (!tender) throw new Error("Tender not found");

    // Get user profile
    const user = await ctx.runQuery(api.users.me);
    if (!user) throw new Error("User not found");

    // Get ALL user's documents with extracted content
    const documents = await ctx.runQuery(api.documents.listMine);
    const verifiedDocs = documents.filter((d: any) => d.status === "verified");

    // Build full context
    const fullContext = buildFullContext(user, verifiedDocs, tender);

    // Generate proposal sections with Gemini
    const prompt = buildGenerationPrompt(tender, fullContext);

    const requestBody = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 12000,
      },
    };

    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Gemini error:", error);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const result = await response.json();
    const content = result.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) {
      throw new Error("No content generated");
    }

    // Parse sections from response
    const sections = parseSections(content);

    // Update proposal with generated content (store as JSON)
    await ctx.runMutation(api.proposals.update, {
      id: args.proposalId,
      content: JSON.stringify({ sections, rawContent: content }),
      sections: sections.map(s => s.title),
      status: "generated",
    });

    // Increment usage
    await ctx.runMutation(api.billing.subscriptions.incrementUsage, {
      type: "proposal",
    });

    return { success: true, proposalId: args.proposalId, sections };
  },
});

// Generate image for a section using Gemini 2.5 Flash Image
export const generateSectionImage = action({
  args: {
    proposalId: v.id("proposals"),
    sectionId: v.string(),
    sectionTitle: v.string(),
    imagePrompt: v.string(),
    order: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY not configured");
    }

    try {
      const ai = new GoogleGenAI({ apiKey });
      
      // Enhance prompt with Nigerian context if not already specified
      const nigerianContext = args.imagePrompt.toLowerCase().includes('nigeria') || args.imagePrompt.toLowerCase().includes('african') 
        ? '' 
        : ' Set in Nigeria with Black African professionals where people are shown.';
      
      const prompt = `${args.imagePrompt}${nigerianContext} High quality, professional photography style, suitable for formal government tender proposal documentation. No text, words, or letters in the image.`;
      
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-image",
        contents: prompt,
      });

      const parts = response.candidates?.[0]?.content?.parts || [];
      
      for (const part of parts) {
        if (part.inlineData) {
          const imageData = part.inlineData.data;
          const mimeType = part.inlineData.mimeType || "image/png";
          
          // Store to Convex storage for persistence
          const buffer = Buffer.from(imageData, 'base64');
          const blob = new Blob([buffer], { type: mimeType });
          const storageId = await ctx.storage.store(blob);
          const imageUrl = await ctx.storage.getUrl(storageId);
          
          if (imageUrl) {
            // Save to proposalImages table
            await ctx.runMutation(api.proposalImages.upsert, {
              proposalId: args.proposalId,
              sectionId: args.sectionId,
              sectionTitle: args.sectionTitle,
              prompt: args.imagePrompt,
              storageId: storageId,
              url: imageUrl,
              order: args.order ?? 0,
            });
          }
          
          return { 
            imageUrl: imageUrl || `data:${mimeType};base64,${imageData}`
          };
        }
      }

      return { imageUrl: null, error: "No image generated" };
    } catch (e: any) {
      console.error("Image generation error:", e.message);
      return { 
        imageUrl: null, 
        error: e.message || "Image generation failed"
      };
    }
  },
});

function buildFullContext(user: any, documents: any[], tender: any): string {
  const parts: string[] = [];

  // Company info
  parts.push("=== COMPANY INFORMATION ===");
  parts.push(`Company Name: ${user.companyName}`);
  if (user.categories?.length > 0) {
    parts.push(`Business Categories: ${user.categories.join(", ")}`);
  }
  if (user.phone) parts.push(`Contact: ${user.phone}`);
  if (user.email) parts.push(`Email: ${user.email}`);

  // Extracted document content
  parts.push("\n=== COMPANY DOCUMENTS (Extracted Content) ===");
  
  for (const doc of documents) {
    parts.push(`\n--- ${doc.category}: ${doc.name} ---`);
    
    if (doc.extractedInsights) {
      const insights = doc.extractedInsights;
      if (insights.summary) parts.push(`Summary: ${insights.summary}`);
      if (insights.companyName) parts.push(`Registered Name: ${insights.companyName}`);
      if (insights.industry) parts.push(`Industry: ${insights.industry}`);
      if (insights.services?.length) parts.push(`Services: ${insights.services.join(", ")}`);
      if (insights.certifications?.length) parts.push(`Certifications: ${insights.certifications.join(", ")}`);
      if (insights.experience?.length) parts.push(`Experience: ${insights.experience.join("; ")}`);
      if (insights.keyFacts?.length) parts.push(`Key Facts: ${insights.keyFacts.join("; ")}`);
      if (insights.contacts) {
        if (insights.contacts.email) parts.push(`Contact Email: ${insights.contacts.email}`);
        if (insights.contacts.phone) parts.push(`Contact Phone: ${insights.contacts.phone}`);
        if (insights.contacts.address) parts.push(`Address: ${insights.contacts.address}`);
      }
    }
    
    // Include extracted markdown content (truncated)
    if (doc.extractedContent) {
      const content = doc.extractedContent.slice(0, 3000);
      parts.push(`\nDocument Content:\n${content}`);
      if (doc.extractedContent.length > 3000) {
        parts.push("...[content truncated]");
      }
    }
  }

  return parts.join("\n");
}

function buildGenerationPrompt(tender: any, context: string): string {
  return `You are an expert Nigerian government tender proposal writer. Generate a comprehensive, winning proposal.

=== TENDER/CONTRACT DETAILS ===
Title: ${tender.title}
Organization: ${tender.organization}
Category: ${tender.category}
Budget: ₦${tender.budget?.toLocaleString() || "Not specified"}
Deadline: ${tender.deadline}
Location: ${tender.location}
Description: ${tender.description}
Requirements: ${tender.requirements?.join("; ") || "See tender document"}

${context}

=== INSTRUCTIONS ===
Generate a professional tender proposal with the following sections. For EACH section:
1. Write compelling, specific content using the company information provided
2. Include an IMAGE_PROMPT that describes a relevant professional image for that section

Format your response EXACTLY like this for each section:

### SECTION: Cover Letter
[Write the cover letter content here - formal, professional, addressed to the procuring entity]

IMAGE_PROMPT: Professional letterhead design with corporate blue theme, formal business document style

### SECTION: Executive Summary
[Write executive summary - highlight key qualifications and why the company should win]

IMAGE_PROMPT: Executive summary infographic showing key company strengths, modern corporate style

### SECTION: Company Profile
[Detailed company background using ACTUAL information from the documents]

IMAGE_PROMPT: Professional company office building, corporate team photo style, business environment

### SECTION: Technical Proposal
[Detailed technical methodology and approach specific to this tender]

IMAGE_PROMPT: Technical diagram showing project workflow, professional engineering style

### SECTION: Relevant Experience
[List ACTUAL past projects from the documents that are relevant to this tender]

IMAGE_PROMPT: Portfolio collage of completed projects, professional documentation style

### SECTION: Project Team
[Key personnel with roles - use actual names if available in documents, otherwise use [Name] placeholders]

IMAGE_PROMPT: Professional team organization chart, corporate headshot style layout

### SECTION: Work Plan & Timeline
[Detailed project schedule with milestones, Gantt-chart style description]

IMAGE_PROMPT: Professional project timeline/Gantt chart, clean modern design

### SECTION: Quality Assurance
[Quality control measures, compliance with Nigerian procurement standards]

IMAGE_PROMPT: Quality certification badges, ISO standards visual, professional compliance imagery

### SECTION: Financial Proposal
[Pricing breakdown based on the budget: ₦${tender.budget?.toLocaleString() || "TBD"}]

IMAGE_PROMPT: Financial breakdown chart, professional budget presentation, clean data visualization

=== IMPORTANT ===
- Use ACTUAL company information from the documents
- Reference REAL certifications, experience, and capabilities
- Be specific, not generic
- Follow Nigerian Public Procurement Act standards
- Make it compelling and professional
- Each section MUST have both content and IMAGE_PROMPT

Generate the proposal now:`;
}

function parseSections(content: string): ProposalSection[] {
  const sections: ProposalSection[] = [];
  const sectionRegex = /### SECTION: (.+?)(?=### SECTION:|$)/gs;
  
  let match;
  let id = 1;
  
  while ((match = sectionRegex.exec(content)) !== null) {
    const sectionContent = match[0];
    const titleMatch = sectionContent.match(/### SECTION: (.+)/);
    const title = titleMatch ? titleMatch[1].trim() : `Section ${id}`;
    
    // Extract image prompt
    const imagePromptMatch = sectionContent.match(/IMAGE_PROMPT:\s*(.+?)(?=\n|$)/);
    const imagePrompt = imagePromptMatch ? imagePromptMatch[1].trim() : undefined;
    
    // Extract content (everything between title and IMAGE_PROMPT)
    let sectionText = sectionContent
      .replace(/### SECTION: .+\n?/, '')
      .replace(/IMAGE_PROMPT:.+/, '')
      .trim();
    
    sections.push({
      id: `section-${id}`,
      title,
      content: sectionText,
      imagePrompt,
    });
    
    id++;
  }
  
  // Fallback if parsing fails
  if (sections.length === 0) {
    sections.push({
      id: 'section-1',
      title: 'Proposal Content',
      content: content,
    });
  }
  
  return sections;
}
