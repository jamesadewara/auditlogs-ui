import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";

import { keys } from "@/hooks/useAudit";
import { changePassword, fetchMe, login, logout, register, updateProfile } from "@/services/auth.service";

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: login, onSuccess: () => qc.clear() });
}

export function useRegister() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: register, onSuccess: () => qc.clear() });
}

export function useLogout() {
  const qc = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: logout,
    // The local session is cleared by logout() whether or not the server call worked.
    onSettled: () => {
      qc.clear();
      return router.navigate({ to: "/login" });
    },
  });
}

export const useMe = () => useQuery({ queryKey: keys.me, queryFn: fetchMe, staleTime: 60_000 });

export function useChangePassword() {
  const qc = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: changePassword,
    // The server signs out every session after a password change, including this one.
    onSuccess: async () => {
      await logout().catch(() => undefined);
      qc.clear();
      return router.navigate({ to: "/login", search: { reason: "password-changed" } });
    },
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateProfile,
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.me }),
  });
}
