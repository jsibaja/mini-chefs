import { useState } from "react";
import { ChevronDown, Plus, Baby, Pencil } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { ageLabel, useActiveChild } from "@/lib/active-child";

/** Chip compacto para cambiar de hijo activo en la cabecera. */
export function ChildSwitcher() {
  const { children, active, setActive } = useActiveChild();
  const [open, setOpen] = useState(false);

  if (!children || children.length === 0) {
    return (
      <Link
        to="/onboarding"
        className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary"
      >
        <Plus className="h-3.5 w-3.5" />
        Agregar hijo
      </Link>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-2 rounded-full bg-card px-3 py-1.5 text-xs font-semibold text-foreground shadow-soft"
      >
        <Baby className="h-4 w-4 text-primary" />
        <span className="max-w-[8rem] truncate">{active?.name ?? "Elegir hijo"}</span>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-56 rounded-2xl border border-border bg-card p-2 shadow-lift">
          {children.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                setActive(c.id);
                setOpen(false);
              }}
              className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm transition-colors ${
                active?.id === c.id ? "bg-primary/10 text-primary" : "hover:bg-accent"
              }`}
            >
              <span className="truncate">{c.name}</span>
              <span className="text-[11px] text-muted-foreground">{ageLabel(c.ageMonths)}</span>
            </button>
          ))}
          <div className="mt-1 border-t border-border pt-1">
            <Link
              to="/hijos"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-foreground hover:bg-accent"
            >
              <Pencil className="h-4 w-4" /> Administrar hijos
            </Link>
            <Link
              to="/onboarding"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-primary hover:bg-primary/10"
            >
              <Plus className="h-4 w-4" /> Agregar hijo
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
