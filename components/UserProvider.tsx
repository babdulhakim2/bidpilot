"use client";

import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { createContext, useContext, useEffect, ReactNode } from "react";
import { Id } from "@/convex/_generated/dataModel";

interface User {
  _id: Id<"users">;
  clerkId: string;
  companyName: string;
  email?: string;
  phone?: string;
  categories: string[];
  completeness: number;
  googleConnected?: boolean;
  createdAt: number;
  updatedAt: number;
}

interface UserContextType {
  user: User | null | undefined;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const UserContext = createContext<UserContextType>({
  user: undefined,
  isLoading: true,
  isAuthenticated: false,
});

export function useCurrentUser() {
  return useContext(UserContext);
}

export function UserProvider({ children }: { children: ReactNode }) {
  const { user: clerkUser, isLoaded: clerkLoaded } = useUser();
  const convexUser = useQuery(api.users.me);
  const ensureUser = useMutation(api.users.ensureUser);

  // Sync Clerk user to Convex on auth
  useEffect(() => {
    if (clerkLoaded && clerkUser && convexUser === null) {
      // User is authenticated but doesn't exist in Convex yet
      ensureUser({
        companyName: clerkUser.fullName || clerkUser.firstName || "My Company",
        email: clerkUser.primaryEmailAddress?.emailAddress,
      }).catch(console.error);
    }
  }, [clerkLoaded, clerkUser, convexUser, ensureUser]);

  const isLoading: boolean = !clerkLoaded || (clerkUser !== null && clerkUser !== undefined && convexUser === undefined);
  const isAuthenticated: boolean = clerkUser !== null && clerkUser !== undefined && convexUser !== null && convexUser !== undefined;

  return (
    <UserContext.Provider
      value={{
        user: convexUser,
        isLoading,
        isAuthenticated,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}
