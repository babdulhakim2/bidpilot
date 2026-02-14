import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

// Beta headers required for Skills
const BETAS: ("code-execution-2025-08-25" | "skills-2025-10-02" | "files-api-2025-04-14")[] = [
  "code-execution-2025-08-25",
  "skills-2025-10-02", 
  "files-api-2025-04-14",
];

interface ProposalSection {
  id: string;
  title: string;
  content: string;
  imageUrl?: string;
  imagePrompt?: string;
}

interface ProposalContent {
  title: string;
  organization: string;
  companyName: string;
  budget?: number;
  deadline?: string;
  category?: string;
  sections: ProposalSection[];
}

export async function POST(req: NextRequest) {
  try {
    const { content }: { content: ProposalContent } = await req.json();

    if (!content || !content.sections || content.sections.length === 0) {
      return NextResponse.json(
        { error: "No content provided" },
        { status: 400 }
      );
    }

    // Build the prompt with proposal content
    const prompt = buildPrompt(content);

    // Step 1: Call Claude with the PDF skill
    let response = await client.beta.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 16384,
      betas: BETAS,
      // @ts-ignore - container is a beta feature
      container: {
        skills: [
          {
            type: "anthropic",
            skill_id: "pdf",
            version: "latest",
          },
        ],
      },
      messages: [{ role: "user", content: prompt }],
      tools: [{ type: "code_execution_20250825", name: "code_execution" }],
    });

    // Step 2: Handle pause_turn for long PDF generation
    let messages: any[] = [{ role: "user", content: prompt }];
    let retries = 0;
    const MAX_RETRIES = 15; // PDF generation can take a while

    while (response.stop_reason === "pause_turn" && retries < MAX_RETRIES) {
      messages.push({ role: "assistant", content: response.content });
      
      // @ts-ignore - container is a beta feature
      const containerId = response.container?.id;
      
      response = await client.beta.messages.create({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 16384,
        betas: BETAS,
        // @ts-ignore - container is a beta feature
        container: {
          id: containerId,
          skills: [
            { type: "anthropic", skill_id: "pdf", version: "latest" },
          ],
        },
        messages,
        tools: [{ type: "code_execution_20250825", name: "code_execution" }],
      });
      retries++;
    }

    // Step 3: Extract file_id from the response
    const fileIds = extractFileIds(response);
    
    if (fileIds.length === 0) {
      console.error("No PDF file generated. Response:", JSON.stringify(response.content, null, 2));
      return NextResponse.json(
        { error: "No PDF file was generated" },
        { status: 500 }
      );
    }

    // Step 4: Download the PDF via Files API
    const fileId = fileIds[0];
    // @ts-ignore - beta method
    const fileResponse = await client.beta.files.download(fileId, {
      betas: ["files-api-2025-04-14"],
    });

    // Convert response to buffer
    const arrayBuffer = await fileResponse.arrayBuffer();
    const pdfBuffer = Buffer.from(arrayBuffer);

    // Return the PDF as base64 for Convex storage
    const base64Pdf = pdfBuffer.toString("base64");
    
    return NextResponse.json({
      success: true,
      pdf: base64Pdf,
      filename: `${sanitizeFilename(content.title)}.pdf`,
      size: pdfBuffer.length,
    });

  } catch (error: any) {
    console.error("PDF generation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate PDF" },
      { status: 500 }
    );
  }
}

// Extract file IDs from Claude's response
function extractFileIds(response: any): string[] {
  const fileIds: string[] = [];

  for (const item of response.content) {
    // Check code execution results
    if (item.type === "code_execution_tool_result") {
      if (Array.isArray(item.content)) {
        for (const block of item.content) {
          if (block.type === "file" && block.file_id) {
            fileIds.push(block.file_id);
          }
        }
      }
    }
    
    // Check server tool use results
    if (item.type === "server_tool_result" || item.type === "tool_result") {
      const content = item.content;
      if (Array.isArray(content)) {
        for (const block of content) {
          if (block.file_id) fileIds.push(block.file_id);
        }
      }
    }
  }

  // Fallback: search recursively for any file_id
  if (fileIds.length === 0) {
    const jsonStr = JSON.stringify(response.content);
    const matches = jsonStr.match(/"file_id"\s*:\s*"([^"]+)"/g);
    if (matches) {
      for (const match of matches) {
        const id = match.match(/"file_id"\s*:\s*"([^"]+)"/)?.[1];
        if (id && !fileIds.includes(id)) fileIds.push(id);
      }
    }
  }

  return fileIds;
}

// Build the prompt from proposal content
function buildPrompt(content: ProposalContent): string {
  const date = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long", 
    day: "numeric",
  });

  let prompt = `Create a professional PDF tender proposal document with the following specifications:

DOCUMENT DETAILS:
- Title: ${content.title}
- Prepared for: ${content.organization}
- Prepared by: ${content.companyName}
- Date: ${date}
${content.budget ? `- Budget: ₦${content.budget.toLocaleString()}` : ""}
${content.category ? `- Category: ${content.category}` : ""}
${content.deadline ? `- Deadline: ${content.deadline}` : ""}

DESIGN REQUIREMENTS:
- Professional Nigerian government tender style
- Color scheme: Navy (#0B1D3A), Teal (#0f766e), Gold accents (#C8A456)
- Header on every page with company name and proposal title
- Footer with page numbers (Page X of Y)
- Table of contents after cover page
- Professional typography using Helvetica/Arial
- Section dividers with teal accent bars
- Tables with alternating row colors where applicable

COVER PAGE:
- Company logo placeholder (circle with first letter of company name)
- Proposal title prominently displayed
- "Submitted to: ${content.organization}"
- "Submitted by: ${content.companyName}"
- Date at bottom

SECTIONS TO INCLUDE:
`;

  // Add each section from the proposal
  for (let i = 0; i < content.sections.length; i++) {
    const section = content.sections[i];
    prompt += `
## Section ${i + 1}: ${section.title}
${section.content}

`;
    
    // If section has image prompt, ask Claude to generate a visualization
    if (section.imagePrompt) {
      prompt += `[Generate a professional illustration/diagram for this section: ${section.imagePrompt}]

`;
    }
  }

  prompt += `
IMPORTANT INSTRUCTIONS:
1. Use reportlab for PDF generation
2. Generate any charts, diagrams, or visualizations programmatically with matplotlib
3. Ensure the document looks professional and is suitable for a Nigerian government tender submission
4. Include proper page breaks between major sections
5. Use bullet points and numbered lists where appropriate
6. Make tables professional with borders and shading
7. Save the final PDF to /mnt/user-data/outputs/proposal.pdf
8. The PDF should be polished, formal, and presentation-ready
9. Target 10-20 pages depending on content length
10. Include a compliance statement section at the end if not already present

Generate the PDF now.`;

  return prompt;
}

function sanitizeFilename(title: string): string {
  return title
    .slice(0, 50)
    .replace(/[^a-zA-Z0-9\s-]/g, "")
    .replace(/\s+/g, "_")
    .toLowerCase() || "proposal";
}
