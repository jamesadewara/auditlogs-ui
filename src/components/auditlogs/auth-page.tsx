import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLogin, useRegister } from "@/hooks/useAuthMutations";
import { ApiError, errorMessage } from "@/lib/api-error";
import { LIMITS, v, useValidatedForm, type Rules } from "@/lib/validation";
import { Field } from "./common";

type Values = { business: string; email: string; password: string };

/**
 * Sign in and registration. There is no "forgot password" flow: resetting a
 * password needs a verified email channel, which the platform does not have yet.
 */
export function AuthPage({ mode, notice }: { mode: "login" | "register"; notice?: string }) {
  const navigate = useNavigate();
  const isLogin = mode === "login";
  const login = useLogin();
  const register = useRegister();
  const [show, setShow] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const rules: Rules<Values> = isLogin
    ? { email: v.email, password: v.required("your password") }
    : {
        business: v.text("a business name", 2, LIMITS.businessName),
        email: v.email,
        password: v.required("a password"),
      };
  const f = useValidatedForm<Values>({ business: "", email: "", password: "" }, rules);
  const busy = login.isPending || register.isPending;

  const onSubmit = f.submit(async (values) => {
    setFailure(null);
    try {
      if (isLogin)
        await login.mutateAsync({ email: values.email.trim(), password: values.password });
      else
        await register.mutateAsync({
          email: values.email.trim(),
          password: values.password,
          business_name: values.business.trim(),
        });
      await navigate({ to: "/audits" });
    } catch (e) {
      const fields =
        e instanceof ApiError
          ? { ...e.fields, ...(e.fields.business_name ? { business: e.fields.business_name } : {}) }
          : {};
      if (!f.applyServerErrors(fields)) setFailure(errorMessage(e));
    }
  });

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted px-4 py-8">
      <img src="/logo.png" alt="Auditlogs" className="mb-4 size-16 object-contain" />
      <form
        noValidate
        className="w-full max-w-[400px] space-y-4 rounded-lg border bg-card p-6 shadow-sm sm:p-8"
        onSubmit={onSubmit}
      >
        <h1 className="pb-2 text-2xl font-semibold">{isLogin ? "Sign in" : "Create account"}</h1>
        {notice && <p className="rounded-md bg-muted p-3 text-sm text-text-secondary">{notice}</p>}
        {!isLogin && (
          <Field label="Business name" htmlFor="business" error={f.error("business")}>
            <Input
              id="business"
              name="business"
              autoComplete="organization"
              className="h-10"
              {...f.bind("business")}
              onChange={(e) => f.set("business", e.target.value)}
            />
          </Field>
        )}
        <Field label="Email" htmlFor="email" error={f.error("email")}>
          <Input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
            className="h-10"
            {...f.bind("email")}
            onChange={(e) => f.set("email", e.target.value)}
          />
        </Field>
        <Field
          label="Password"
          htmlFor="password"
          error={f.error("password")}
          helper={isLogin ? undefined : "The service enforces its minimum length."}
        >
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={show ? "text" : "password"}
              autoComplete={isLogin ? "current-password" : "new-password"}
              className="h-10 pr-20"
              {...f.bind("password")}
              onChange={(e) => f.set("password", e.target.value)}
            />
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShow((s) => !s)}
              className="absolute inset-y-0 right-0 h-10 px-3 text-xs text-muted-foreground"
            >
              {show ? "Hide" : "Show"}
            </Button>
          </div>
        </Field>
        {failure && (
          <p role="alert" className="text-sm text-danger">
            {failure}
          </p>
        )}
        <Button type="submit" className="h-10 w-full" disabled={busy}>
          {busy ? "Please wait..." : isLogin ? "Sign in" : "Create account"}
        </Button>
        <p className="text-center text-text-secondary">
          {isLogin ? "No account yet? " : "Already have an account? "}
          <Link
            to={isLogin ? "/register" : "/login"}
            className="font-medium text-primary hover:underline"
          >
            {isLogin ? "Create account" : "Sign in"}
          </Link>
        </p>
      </form>
    </div>
  );
}
