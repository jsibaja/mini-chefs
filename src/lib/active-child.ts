import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "minichefs.active_child_id";

export type ChildSummary = {
  id: string;
  name: string;
  birth_date: string;
  gestational_weeks: number | null;
  school_nut_free: boolean;
  has_thermal_lunchbox: boolean;
  mini_chef_level: number;
  mini_chef_xp: number;
  ageMonths: number;
  allergen_codes: string[];
  avoid_ingredient_ids: string[];
};

/** Etiqueta de edad legible: meses hasta los 2 años, luego años. */
export function ageLabel(months: number): string {
  if (months < 24) return `${months} ${months === 1 ? "mes" : "meses"}`;
  const years = Math.floor(months / 12);
  return `${years} ${years === 1 ? "año" : "años"}`;
}

/** Edad corregida solo hasta 24 meses si es prematuro (<37 semanas). */
export function monthsBetween(birth: string, gestational_weeks: number | null): number {
  // Parseo LOCAL de 'YYYY-MM-DD' (new Date(iso) interpreta UTC y desplaza un día en LatAm).
  const [y, m, d] = birth.split("-").map(Number);
  const b = new Date(y, (m ?? 1) - 1, d ?? 1);
  const now = new Date();
  let months =
    (now.getFullYear() - b.getFullYear()) * 12 + (now.getMonth() - b.getMonth());
  if (now.getDate() < b.getDate()) months -= 1;
  if (months < 0) months = 0;
  if (gestational_weeks && gestational_weeks < 37 && months < 24) {
    const weeksMissing = 40 - gestational_weeks;
    const monthsMissing = Math.round(weeksMissing / 4.345);
    months = Math.max(0, months - monthsMissing);
  }
  return months;
}

export function useChildren() {
  return useQuery({
    queryKey: ["children"],
    queryFn: async (): Promise<ChildSummary[]> => {
      const { data: children, error } = await supabase
        .from("children")
        .select(
          "id, name, birth_date, gestational_weeks, school_nut_free, has_thermal_lunchbox, mini_chef_level, mini_chef_xp, child_allergens(allergens(code)), child_food_preferences(ingredient_id, preference)",
        )
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (children ?? []).map((c: any) => ({
        id: c.id,
        name: c.name,
        birth_date: c.birth_date,
        gestational_weeks: c.gestational_weeks,
        school_nut_free: !!c.school_nut_free,
        has_thermal_lunchbox: !!c.has_thermal_lunchbox,
        mini_chef_level: c.mini_chef_level ?? 1,
        mini_chef_xp: c.mini_chef_xp ?? 0,
        ageMonths: monthsBetween(c.birth_date, c.gestational_weeks),
        allergen_codes: (c.child_allergens ?? [])
          .map((ca: any) => ca.allergens?.code)
          .filter(Boolean) as string[],
        avoid_ingredient_ids: (c.child_food_preferences ?? [])
          .filter((p: any) => p.preference === "no_come")
          .map((p: any) => p.ingredient_id)
          .filter(Boolean) as string[],
      }));
    },
  });
}

const ACTIVE_EVENT = "minichefs:active-child";

export function useActiveChild() {
  const { data: children, isLoading } = useChildren();
  const [activeId, setActiveId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(STORAGE_KEY);
  });

  // Mantener sincronizadas TODAS las instancias del hook (header, páginas):
  // cambiar de hijo en un lugar actualiza el resto vía evento.
  useEffect(() => {
    const sync = () => setActiveId(window.localStorage.getItem(STORAGE_KEY));
    window.addEventListener(ACTIVE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(ACTIVE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  useEffect(() => {
    if (!children || children.length === 0) return;
    if (!activeId || !children.find((c) => c.id === activeId)) {
      const first = children[0].id;
      setActiveId(first);
      if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, first);
    }
  }, [children, activeId]);

  const setActive = (id: string) => {
    setActiveId(id);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, id);
      window.dispatchEvent(new Event(ACTIVE_EVENT));
    }
  };

  const active = children?.find((c) => c.id === activeId) ?? children?.[0] ?? null;
  return { children: children ?? [], active, setActive, isLoading };
}

export function useEntitlement() {
  return useQuery({
    queryKey: ["entitlement"],
    queryFn: async () => {
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes.user) return { hasActive: false };
      const { data, error } = await supabase.rpc("has_active_subscription", {
        _user_id: userRes.user.id,
      });
      if (error) throw error;
      return { hasActive: !!data };
    },
  });
}
