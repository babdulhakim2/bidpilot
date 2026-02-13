"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

export function useDocuments(userId: Id<"users"> | undefined) {
  return useQuery(
    api.documents.listByUser,
    userId ? { userId } : "skip"
  ) ?? [];
}

export function useDocument(id: Id<"documents">) {
  return useQuery(api.documents.get, { id });
}

export function useGenerateUploadUrl() {
  return useMutation(api.documents.generateUploadUrl);
}

export function useCreateDocument() {
  return useMutation(api.documents.create);
}

export function useUpdateDocumentStatus() {
  return useMutation(api.documents.updateStatus);
}

export function useDeleteDocument() {
  return useMutation(api.documents.remove);
}

export function useDocumentUrl(storageId: Id<"_storage"> | undefined) {
  return useQuery(
    api.documents.getUrl,
    storageId ? { storageId } : "skip"
  );
}
