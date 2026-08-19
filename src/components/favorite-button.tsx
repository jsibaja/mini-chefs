import { Heart } from "lucide-react";
import { useFavorites, useToggleFavorite } from "@/lib/favorites";
import { cn } from "@/lib/utils";

type Props = {
  recipeId: string;
  childId?: string | null;
  size?: "sm" | "md";
  className?: string;
  onClickCapture?: (e: React.MouseEvent) => void;
};

export function FavoriteButton({ recipeId, childId, size = "md", className, onClickCapture }: Props) {
  const { data: favs } = useFavorites();
  const toggle = useToggleFavorite();
  const isFav = !!favs?.some(
    (f) => f.recipe_id === recipeId && (childId ? f.child_id === childId : f.child_id === null),
  );
  const dims = size === "sm" ? "h-8 w-8" : "h-10 w-10";
  const icon = size === "sm" ? "h-4 w-4" : "h-5 w-5";
  return (
    <button
      type="button"
      aria-pressed={isFav}
      aria-label={isFav ? "Quitar de favoritos" : "Marcar como favorito"}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClickCapture?.(e);
        toggle.mutate({ recipeId, childId: childId ?? null });
      }}
      className={cn(
        "grid place-items-center rounded-full bg-background/95 shadow-soft backdrop-blur transition-transform hover:scale-105 active:scale-95",
        dims,
        className,
      )}
    >
      <Heart
        className={cn(icon, isFav ? "fill-coral text-coral" : "text-muted-foreground")}
        strokeWidth={2.2}
      />
    </button>
  );
}
