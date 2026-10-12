import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  Activity,
  ArrowLeft,
  ChevronRight,
  KeyRound,
  LayoutDashboard,
  Loader2,
  Menu,
  Settings,
  ShieldCheck,
  User,
} from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAudit } from "@/hooks/useAudit";
import { useLogout } from "@/hooks/useAuthMutations";
import { tokenStore } from "@/lib/token-store";
import { cn } from "@/lib/utils";
import { StatusText } from "./common";

const sections = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "events", label: "Events", icon: Activity },
  { id: "integrity", label: "Integrity", icon: ShieldCheck },
  { id: "keys", label: "Keys", icon: KeyRound },
  { id: "settings", label: "Settings", icon: Settings },
] as const;

/** Re-renders when the user signs in or out. */
function useSignedIn() {
  return useSyncExternalStore(tokenStore.subscribe, tokenStore.isAuthenticated, () => false);
}

function Wordmark() {
  return (
    <Link to="/audits" className="flex items-center gap-2">
      <img src="/logo.png" alt="" width={28} height={28} className="size-7 object-contain" />
      <span className="text-[15px] font-semibold tracking-tight">Auditlogs</span>
    </Link>
  );
}

function ProfileMenu() {
  const logout = useLogout();
  const email = tokenStore.getEmail();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          aria-label="Open account menu"
          className="size-9 rounded-full bg-accent text-sm font-semibold text-accent-foreground hover:bg-secondary"
        >
          {email ? email.slice(0, 2).toUpperCase() : <User className="size-4" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="font-normal">
          <span className="block text-xs text-muted-foreground">Signed in as</span>
          <span className="block truncate font-medium">{email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/account">
            <User className="size-4" />
            Profile and password
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/account-keys">
            <KeyRound className="size-4" />
            Account keys
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={logout.isPending}
          onSelect={(e) => {
            e.preventDefault();
            logout.mutate();
          }}
        >
          {logout.isPending && <Loader2 className="size-4 animate-spin" />}
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function BackToAudits() {
  return (
    <Link
      to="/audits"
      className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="size-3.5" />
      All audits
    </Link>
  );
}

const linkBase =
  "flex h-9 items-center gap-3 rounded-md px-3 text-[13px] font-medium text-text-secondary hover:bg-secondary hover:text-foreground";
const linkActive = "bg-accent text-accent-foreground hover:bg-accent hover:text-accent-foreground";

function AuditNav({ slug, onNavigate }: { slug: string; onNavigate?: () => void }) {
  const path = useLocation().pathname;
  const audit = useAudit(slug);
  return (
    <>
      <div className="flex h-14 shrink-0 items-center border-b px-4">
        <Wordmark />
      </div>
      <div className="space-y-3 px-4 py-4">
        <BackToAudits />
        <div className="rounded-md border bg-muted px-3 py-2.5">
          <p className="truncate text-[13px] font-semibold" title={audit.data?.title}>
            {audit.data?.title ?? slug}
          </p>
          <p className="truncate font-mono text-xs text-muted-foreground">{slug}</p>
          {audit.data && (
            <StatusText value={audit.data.status} className="mt-1.5 text-xs text-text-secondary" />
          )}
        </div>
      </div>
      <nav className="flex-1 space-y-0.5 px-2" aria-label="Audit sections">
        {sections.map((s) => {
          const active = path.endsWith(`/${s.id}`);
          return (
            <Link
              key={s.id}
              to={`/audits/$slug/${s.id}` as "/audits/$slug/overview"}
              params={{ slug }}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(linkBase, active && linkActive)}
            >
              <s.icon className="size-4" />
              {s.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}

/** "Audits / <audit title> / <section>" so the top bar always says where you are. */
function Breadcrumb({ slug, section }: { slug: string; section: string | undefined }) {
  const audit = useAudit(slug);
  const label = sections.find((s) => s.id === section)?.label;
  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-[13px]">
      <Link to="/audits" className="hidden text-muted-foreground hover:text-foreground sm:inline">
        Audits
      </Link>
      <ChevronRight className="hidden size-3.5 shrink-0 text-muted-foreground sm:block" />
      <Link
        to="/audits/$slug/overview"
        params={{ slug }}
        className="truncate text-muted-foreground hover:text-foreground"
      >
        {audit.data?.title ?? slug}
      </Link>
      {label && (
        <>
          <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="truncate font-medium text-foreground" aria-current="page">
            {label}
          </span>
        </>
      )}
    </nav>
  );
}

const topLinks = [
  { to: "/audits", label: "Audits" },
  { to: "/account-keys", label: "Account keys" },
  { to: "/account", label: "Account" },
] as const;

/**
 * Sends a signed-out visitor to sign in, exactly once. The redirect runs in an
 * effect, never during render: a render-time <Navigate> re-issued the
 * navigation on every re-render while the session store and the router were
 * both updating, which locked the tab in a synchronous render loop.
 */
function useRedirectWhenSignedOut(signedIn: boolean) {
  const navigate = useNavigate();
  const redirected = useRef(false);
  useEffect(() => {
    if (signedIn) {
      redirected.current = false;
      return;
    }
    if (redirected.current) return;
    redirected.current = true;
    void navigate({ to: "/login", replace: true });
  }, [signedIn, navigate]);
}

/** Layout for every signed-in page. Signed-out visitors are sent to sign in. */
export function AppShell({ children }: { children: ReactNode }) {
  const signedIn = useSignedIn();
  const [open, setOpen] = useState(false);
  const path = useLocation().pathname;
  useRedirectWhenSignedOut(signedIn);
  if (!signedIn) {
    return (
      <p className="p-8 text-sm text-muted-foreground" role="status">
        Redirecting to sign in...
      </p>
    );
  }

  const [, section, slug, sub] = path.split("/");
  const auditSlug =
    section === "audits" && slug && slug !== "new" ? decodeURIComponent(slug) : null;

  if (auditSlug) {
    return (
      <div className="min-h-screen bg-canvas">
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r bg-card lg:flex">
          <AuditNav slug={auditSlug} />
        </aside>
        <div className="lg:pl-60">
          <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b bg-card px-4 lg:px-8">
            <div className="flex min-w-0 items-center gap-2">
              <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 lg:hidden"
                    aria-label="Open audit sections"
                  >
                    <Menu />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="flex w-64 flex-col bg-card p-0">
                  <SheetTitle className="sr-only">Audit sections</SheetTitle>
                  <AuditNav slug={auditSlug} onNavigate={() => setOpen(false)} />
                </SheetContent>
              </Sheet>
              <Breadcrumb slug={auditSlug} section={sub} />
            </div>
            <ProfileMenu />
          </header>
          <main className="mx-auto max-w-[1180px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            {children}
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas">
      <header className="sticky top-0 z-20 border-b bg-card">
        <div className="mx-auto flex h-14 max-w-[1180px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-6">
            <Wordmark />
            <nav className="hidden items-center gap-1 sm:flex" aria-label="Main">
              {topLinks.map((l) => {
                const active = path === l.to || (l.to === "/audits" && path === "/audits/new");
                return (
                  <Link
                    key={l.to}
                    to={l.to}
                    aria-current={active ? "page" : undefined}
                    className={cn("h-8 px-3", linkBase, active && linkActive)}
                  >
                    {l.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <ProfileMenu />
        </div>
      </header>
      <main className="mx-auto max-w-[1180px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
    </div>
  );
}
