/**
 * TanStack Query hooks over the service modules: cache keys, freshness and
 * invalidation live here; HTTP details live in services/.
 */
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { UI } from "@/lib/ui-config";
import * as api from "@/services/audit.service";

export const keys = {
  /** Prefix of every page of the audits list (its own root: ["audits", slug] is one audit). */
  auditList: ["audit-list"] as const,
  auditListPage: (filters: api.AuditListFilters, page: number) =>
    ["audit-list", filters, page] as const,
  audit: (slug: string) => ["audits", slug] as const,
  stats: (slug: string) => ["audits", slug, "stats"] as const,
  activity: (slug: string) => ["audits", slug, "activity"] as const,
  events: (slug: string, filters: api.EventFilters, page: number) =>
    ["audits", slug, "events", filters, page] as const,
  event: (slug: string, seq: number) => ["audits", slug, "event", seq] as const,
  checkpoints: (slug: string, page: number) => ["audits", slug, "checkpoints", page] as const,
  auditKeys: (slug: string) => ["audits", slug, "keys"] as const,
  auditKeysPage: (slug: string, page: number) => ["audits", slug, "keys", page] as const,
  ranking: (slug: string, kind: "actors" | "actions", page: number) =>
    ["audits", slug, "ranking", kind, page] as const,
  checkpointKeys: ["checkpoint-keys"] as const,
  /** The latest verification result in this session, read by the event drawer. */
  lastVerification: (slug: string) => ["audits", slug, "last-verification"] as const,
  accountKeys: ["account-keys"] as const,
  accountKeysPage: (page: number) => ["account-keys", page] as const,
  me: ["me"] as const,
};

// ── Queries ──────────────────────────────────────────────────────────────────

export const useAudits = (filters: api.AuditListFilters, page: number) =>
  useQuery({
    queryKey: keys.auditListPage(filters, page),
    queryFn: () => api.listAudits(filters, page, UI.auditsPageSize),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });

export const useAudit = (slug: string) =>
  useQuery({ queryKey: keys.audit(slug), queryFn: () => api.getAudit(slug), staleTime: 30_000 });

export const useStats = (slug: string) =>
  useQuery({ queryKey: keys.stats(slug), queryFn: () => api.getStats(slug), staleTime: 15_000 });

export const useActivity = (slug: string) =>
  useQuery({
    queryKey: keys.activity(slug),
    queryFn: () => api.getActivity(slug, UI.activityDays, UI.activityTop),
    staleTime: 30_000,
  });

export const useEvents = (slug: string, filters: api.EventFilters, page: number) =>
  useQuery({
    queryKey: keys.events(slug, filters, page),
    queryFn: () => api.listEvents(slug, filters, page, UI.eventsPageSize),
    placeholderData: keepPreviousData,
    staleTime: 10_000,
  });

export const useEvent = (slug: string, seq: number | undefined) =>
  useQuery({
    queryKey: keys.event(slug, seq ?? 0),
    queryFn: () => api.getEvent(slug, seq as number),
    enabled: seq !== undefined,
  });

export const useCheckpoints = (slug: string, page: number) =>
  useQuery({
    queryKey: keys.checkpoints(slug, page),
    queryFn: () => api.listCheckpoints(slug, page, UI.checkpointsPageSize),
    placeholderData: keepPreviousData,
  });

export const useCheckpointKeys = () =>
  useQuery({
    queryKey: keys.checkpointKeys,
    queryFn: api.listCheckpointKeys,
    staleTime: 5 * 60_000,
  });

export const useAuditKeys = (slug: string, page: number) =>
  useQuery({
    queryKey: keys.auditKeysPage(slug, page),
    queryFn: () => api.listAuditKeys(slug, page, UI.keysPageSize),
    placeholderData: keepPreviousData,
  });

export const useAccountKeys = (page: number) =>
  useQuery({
    queryKey: keys.accountKeysPage(page),
    queryFn: () => api.listAccountKeys(page, UI.keysPageSize),
    placeholderData: keepPreviousData,
  });

/** One page of every actor over the overview's window, most active first; off until enabled. */
export const useActorRanking = (slug: string, page: number, enabled: boolean) =>
  useQuery({
    queryKey: keys.ranking(slug, "actors", page),
    queryFn: () => api.listActors(slug, UI.activityDays, page, UI.rankingPageSize),
    placeholderData: keepPreviousData,
    enabled,
    staleTime: 30_000,
  });

/** One page of every action over the overview's window, most frequent first; off until enabled. */
export const useActionRanking = (slug: string, page: number, enabled: boolean) =>
  useQuery({
    queryKey: keys.ranking(slug, "actions", page),
    queryFn: () => api.listActions(slug, UI.activityDays, page, UI.rankingPageSize),
    placeholderData: keepPreviousData,
    enabled,
    staleTime: 30_000,
  });

// ── Mutations ────────────────────────────────────────────────────────────────

/** Verification is an action the user starts, not cached data. */
export function useVerify(slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.verifyAudit(slug),
    onSuccess: (result) => qc.setQueryData(keys.lastVerification(slug), result),
  });
}

/**
 * The latest verification result for this audit in this session, if any. It is
 * only ever set by useVerify, never fetched by itself.
 */
export const useLastVerification = (slug: string) =>
  useQuery({
    queryKey: keys.lastVerification(slug),
    queryFn: (): Promise<import("@/lib/schemas").Verification> => {
      throw new Error("The last verification is set by running verification, never fetched.");
    },
    enabled: false,
    staleTime: Infinity,
  });

export function useCreateAudit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createAudit,
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.auditList }),
  });
}

export function useUpdateAudit(slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: api.UpdateAuditPayload) => api.updateAudit(slug, payload),
    onSuccess: (audit) => {
      qc.setQueryData(keys.audit(slug), audit);
      return qc.invalidateQueries({ queryKey: keys.auditList });
    },
  });
}

export function useSetArchived(slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (archived: boolean) =>
      archived ? api.archiveAudit(slug) : api.unarchiveAudit(slug),
    onSuccess: (audit) => {
      qc.setQueryData(keys.audit(slug), audit);
      return qc.invalidateQueries({ queryKey: keys.auditList });
    },
  });
}

export function useAuditKeyMutations(slug: string) {
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: keys.auditKeys(slug) });
  return {
    issue: useMutation({
      mutationFn: (type: "write" | "read") => api.issueAuditKey(slug, type),
      onSuccess: refresh,
    }),
    rotate: useMutation({
      mutationFn: (keyId: string) => api.rotateAuditKey(slug, keyId),
      onSuccess: refresh,
    }),
    revoke: useMutation({
      mutationFn: (keyId: string) => api.revokeAuditKey(slug, keyId),
      onSuccess: refresh,
    }),
  };
}

export function useAccountKeyMutations() {
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: keys.accountKeys });
  return {
    create: useMutation({ mutationFn: api.createAccountKey, onSuccess: refresh }),
    revoke: useMutation({ mutationFn: api.revokeAccountKey, onSuccess: refresh }),
  };
}
