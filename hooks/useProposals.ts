"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

export function useProposals(userId: Id<"users"> | undefined) {
  return useQuery(
    api.proposals.listByUser,
    userId ? { userId } : "skip"
  ) ?? [];
}

export function useProposal(id: Id<"proposals">) {
  return useQuery(api.proposals.get, { id });
}

export function useCreateProposal() {
  return useMutation(api.proposals.create);
}

export function useGenerateProposal() {
  return useMutation(api.proposals.generate);
}

export function useUpdateProposal() {
  return useMutation(api.proposals.update);
}

export function useSubmitProposal() {
  return useMutation(api.proposals.submit);
}

export function useDeleteProposal() {
  return useMutation(api.proposals.remove);
}
