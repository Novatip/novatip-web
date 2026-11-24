"use client";

/**
 * contexts/CreatorContext.tsx
 *
 * Shares the signed-in creator's profile with every dashboard page. The
 * dashboard layout is the only place that loads it (authApi.me followed by
 * creatorApi.getBySlug); pages read it from here instead of fetching again.
 */

import { createContext, useContext } from "react";
import type { CreatorProfile } from "@/lib/api";

export interface CreatorContextValue {
  /** The creator's profile, or null while loading, after a failure, or when signed out. */
  creator: CreatorProfile | null;
  /** True while the profile is being fetched. */
  loading: boolean;
  /** Message from the last failed fetch, or null. */
  error: string | null;
  /** Fetch the profile again. */
  refresh: () => void;
  /**
   * Replace the profile with one a page already holds, e.g. the response of a
   * save, so every page sees the update without another round trip.
   */
  setCreator: (creator: CreatorProfile) => void;
}

export const CreatorContext = createContext<CreatorContextValue | undefined>(undefined);

export function useCreator(): CreatorContextValue {
  const context = useContext(CreatorContext);
  if (!context) {
    throw new Error("useCreator must be used within the dashboard layout");
  }
  return context;
}
