/**
 * Presentation choices for the dashboard (how much to show at once). These are
 * not business rules: the services enforce their own limits (for example
 * STATS_MAX_DAYS and the 200-row page cap) and reject anything above them.
 */
export const UI = {
  /** Events per page in the events table. */
  eventsPageSize: 50,
  /** Checkpoints per page on the integrity tab. */
  checkpointsPageSize: 20,
  /** Audits per page on the audits list. */
  auditsPageSize: 20,
  /** Keys per page on the audit keys and account keys tables. */
  keysPageSize: 20,
  /** Actors or actions per page in the "View all" rankings. */
  rankingPageSize: 20,
  /** Wait after the last keystroke before a text filter is applied, in milliseconds. */
  searchDebounceMs: 400,
  /** Days shown in the overview activity chart. */
  activityDays: 14,
  /** Top actions and actors listed on the overview. */
  activityTop: 8,
  /**
   * Extra attempts for a query that failed with a transient error (network,
   * 429, 502, 503, 504). Other failures (401, 404, 422) are never retried.
   */
  queryRetries: 2,
  /** Wait before each retry, in milliseconds; doubled on every further attempt. */
  retryDelayMs: 1000,
  /**
   * Longest wait for any single request, in milliseconds. Without it a service
   * that accepts the connection but never answers would leave a spinner forever.
   */
  requestTimeoutMs: 15000,
  /**
   * Longest wait for the next chunk of a streamed download (the CSV export),
   * in milliseconds. The whole download may take longer; only a stall fails it.
   */
  downloadIdleTimeoutMs: 30000,
  /** Characters of a long value shown in the event drawer before "Show all". */
  drawerValuePreviewChars: 120,
} as const;
