import { NextRequest, NextResponse } from "next/server";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY!;
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

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

    const prompt = buildPrompt(content);

    // Step 1: Call Claude with the PDF skill using raw fetch
    let response = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "code-execution-2025-08-25,skills-2025-10-02,files-api-2025-04-14",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 16384,
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
        tools: [{ 
          type: "code_execution_20250825",
          name: "code_execution"
        }],
      }),
    });

    let result = await response.json();

    if (!response.ok) {
      console.error("Anthropic API error:", result);
      return NextResponse.json(
        { error: `${response.status} ${JSON.stringify(result)}` },
        { status: response.status }
      );
    }

    // Step 2: Handle pause_turn for long PDF generation
    let messages: any[] = [{ role: "user", content: prompt }];
    let retries = 0;
    const MAX_RETRIES = 15;

    while (result.stop_reason === "pause_turn" && retries < MAX_RETRIES) {
      messages.push({ role: "assistant", content: result.content });
      
      const containerId = result.container?.id;
      
      response = await fetch(ANTHROPIC_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "anthropic-beta": "code-execution-2025-08-25,skills-2025-10-02,files-api-2025-04-14",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-5-20250929",
          max_tokens: 16384,
          container: {
            id: containerId,
            skills: [
              { type: "anthropic", skill_id: "pdf", version: "latest" },
            ],
          },
          messages,
          tools: [{ 
            type: "code_execution_20250825",
            name: "code_execution"
          }],
        }),
      });
      
      result = await response.json();
      
      if (!response.ok) {
        console.error("Anthropic API error (retry):", result);
        return NextResponse.json(
          { error: `${response.status} ${JSON.stringify(result)}` },
          { status: response.status }
        );
      }
      
      retries++;
    }

    // Step 3: Extract file_id from the response
    const fileIds = extractFileIds(result);
    
    if (fileIds.length === 0) {
      console.error("No PDF file generated. Response:", JSON.stringify(result.content, null, 2));
      return NextResponse.json(
        { error: "No PDF file was generated" },
        { status: 500 }
      );
    }

    // Step 4: Download the PDF via Files API
    const fileId = fileIds[0];
    const fileResponse = await fetch(`https://api.anthropic.com/v1/files/${fileId}/content`, {
      method: "GET",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "files-api-2025-04-14",
      },
    });

    if (!fileResponse.ok) {
      const error = await fileResponse.text();
      console.error("File download error:", error);
      return NextResponse.json(
        { error: `Failed to download PDF: ${error}` },
        { status: 500 }
      );
    }

    const pdfBuffer = Buffer.from(await fileResponse.arrayBuffer());

    // Return the PDF as base64 for frontend
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

  for (const item of response.content || []) {
    // Skills return files inside code execution results
    if (item.type === "code_execution_tool_result") {
      if (Array.isArray(item.content)) {
        for (const block of item.content) {
          if (block.type === "file" && block.file_id) {
            fileIds.push(block.file_id);
          }
        }
      }
    }
    
    // Also check for server_tool_use results
    if (item.type === "server_tool_result" || item.type === "tool_result") {
      if (Array.isArray(item.content)) {
        for (const block of item.content) {
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

COVER PAGE:
- Company logo placeholder (circle with first letter of company name)
- Proposal title prominently displayed
- "Submitted to: ${content.organization}"
- "Submitted by: ${content.companyName}"
- Date at bottom

SECTIONS TO INCLUDE:
`;

  for (let i = 0; i < content.sections.length; i++) {
    const section = content.sections[i];
    prompt += `
## Section ${i + 1}: ${section.title}
${section.content}
`;
    
    if (section.imagePrompt) {
      prompt += `[Generate a professional diagram/illustration for this section: ${section.imagePrompt}]
`;
    }
  }

  prompt += `
IMPORTANT:
- Use reportlab for PDF generation
- Generate all visualizations programmatically with matplotlib/Pillow
- Save the final PDF to /mnt/user-data/outputs/proposal.pdf
- The PDF should be polished and presentation-ready
`;

  return prompt;
}

function sanitizeFilename(title: string): string {
  return title
    .slice(0, 50)
    .replace(/[^a-zA-Z0-9\s-]/g, "")
    .replace(/\s+/g, "_")
    .toLowerCase() || "proposal";
}
