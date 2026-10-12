import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  HeadContent,
  Link,
  Outlet,
  Scripts,
  createRootRouteWithContext,
  useRouter,
} from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { errorMessage } from "@/lib/api-error";
import { AUTH_API_URL } from "@/lib/env";
import { refreshSession, setUnauthenticatedHandler } from "@/lib/http-client";
import { isTransient, retryDelay } from "@/lib/query-client";
import { UI } from "@/lib/ui-config";
import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-5xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you are looking for does not exist or has moved.
        </p>
        <Button asChild className="mt-6">
          <Link to="/audits">Go to audits</Link>
        </Button>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: unknown; reset: () => void }) {
  const router = useRouter();
  console.error(error);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page did not load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {errorMessage(error, "Something went wrong.")}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button
            onClick={() => {
              router.invalidate();
              reset();
            }}
          >
            Try again
          </Button>
          <Button asChild variant="outline">
            <a href="/audits">Go to audits</a>
          </Button>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Auditlogs - tamper-evident audit logs" },
      { name: "description", content: "Tamper-evident audit logging for multi-tenant businesses." },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap",
      },
      { rel: "icon", href: "/logo.png", type: "image/png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

type SessionState =
  { phase: "restoring" } | { phase: "ready" } | { phase: "failed"; message: string };

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();
  const [session, setSession] = useState<SessionState>({ phase: "restoring" });

  useEffect(() => {
    setUnauthenticatedHandler(() => {
      queryClient.clear();
      void router.navigate({ to: "/login", search: { reason: "session-expired" } });
    });
  }, [router, queryClient]);

  // A reload loses the in-memory access token; the httpOnly refresh cookie
  // restores it. "No session" is a normal result (the user is signed out);
  // only an unreachable or misbehaving account service is an error. A
  // transient failure (for example auth-api still starting) is retried up to
  // UI.queryRetries times, each retry logged, before the error is shown.
  const restore = useCallback(async () => {
    setSession({ phase: "restoring" });
    for (let attempt = 0; ; attempt++) {
      try {
        await refreshSession();
        setSession({ phase: "ready" });
        return;
      } catch (e) {
        if (!isTransient(e) || attempt >= UI.queryRetries) {
          setSession({ phase: "failed", message: errorMessage(e) });
          return;
        }
        console.warn("Retrying session restore after a transient failure", {
          attempt: attempt + 1,
          maxRetries: UI.queryRetries,
          url: AUTH_API_URL,
          message: errorMessage(e),
        });
        await new Promise((r) => setTimeout(r, retryDelay(attempt + 1)));
      }
    }
  }, []);

  useEffect(() => {
    void restore();
  }, [restore]);

  if (session.phase === "restoring") {
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-background"
        role="status"
        aria-label="Restoring your session"
      >
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }
  if (session.phase === "failed") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold">Cannot reach the account service</h1>
          <p className="mt-2 text-sm text-muted-foreground">{session.message}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Tried <span className="font-mono">{AUTH_API_URL}</span>. If you just restarted it, wait
            until it is ready, then try again.
          </p>
          <Button className="mt-6" onClick={() => void restore()}>
            Try again
          </Button>
        </div>
      </div>
    );
  }
  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <Toaster position="bottom-right" />
    </QueryClientProvider>
  );
}
