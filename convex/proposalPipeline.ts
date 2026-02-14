"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { GoogleGenAI } from "@google/genai";

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

interface ProposalSection {
  id: string;
  title: string;
  content: string;
  imagePrompt?: string;
  imageUrl?: string;
}

interface PipelineState {
  stage: "analyzing" | "researching" | "generating" | "imaging" | "finalizing" | "complete" | "error";
  progress: number;
  message: string;
  structure?: any;
  research?: any;
  sections?: ProposalSection[];
  error?: string;
}

// Helper to call Gemini
async function callGemini(apiKey: string, prompt: string, maxTokens = 8000): Promise<string> {
  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: maxTokens,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${error}`);
  }

  const result = await response.json();
  const content = result.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!content) throw new Error("No content in Gemini response");
  return content;
}

// Helper for web search using Gemini grounding
async function webSearch(apiKey: string, query: string): Promise<string> {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ 
            parts: [{ 
              text: `Search and summarize the following topic with recent, factual information. Include specific data, statistics, and best practices. Topic: ${query}` 
            }] 
          }],
          tools: [{
            googleSearch: {}
          }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 4000,
          },
        }),
      }
    );

    if (!response.ok) {
      console.log("Web search failed, continuing without:", await response.text());
      return "Web search unavailable - proceeding with existing knowledge.";
    }

    const result = await response.json();
    return result.candidates?.[0]?.content?.parts?.[0]?.text || "No search results found.";
  } catch (e) {
    console.log("Web search error:", e);
    return "Web search unavailable.";
  }
}

// Generate image using Gemini 2.5 Flash Image - returns base64 and mimeType
async function generateImageData(apiKey: string, prompt: string): Promise<{ data: string; mimeType: string } | null> {
  try {
    const ai = new GoogleGenAI({ apiKey });
    
    // Enhance prompt with Nigerian context if not already specified
    const nigerianContext = prompt.toLowerCase().includes('nigeria') || prompt.toLowerCase().includes('african') 
      ? '' 
      : ' Set in Nigeria with Black African professionals where people are shown.';
    
    const fullPrompt = `${prompt}${nigerianContext} High quality, professional photography style, suitable for formal government tender proposal documentation. No text, words, or letters in the image.`;
    
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: fullPrompt,
    });

    const parts = response.candidates?.[0]?.content?.parts || [];
    
    for (const part of parts) {
      if (part.inlineData) {
        const imageData = part.inlineData.data;
        const mimeType = part.inlineData.mimeType || "image/png";
        console.log("Image generated successfully");
        return { data: imageData, mimeType };
      }
    }
    
    console.log("No image in response");
    return null;
  } catch (e: any) {
    console.log("Image generation error:", e.message);
    return null;
  }
}

// Main pipeline action - this is a long-running action
export const runPipeline = action({
  args: {
    proposalId: v.id("proposals"),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

    console.log("[Pipeline] Starting for proposal:", args.proposalId);

    // Get proposal, tender, user, and documents
    const proposal = await ctx.runQuery(api.proposals.get, { id: args.proposalId });
    if (!proposal) throw new Error("Proposal not found");

    const tender = await ctx.runQuery(api.tenders.get, { id: proposal.tenderId });
    if (!tender) throw new Error("Tender not found");

    const user = await ctx.runQuery(api.users.me);
    if (!user) throw new Error("User not found");

    const documents = await ctx.runQuery(api.documents.listMine);
    const verifiedDocs = documents.filter((d: any) => d.status === "verified");

    // Build company context
    const companyContext = buildCompanyContext(user, verifiedDocs);

    try {
      // ========== STAGE 1: ANALYSIS ==========
      console.log("[Pipeline] Stage 1: Analysis");
      await ctx.runMutation(api.proposals.updateProgress, {
        id: args.proposalId,
        progress: {
          stage: "analyzing",
          progress: 10,
          message: "🔍 Analyzing your company profile and tender requirements...",
        },
      });

      const analysisPrompt = `You are a tender strategy expert. Analyze this company's capabilities against the tender requirements.

=== TENDER ===
Title: ${tender.title}
Organization: ${tender.organization}
Category: ${tender.category}
Budget: ₦${tender.budget?.toLocaleString() || "Not specified"}
Description: ${tender.description}
Requirements: ${tender.requirements?.join("; ") || "Standard requirements"}

=== COMPANY DATA ===
${companyContext}

=== TASK ===
Provide a strategic analysis in JSON format:
{
  "companyStrengths": ["strength1", "strength2", ...],
  "relevantExperience": ["project1", "project2", ...],
  "competitiveAdvantages": ["advantage1", ...],
  "gapsToAddress": ["gap1", ...],
  "proposedSections": [
    {"title": "Section Name", "focus": "What to emphasize", "priority": "high|medium|low"},
    ...
  ],
  "winningStrategy": "One paragraph on how to position this proposal",
  "keyMessaging": ["key point 1", "key point 2", ...]
}

Return ONLY valid JSON, no markdown.`;

      const analysisResult = await callGemini(apiKey, analysisPrompt, 4000);
      let analysis;
      try {
        analysis = JSON.parse(analysisResult.replace(/```json\n?|\n?```/g, '').trim());
      } catch {
        analysis = { proposedSections: [], winningStrategy: analysisResult };
      }

      console.log("[Pipeline] Analysis complete");

      // ========== STAGE 2: RESEARCH ==========
      console.log("[Pipeline] Stage 2: Research");
      await ctx.runMutation(api.proposals.updateProgress, {
        id: args.proposalId,
        progress: {
          stage: "researching",
          progress: 25,
          message: "🌐 Researching industry best practices...",
        },
      });

      const researchQuery = `${tender.category} procurement best practices Nigeria ${tender.title} industry standards 2024`;
      const researchResult = await webSearch(apiKey, researchQuery);

      await ctx.runMutation(api.proposals.updateProgress, {
        id: args.proposalId,
        progress: {
          stage: "researching",
          progress: 35,
          message: "📊 Gathering compliance requirements...",
        },
      });

      const complianceQuery = `Nigerian public procurement compliance ${tender.category} BPP requirements`;
      const complianceResearch = await webSearch(apiKey, complianceQuery);

      console.log("[Pipeline] Research complete");

      // ========== STAGE 3: CONTENT GENERATION ==========
      console.log("[Pipeline] Stage 3: Content Generation");
      await ctx.runMutation(api.proposals.updateProgress, {
        id: args.proposalId,
        progress: {
          stage: "generating",
          progress: 45,
          message: "✍️ Writing proposal content...",
        },
      });

      const contentPrompt = `You are an expert Nigerian tender proposal writer. Generate a comprehensive, winning proposal.

=== STRATEGIC ANALYSIS ===
${JSON.stringify(analysis, null, 2)}

=== RESEARCH INSIGHTS ===
Industry Best Practices:
${researchResult}

Compliance Requirements:
${complianceResearch}

=== TENDER DETAILS ===
Title: ${tender.title}
Organization: ${tender.organization}
Category: ${tender.category}
Budget: ₦${tender.budget?.toLocaleString() || "Not specified"}
Description: ${tender.description}
Location: ${tender.location}

=== COMPANY CONTEXT ===
${companyContext}

=== INSTRUCTIONS ===
Generate a professional tender proposal with these sections. Write detailed, specific content.
Use ACTUAL company information - don't make up names or projects.
Include specific references to Nigerian procurement standards.

For EACH section, write:
1. Compelling, detailed content (3-5 paragraphs minimum)
2. Use the strategic insights from the analysis

Format EXACTLY like this:

### SECTION: Cover Letter
[Professional cover letter addressed to ${tender.organization}]

### SECTION: Executive Summary
[Summary highlighting key qualifications and win themes from analysis]

### SECTION: Company Profile
[Detailed company background with strengths identified in analysis]

### SECTION: Technical Approach
[Detailed methodology incorporating research best practices]

### SECTION: Relevant Experience
[Past projects from company data that match this tender]

### SECTION: Project Team
[Team structure and qualifications]

### SECTION: Implementation Plan
[Phased approach with timeline]

### SECTION: Quality Assurance
[QA processes aligned with Nigerian standards]

### SECTION: Financial Proposal
[Budget breakdown for ₦${tender.budget?.toLocaleString() || "TBD"}]

Generate the full proposal now:`;

      const proposalContent = await callGemini(apiKey, contentPrompt, 12000);
      
      await ctx.runMutation(api.proposals.updateProgress, {
        id: args.proposalId,
        progress: {
          stage: "generating",
          progress: 65,
          message: "📝 Structuring sections...",
        },
      });

      // Parse sections
      let sections = parseSections(proposalContent);

      console.log("[Pipeline] Generated", sections.length, "sections");

      // ========== STAGE 4: IMAGE PROMPTS ==========
      console.log("[Pipeline] Stage 4: Image Prompts");
      await ctx.runMutation(api.proposals.updateProgress, {
        id: args.proposalId,
        progress: {
          stage: "imaging",
          progress: 75,
          message: "🎨 Creating image prompts...",
        },
      });

      const imagePromptRequest = `You are an expert at creating detailed image prompts for AI image generation.

=== CONTEXT ===
Company: ${user.companyName}
Industry: ${user.categories?.join(', ') || tender.category}
Tender: ${tender.title}
Organization: ${tender.organization}
Category: ${tender.category}
Location: Nigeria

=== SECTIONS TO CREATE IMAGES FOR ===
${sections.map((s, i) => `${i + 1}. ${s.title}: ${s.content.slice(0, 200)}...`).join('\n\n')}

=== INSTRUCTIONS ===
Create detailed, vivid image prompts for each section. The images will be used in a professional Nigerian government tender proposal.

Guidelines:
- Images should be RELEVANT to the section content and company's work
- Nigerian context: If showing people, they should be Black/African Nigerian professionals. If showing buildings or locations, they should look like Nigeria (Lagos, Abuja style architecture)
- NO text or words in the images
- Professional, corporate, clean aesthetic
- Specific and detailed prompts (the AI image model can handle complex prompts)
- Think about what visual would ENHANCE that section's message

Section-specific guidance:
- Cover Letter: Could be an abstract design, gradient, or subtle pattern - NOT a literal letterhead image
- Executive Summary: Visual that represents the key achievement or capability
- Company Profile: Could show office, team, or company's work in action
- Technical Approach: Diagrams, workflows, or people working on relevant tasks
- Relevant Experience: Showcase of past project types or completed work
- Project Team: Professional team setting, meeting room, or collaboration
- Implementation Plan: Timeline visualization, project phases, milestones
- Quality Assurance: Certification imagery, inspection, quality checkpoints
- Financial Proposal: Abstract financial/business growth imagery

Format as JSON array (100-150 words per prompt):
[
  {"section": "Cover Letter", "imagePrompt": "detailed prompt here..."},
  ...
]

Return ONLY valid JSON, no markdown.`;

      const imagePromptsResult = await callGemini(apiKey, imagePromptRequest, 2000);
      try {
        const prompts = JSON.parse(imagePromptsResult.replace(/```json\n?|\n?```/g, '').trim());
        sections = sections.map(section => {
          const match = prompts.find((p: any) => 
            p.section?.toLowerCase().includes(section.title.toLowerCase().split(' ')[0]) ||
            section.title.toLowerCase().includes(p.section?.toLowerCase().split(' ')[0])
          );
          return {
            ...section,
            imagePrompt: match?.imagePrompt || `Professional Nigerian business scene related to ${section.title}, showing Black African professionals in modern corporate setting, Lagos/Abuja style, clean and corporate aesthetic, no text`,
          };
        });
      } catch (e) {
        console.log("Failed to parse image prompts, using defaults");
        sections = sections.map((section, i) => ({
          ...section,
          imagePrompt: getDefaultPrompt(section.title, tender.category, user.companyName),
        }));
      }

      // ========== STAGE 5: IMAGE GENERATION ==========
      console.log("[Pipeline] Stage 5: Image Generation");
      await ctx.runMutation(api.proposals.updateProgress, {
        id: args.proposalId,
        progress: {
          stage: "imaging",
          progress: 80,
          message: "🖼️ Generating images...",
        },
      });

      // Generate images for ALL sections
      const totalSections = sections.length;
      for (let i = 0; i < sections.length; i++) {
        const section = sections[i];
        if (section.imagePrompt) {
          const progressPercent = 80 + Math.floor((i / totalSections) * 15);
          await ctx.runMutation(api.proposals.updateProgress, {
            id: args.proposalId,
            progress: {
              stage: "imaging",
              progress: progressPercent,
              message: `🖼️ Generating image ${i + 1}/${totalSections}: ${section.title}...`,
            },
          });
          
          // Generate image
          const imageData = await generateImageData(apiKey, section.imagePrompt);
          if (imageData) {
            // Store to Convex storage for persistence
            const buffer = Buffer.from(imageData.data, 'base64');
            const blob = new Blob([buffer], { type: imageData.mimeType });
            const storageId = await ctx.storage.store(blob);
            const imageUrl = await ctx.storage.getUrl(storageId);
            
            if (imageUrl) {
              sections[i].imageUrl = imageUrl;
              
              // Save to proposalImages table
              await ctx.runMutation(api.proposalImages.upsert, {
                proposalId: args.proposalId,
                sectionId: section.id,
                sectionTitle: section.title,
                prompt: section.imagePrompt,
                storageId: storageId,
                url: imageUrl,
                order: i,
              });
              
              console.log("[Pipeline] Generated and stored image for:", section.title);
            }
          }
        }
      }

      // ========== STAGE 6: FINALIZE ==========
      console.log("[Pipeline] Stage 6: Finalizing");
      await ctx.runMutation(api.proposals.updateProgress, {
        id: args.proposalId,
        progress: {
          stage: "finalizing",
          progress: 95,
          message: "✅ Saving your proposal...",
        },
      });

      // Save to database
      await ctx.runMutation(api.proposals.update, {
        id: args.proposalId,
        content: JSON.stringify({ 
          sections, 
          analysis,
          research: { industry: researchResult, compliance: complianceResearch }
        }),
        sections: sections.map(s => s.title),
        status: "generated",
      });

      // Increment usage
      try {
        await ctx.runMutation(api.billing.subscriptions.incrementUsage, {
          type: "proposal",
        });
      } catch (e) {
        console.log("Usage increment failed (non-critical):", e);
      }

      // Mark complete
      await ctx.runMutation(api.proposals.updateProgress, {
        id: args.proposalId,
        progress: {
          stage: "complete",
          progress: 100,
          message: "🎉 Proposal generated successfully!",
          sections,
        },
      });

      console.log("[Pipeline] Complete!");
      return { success: true, sections };

    } catch (error: any) {
      console.error("[Pipeline] Error:", error);
      await ctx.runMutation(api.proposals.updateProgress, {
        id: args.proposalId,
        progress: {
          stage: "error",
          progress: 0,
          message: `❌ Error: ${error.message}`,
          error: error.message,
        },
      });
      throw error;
    }
  },
});

function buildCompanyContext(user: any, documents: any[]): string {
  const parts: string[] = [];

  parts.push("=== COMPANY INFORMATION ===");
  parts.push(`Company Name: ${user.companyName}`);
  if (user.categories?.length > 0) {
    parts.push(`Business Categories: ${user.categories.join(", ")}`);
  }
  if (user.phone) parts.push(`Contact: ${user.phone}`);
  if (user.email) parts.push(`Email: ${user.email}`);

  parts.push("\n=== COMPANY DOCUMENTS ===");
  
  for (const doc of documents) {
    parts.push(`\n--- ${doc.category}: ${doc.name} ---`);
    
    if (doc.extractedInsights) {
      const insights = doc.extractedInsights;
      if (insights.summary) parts.push(`Summary: ${insights.summary}`);
      if (insights.companyName) parts.push(`Registered Name: ${insights.companyName}`);
      if (insights.services?.length) parts.push(`Services: ${insights.services.join(", ")}`);
      if (insights.certifications?.length) parts.push(`Certifications: ${insights.certifications.join(", ")}`);
      if (insights.experience?.length) parts.push(`Experience: ${insights.experience.join("; ")}`);
      if (insights.keyFacts?.length) parts.push(`Key Facts: ${insights.keyFacts.join("; ")}`);
    }
    
    if (doc.extractedContent) {
      const content = doc.extractedContent.slice(0, 2000);
      parts.push(`Content:\n${content}`);
    }
  }

  return parts.join("\n");
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
    
    let sectionText = sectionContent
      .replace(/### SECTION: .+\n?/, '')
      .trim();
    
    sections.push({
      id: `section-${id}`,
      title,
      content: sectionText,
    });
    
    id++;
  }
  
  if (sections.length === 0) {
    sections.push({
      id: 'section-1',
      title: 'Proposal Content',
      content: content,
    });
  }
  
  return sections;
}

// Generate contextual default prompts for Nigerian business context
function getDefaultPrompt(sectionTitle: string, category: string, companyName: string): string {
  const title = sectionTitle.toLowerCase();
  const base = `Nigerian professional business setting, Black African professionals, modern corporate aesthetic, Lagos/Abuja style, clean and polished, no text or words in image`;
  
  if (title.includes('cover') || title.includes('letter')) {
    return `Abstract geometric design with blue and gold gradient, subtle wave patterns, elegant minimalist corporate header design suitable for Nigerian government proposal, ${base}`;
  }
  if (title.includes('executive') || title.includes('summary')) {
    return `Aerial view of modern Nigerian business district with glass skyscrapers, busy professionals in suits walking, representing business success and growth, ${base}`;
  }
  if (title.includes('company') || title.includes('profile')) {
    return `Modern Nigerian corporate office interior, professional team of Black African business people in meeting, glass walls, contemporary furniture, ${companyName} style workspace, ${base}`;
  }
  if (title.includes('technical') || title.includes('approach')) {
    return `Nigerian engineers and technical professionals reviewing blueprints and digital displays, modern technology equipment, ${category} industry setting, collaborative work environment, ${base}`;
  }
  if (title.includes('experience') || title.includes('past')) {
    return `Collage-style showcase of completed projects in Nigeria, construction sites, finished buildings, infrastructure, professional documentation style, ${category} industry achievements, ${base}`;
  }
  if (title.includes('team') || title.includes('personnel')) {
    return `Diverse team of Nigerian professionals in business attire, confident poses, modern office background, leadership and expertise, collaborative atmosphere, ${base}`;
  }
  if (title.includes('implementation') || title.includes('plan') || title.includes('timeline')) {
    return `Visual representation of project phases, modern Nigerian construction or business project in progress, workers and managers coordinating, organized workflow, ${base}`;
  }
  if (title.includes('quality') || title.includes('assurance')) {
    return `Quality inspection scene in Nigeria, professionals with clipboards and safety gear, certification badges visible, attention to detail, standards compliance, ${base}`;
  }
  if (title.includes('financial') || title.includes('budget') || title.includes('cost')) {
    return `Abstract business growth visualization, upward trending charts, Nigerian Naira currency symbols subtly integrated, prosperity and financial stability theme, ${base}`;
  }
  
  return `Professional ${category} industry scene in Nigeria, Black African business professionals at work, modern corporate environment, representing ${sectionTitle}, ${base}`;
}
