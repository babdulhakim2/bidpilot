"use node";

import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const CHUNK_SIZE = 500; // characters per chunk
const CHUNK_OVERLAP = 100;

// Generate embedding from OpenAI
async function generateEmbedding(text: string): Promise<number[]> {
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: text,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

// Split text into chunks with overlap
function chunkText(text: string): string[] {
  const chunks: string[] = [];
  let start = 0;
  
  while (start < text.length) {
    const end = Math.min(start + CHUNK_SIZE, text.length);
    chunks.push(text.slice(start, end));
    start += CHUNK_SIZE - CHUNK_OVERLAP;
  }
  
  return chunks;
}

// Action: Index a document (generate embeddings for all chunks)
export const indexDocument = action({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    // Get document
    const doc = await ctx.runQuery(internal.vectorSearch.getDocumentContent, {
      documentId: args.documentId,
    });
    
    if (!doc) throw new Error("Document not found");
    if (!doc.extractedContent) throw new Error("Document has no extracted content");
    
    // Delete existing chunks
    await ctx.runMutation(internal.vectorSearch.deleteChunks, {
      documentId: args.documentId,
    });
    
    // Chunk the content
    const chunks = chunkText(doc.extractedContent);
    
    // Generate embeddings and store chunks
    for (let i = 0; i < chunks.length; i++) {
      const embedding = await generateEmbedding(chunks[i]);
      
      await ctx.runMutation(internal.vectorSearch.storeChunk, {
        documentId: args.documentId,
        userId: doc.userId,
        chunkIndex: i,
        text: chunks[i],
        embedding,
      });
    }
    
    return { chunksCreated: chunks.length };
  },
});

// Action: Search documents by similarity
export const searchDocuments = action({
  args: {
    userId: v.id("users"),
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 5;
    
    // Generate embedding for query
    const queryEmbedding = await generateEmbedding(args.query);
    
    // Vector search with user filter
    const results = await ctx.vectorSearch("documentChunks", "by_embedding", {
      vector: queryEmbedding,
      limit: limit * 2, // Get more to dedupe by document
      filter: (q) => q.eq("userId", args.userId),
    });
    
    // Dedupe by document and get top results
    const seenDocs = new Set<string>();
    const uniqueResults: Array<{
      documentId: string;
      text: string;
      score: number;
    }> = [];
    
    for (const result of results) {
      const docId = result.documentId as string;
      if (!seenDocs.has(docId) && uniqueResults.length < limit) {
        seenDocs.add(docId);
        uniqueResults.push({
          documentId: docId,
          text: result.text as string,
          score: result._score,
        });
      }
    }
    
    return uniqueResults;
  },
});

// Action: Find relevant documents for a tender
export const findRelevantDocuments = action({
  args: {
    userId: v.id("users"),
    tenderDescription: v.string(),
    requirements: v.array(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10;
    
    // Combine tender info for search
    const searchText = `${args.tenderDescription}\n\nRequirements:\n${args.requirements.join("\n")}`;
    
    // Generate embedding
    const queryEmbedding = await generateEmbedding(searchText);
    
    // Vector search
    const results = await ctx.vectorSearch("documentChunks", "by_embedding", {
      vector: queryEmbedding,
      limit: limit * 3,
      filter: (q) => q.eq("userId", args.userId),
    });
    
    // Group by document and calculate aggregate score
    const docScores = new Map<string, { totalScore: number; count: number; texts: string[] }>();
    
    for (const result of results) {
      const docId = result.documentId as string;
      const existing = docScores.get(docId) || { totalScore: 0, count: 0, texts: [] };
      existing.totalScore += result._score;
      existing.count += 1;
      if (existing.texts.length < 3) {
        existing.texts.push(result.text as string);
      }
      docScores.set(docId, existing);
    }
    
    // Sort by average score and return
    const ranked = Array.from(docScores.entries())
      .map(([documentId, data]) => ({
        documentId,
        avgScore: data.totalScore / data.count,
        matchCount: data.count,
        relevantTexts: data.texts,
      }))
      .sort((a, b) => b.avgScore - a.avgScore)
      .slice(0, limit);
    
    return ranked;
  },
});

// Action: Re-index all documents for a user
export const reindexUserDocuments = action({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const docs = await ctx.runQuery(internal.vectorSearch.getVerifiedDocuments, {
      userId: args.userId,
    });
    
    let indexed = 0;
    let failed = 0;
    
    for (const doc of docs) {
      try {
        await ctx.runMutation(internal.vectorSearch.deleteChunks, {
          documentId: doc._id,
        });
        
        const chunks = chunkText(doc.extractedContent!);
        
        for (let i = 0; i < chunks.length; i++) {
          const embedding = await generateEmbedding(chunks[i]);
          
          await ctx.runMutation(internal.vectorSearch.storeChunk, {
            documentId: doc._id,
            userId: args.userId,
            chunkIndex: i,
            text: chunks[i],
            embedding,
          });
        }
        
        indexed++;
      } catch (e) {
        console.error(`Failed to index doc ${doc._id}:`, e);
        failed++;
      }
    }
    
    return { indexed, failed, total: docs.length };
  },
});
