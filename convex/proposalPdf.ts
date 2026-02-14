"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

// Generate PDF using Claude's PDF skill and store in Convex
export const generate = action({
  args: {
    proposalId: v.id("proposals"),
  },
  handler: async (ctx, args) => {
    // Get proposal
    const proposal = await ctx.runQuery(api.proposals.get, { id: args.proposalId });
    if (!proposal) throw new Error("Proposal not found");

    // Get tender
    const tender = await ctx.runQuery(api.tenders.get, { id: proposal.tenderId });
    if (!tender) throw new Error("Tender not found");

    // Get user
    const user = await ctx.runQuery(api.users.me);
    if (!user) throw new Error("User not found");

    // Parse sections from proposal content
    let sections: any[] = [];
    if (proposal.content) {
      try {
        const data = JSON.parse(proposal.content);
        sections = data.sections || [];
      } catch {
        sections = [{ id: "1", title: "Proposal", content: proposal.content }];
      }
    }

    if (sections.length === 0) {
      throw new Error("No proposal content to generate PDF from");
    }

    // Get section images (may not exist if pipeline hasn't run)
    let images: any[] = [];
    try {
      images = await ctx.runQuery(api.proposalImages.listByProposal, { 
        proposalId: args.proposalId 
      });
    } catch {
      // proposalImages table may not exist yet
      images = [];
    }

    // Merge images into sections
    const sectionsWithImages = sections.map((section: any) => {
      const image = images.find((img: any) => img.sectionId === section.id);
      return {
        ...section,
        imageUrl: image?.url,
        imagePrompt: image?.prompt || section.imagePrompt,
      };
    });

    // Prepare content for PDF generation
    const content = {
      title: tender.title,
      organization: tender.organization,
      companyName: user.companyName,
      budget: tender.budget,
      deadline: tender.deadline,
      category: tender.category,
      sections: sectionsWithImages,
    };

    // Call the PDF generation API
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.CONVEX_SITE_URL || "http://localhost:3000";
    
    const response = await fetch(`${baseUrl}/api/generate-pdf`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ content }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to generate PDF");
    }

    const result = await response.json();
    
    if (!result.success || !result.pdf) {
      throw new Error("PDF generation failed - no PDF returned");
    }

    // Convert base64 to blob and store in Convex
    const pdfBuffer = Buffer.from(result.pdf, "base64");
    const blob = new Blob([pdfBuffer], { type: "application/pdf" });
    const storageId = await ctx.storage.store(blob);
    const pdfUrl = await ctx.storage.getUrl(storageId);

    // Update proposal with PDF info
    await ctx.runMutation(api.proposals.updatePdf, {
      id: args.proposalId,
      pdfStorageId: storageId,
      pdfUrl: pdfUrl!,
      pdfGeneratedAt: Date.now(),
    });

    return {
      success: true,
      pdfUrl,
      storageId,
      filename: result.filename,
      size: result.size,
    };
  },
});

// Delete PDF from storage
export const deletePdf = action({
  args: {
    proposalId: v.id("proposals"),
  },
  handler: async (ctx, args) => {
    const proposal = await ctx.runQuery(api.proposals.get, { id: args.proposalId });
    if (!proposal) throw new Error("Proposal not found");

    if (proposal.pdfStorageId) {
      await ctx.storage.delete(proposal.pdfStorageId);
    }

    await ctx.runMutation(api.proposals.updatePdf, {
      id: args.proposalId,
      pdfStorageId: undefined,
      pdfUrl: undefined,
      pdfGeneratedAt: undefined,
    });

    return { success: true };
  },
});
