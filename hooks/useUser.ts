"use client";

import { useQuery, useMutation } from "convex/react";
import { useUser as useClerkUser } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

export function useCurrentUser() {
  const { user: clerkUser, isLoaded } = useClerkUser();
  
  const convexUser = useQuery(
    api.users.getByClerkId,
    clerkUser?.id ? { clerkId: clerkUser.id } : "skip"
  );

  return {
    user: convexUser,
    clerkUser,
    isLoaded,
    isAuthenticated: !!clerkUser,
    userId: convexUser?._id,
  };
}

export function useUpsertUser() {
  return useMutation(api.users.upsert);
}

export function useUpdateUser() {
  return useMutation(api.users.update);
}

export function useRecalculateCompleteness() {
  return useMutation(api.users.recalculateCompleteness);
}
