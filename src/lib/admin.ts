import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AdminUser = {
  user_id: string;
  email: string;
  display_name: string | null;
  role: "owner" | "admin" | "user";
  plan_name: string | null;
  plan_code: string | null;
  status: "activa" | "pendiente" | "vencida" | "cancelada" | "sin_suscripcion";
  current_period_end: string | null;
  created_at: string;
  is_paid: boolean;
};

export type AdminStats = {
  usuarios_total: number;
  nuevos_7d: number;
  activos: number;
  de_pago: number;
  inactivos: number;
  por_plan: Record<string, number>;
};

/** Id del usuario actual (para no ofrecerle acciones sobre su propia cuenta). */
export function useMyUserId() {
  return useQuery({
    queryKey: ["my-user-id"],
    queryFn: async (): Promise<string | null> => {
      const { data } = await supabase.auth.getUser();
      return data.user?.id ?? null;
    },
    staleTime: 10 * 60 * 1000,
  });
}

/** Rol del usuario actual (para mostrar u ocultar el panel). */
export function useMyRole() {
  return useQuery({
    queryKey: ["my-role"],
    queryFn: async (): Promise<string> => {
      const { data, error } = await supabase.rpc("my_role");
      if (error) return "user";
      return (data as string) ?? "user";
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useIsStaff() {
  const q = useMyRole();
  return { ...q, isStaff: q.data === "owner" || q.data === "admin" };
}

export function useAdminStats() {
  return useQuery({
    queryKey: ["admin-stats"],
    queryFn: async (): Promise<AdminStats> => {
      const { data, error } = await supabase.rpc("admin_stats");
      if (error) throw error;
      return data as AdminStats;
    },
  });
}

export function useAdminUsers(search: string) {
  return useQuery({
    queryKey: ["admin-users", search],
    queryFn: async (): Promise<AdminUser[]> => {
      const { data, error } = await supabase.rpc("admin_list_users", { _search: search || undefined });
      if (error) throw error;
      return (data ?? []) as AdminUser[];
    },
  });
}

/**
 * Operaciones de cuenta (crear, eliminar, correo, contraseña).
 * Van por funciones de base de datos SECURITY DEFINER que validan el rol del
 * llamador antes de actuar: el navegador nunca maneja claves de servicio.
 */
async function callAdminRpc(fn: string, args: Record<string, unknown>) {
  const rpc = supabase.rpc as unknown as (
    name: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
  const { data, error } = await rpc(fn, args);
  if (error) throw new Error(error.message);
  return data as { ok?: boolean; user_id?: string };
}

export function useAdminActions() {
  const qc = useQueryClient();
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-users"] });
    qc.invalidateQueries({ queryKey: ["admin-stats"] });
  };

  const setAccess = useMutation({
    mutationFn: async (v: { userId: string; active: boolean; planCode?: string }) => {
      const { error } = await supabase.rpc("admin_set_access", {
        _user_id: v.userId,
        _active: v.active,
        _plan_code: v.planCode ?? undefined,
      });
      if (error) throw error;
    },
    onSuccess: refresh,
  });

  const updateUser = useMutation({
    mutationFn: async (v: {
      userId: string;
      displayName?: string | null;
      planCode?: string | null;
      status?: string | null;
      role?: string | null;
    }) => {
      const { error } = await supabase.rpc("admin_update_user", {
        _user_id: v.userId,
        _display_name: v.displayName ?? undefined,
        _plan_code: v.planCode ?? undefined,
        _status: v.status ?? undefined,
        _role: v.role ?? undefined,
      });
      if (error) throw error;
    },
    onSuccess: refresh,
  });

  const createUser = useMutation({
    mutationFn: (v: {
      email: string;
      password: string;
      display_name?: string;
      plan_code?: string;
      role?: string;
    }) =>
      callAdminRpc("admin_create_user", {
        _email: v.email,
        _password: v.password,
        _display_name: v.display_name ?? null,
        _plan_code: v.plan_code ?? null,
        _role: v.role ?? undefined,
      }),
    onSuccess: refresh,
  });

  const deleteUser = useMutation({
    mutationFn: (userId: string) => callAdminRpc("admin_delete_user", { _user_id: userId }),
    onSuccess: refresh,
  });

  const updateEmail = useMutation({
    mutationFn: (v: { userId: string; email: string }) =>
      callAdminRpc("admin_change_email", { _user_id: v.userId, _email: v.email }),
    onSuccess: refresh,
  });

  const updatePassword = useMutation({
    mutationFn: (v: { userId: string; password: string }) =>
      callAdminRpc("admin_change_password", { _user_id: v.userId, _password: v.password }),
    onSuccess: refresh,
  });

  return { setAccess, updateUser, createUser, deleteUser, updateEmail, updatePassword };
}
