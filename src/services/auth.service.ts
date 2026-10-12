/**
 * auth-api account and session calls. The refresh token never reaches this
 * code: auth-api sets and reads it as an httpOnly cookie.
 */
import { request, requestNoContent } from "@/lib/http-client";
import { TokenResponseSchema, UserSchema, type TokenResponse, type User } from "@/lib/schemas";
import { tokenStore } from "@/lib/token-store";

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  business_name: string;
}

export interface ChangePasswordPayload {
  current_password: string;
  new_password: string;
}

export async function login(payload: LoginPayload): Promise<TokenResponse> {
  const res = await request(
    {
      service: "auth",
      path: "/v1/auth/login",
      method: "POST",
      body: payload,
      errorMessage: "Sign in failed.",
    },
    TokenResponseSchema,
  );
  tokenStore.setAccessToken(res.access_token);
  return res;
}

export async function register(payload: RegisterPayload): Promise<TokenResponse> {
  const res = await request(
    {
      service: "auth",
      path: "/v1/auth/register",
      method: "POST",
      body: payload,
      errorMessage: "Could not create the account.",
    },
    TokenResponseSchema,
  );
  tokenStore.setAccessToken(res.access_token);
  return res;
}

/** Revokes this browser's refresh session on the server, then forgets the access token. */
export async function logout(): Promise<void> {
  try {
    await requestNoContent({
      service: "auth",
      path: "/v1/auth/logout",
      method: "POST",
      errorMessage: "Sign out failed.",
    });
  } finally {
    // Even if the server call failed, this tab must not keep acting as the user.
    tokenStore.clear();
  }
}

export function fetchMe(): Promise<User> {
  return request(
    { service: "auth", path: "/v1/auth/me", errorMessage: "Could not load your profile." },
    UserSchema,
  );
}

/** On success the server signs out every session, including this one. */
export function changePassword(payload: ChangePasswordPayload): Promise<void> {
  return requestNoContent({
    service: "auth",
    path: "/v1/auth/change-password",
    method: "POST",
    body: payload,
    errorMessage: "Could not change the password.",
  });
}
