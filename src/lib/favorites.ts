import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

async function getUserId() {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export function useFavorites() {
  return useQuery({
    queryKey: ["favorites"],
    queryFn: async () => {
      const uid = await getUserId();
      if (!uid) return [] as { id: string; recipe_id: string; child_id: string | null }[];
      const { data, error } = await supabase
        .from("favorites")
        .select("id, recipe_id, child_id")
        .eq("user_id", uid);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useToggleFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ recipeId, childId }: { recipeId: string; childId?: string | null }) => {
      const uid = await getUserId();
      if (!uid) throw new Error("No autenticado");
      const child = childId ?? null;
      let q = supabase
        .from("favorites")
        .select("id")
        .eq("user_id", uid)
        .eq("recipe_id", recipeId);
      q = child ? q.eq("child_id", child) : q.is("child_id", null);
      const { data: existing, error: e1 } = await q.maybeSingle();
      if (e1) throw e1;
      if (existing) {
        const { error } = await supabase.from("favorites").delete().eq("id", existing.id);
        if (error) throw error;
        return { favorited: false };
      }
      const { error } = await supabase
        .from("favorites")
        .insert({ user_id: uid, recipe_id: recipeId, child_id: child });
      if (error) throw error;
      return { favorited: true };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["favorites"] }),
  });
}

export function useRecipeNote(recipeId: string | undefined) {
  return useQuery({
    queryKey: ["recipe-note", recipeId],
    enabled: !!recipeId,
    queryFn: async () => {
      const uid = await getUserId();
      if (!uid || !recipeId) return null;
      const { data, error } = await supabase
        .from("recipe_notes")
        .select("id, note, updated_at")
        .eq("user_id", uid)
        .eq("recipe_id", recipeId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useSaveRecipeNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ recipeId, note }: { recipeId: string; note: string }) => {
      const uid = await getUserId();
      if (!uid) throw new Error("No autenticado");
      const { error } = await supabase
        .from("recipe_notes")
        .upsert(
          { user_id: uid, recipe_id: recipeId, note },
          { onConflict: "user_id,recipe_id" },
        );
      if (error) throw error;
    },
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ["recipe-note", vars.recipeId] }),
  });
}
