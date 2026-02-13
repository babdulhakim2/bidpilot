"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

export function useTenders() {
  const tenders = useQuery(api.tenders.list);
  return tenders ?? [];
}

export function useTender(id: Id<"tenders">) {
  return useQuery(api.tenders.get, { id });
}

export function useTendersByCategory(category: string) {
  return useQuery(api.tenders.byCategory, { category }) ?? [];
}

export function useUpcomingTenders(days?: number) {
  return useQuery(api.tenders.upcoming, { days }) ?? [];
}

export function useCreateTender() {
  return useMutation(api.tenders.create);
}

export function useUpdateTender() {
  return useMutation(api.tenders.update);
}

export function useDeleteTender() {
  return useMutation(api.tenders.remove);
}
