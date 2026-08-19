import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Search,
  Users,
  CheckCircle2,
  XCircle,
  CreditCard,
  Pencil,
  Trash2,
  Plus,
  Power,
  X,
  ShieldCheck,
} from "lucide-react";
import {
  useAdminActions,
  useAdminStats,
  useAdminUsers,
  useMyRole,
  useMyUserId,
  type AdminUser,
} from "@/lib/admin";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [{ title: "Administración · MiniChefs" }, { name: "robots", content: "noindex" }],
  }),
  component: AdminPage,
});

const PLANES = [
  { code: "mensual", label: "Mensual" },
  { code: "anual", label: "Anual" },
];
const ESTADOS = [
  { code: "activa", label: "Activa" },
  { code: "pendiente", label: "Pendiente" },
  { code: "vencida", label: "Vencida" },
  { code: "cancelada", label: "Cancelada" },
];

function fecha(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

function AdminPage() {
  const navigate = useNavigate();
  const { data: myRole, isLoading: roleLoading } = useMyRole();
  const isStaff = myRole === "owner" || myRole === "admin";
  const isOwner = myRole === "owner";

  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirmDel, setConfirmDel] = useState<AdminUser | null>(null);

  const statsQ = useAdminStats();
  const usersQ = useAdminUsers(search);
  const A = useAdminActions();
  const { data: myId } = useMyUserId();

  // Quien no es staff no entra.
  useEffect(() => {
    if (!roleLoading && !isStaff) navigate({ to: "/hoy", replace: true });
  }, [roleLoading, isStaff, navigate]);

  if (roleLoading) return <div className="p-6 text-muted-foreground">Verificando permisos…</div>;
  if (!isStaff) return null;

  const s = statsQ.data;
  const users = usersQ.data ?? [];

  return (
    <div className="mx-auto max-w-6xl px-5 pb-16 pt-6 lg:pt-10">
      <header>
        <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
          <ShieldCheck className="h-4 w-4" /> Panel de administración
        </p>
        <h1 className="mt-1 font-display text-3xl font-bold text-deep-green">Usuarios y accesos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Activa o desactiva accesos, edita planes y administra cuentas. Entras como{" "}
          <strong className="text-foreground">{myRole}</strong>.
        </p>
      </header>

      {/* Dashboard */}
      <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Users}
          tone="text-primary"
          label="Usuarios totales"
          value={s?.usuarios_total ?? "—"}
          hint={s ? `+${s.nuevos_7d} en los últimos 7 días` : ""}
        />
        <StatCard
          icon={CheckCircle2}
          tone="text-primary"
          label="Suscriptores activos"
          value={s?.activos ?? "—"}
          hint={s ? `${s.de_pago} de pago` : ""}
        />
        <StatCard
          icon={XCircle}
          tone="text-destructive"
          label="Inactivos"
          value={s?.inactivos ?? "—"}
          hint="sin acceso"
        />
        <StatCard
          icon={CreditCard}
          tone="text-carrot"
          label="Por plan"
          value={
            s
              ? PLANES.map((p) => s.por_plan?.[p.label] ?? 0).reduce((a, b) => a + b, 0)
              : "—"
          }
          hint={
            s
              ? PLANES.map((p) => `${p.label}: ${s.por_plan?.[p.label] ?? 0}`).join(" · ")
              : ""
          }
        />
      </section>

      {/* Buscador + nuevo usuario */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por correo o nombre…"
            className="w-full rounded-full border border-input bg-background py-2.5 pl-10 pr-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="inline-flex flex-none items-center justify-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-warm transition-transform hover:-translate-y-0.5"
        >
          <Plus className="h-4 w-4" /> Nuevo usuario
        </button>
      </div>

      {/* Tabla */}
      <div className="mt-4 overflow-x-auto rounded-3xl bg-card shadow-soft">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="p-4 font-semibold">Usuario</th>
              <th className="p-4 font-semibold">Plan</th>
              <th className="p-4 font-semibold">Estado</th>
              <th className="p-4 font-semibold">Rol</th>
              <th className="p-4 font-semibold">Alta</th>
              <th className="p-4 text-right font-semibold">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {usersQ.isLoading && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-muted-foreground">
                  Cargando usuarios…
                </td>
              </tr>
            )}
            {!usersQ.isLoading && users.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-muted-foreground">
                  No hay usuarios que coincidan con la búsqueda.
                </td>
              </tr>
            )}
            {users.map((u) => {
              const activa = u.status === "activa";
              // Nunca ofrecer acciones destructivas sobre la propia cuenta ni
              // sobre un owner: el proyecto debe quedar siempre con alguien a cargo.
              const esYo = u.user_id === myId;
              const esOwner = u.role === "owner";
              const puedeDesactivar = !esYo && !esOwner;
              const puedeEliminar = !esYo && !esOwner;
              return (
                <tr key={u.user_id} className="border-b border-border/60 last:border-0">
                  <td className="p-4">
                    <p className="font-semibold text-foreground">
                      {u.display_name || "Sin nombre"}
                      {esYo && (
                        <span className="ml-2 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">
                          tú
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </td>
                  <td className="p-4">
                    {u.plan_name ?? <span className="text-muted-foreground">—</span>}
                    {u.is_paid && (
                      <span className="ml-1.5 rounded-full bg-mint/60 px-2 py-0.5 text-[10px] font-bold text-deep-green">
                        de pago
                      </span>
                    )}
                  </td>
                  <td className="p-4">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                        activa
                          ? "bg-mint/60 text-deep-green"
                          : u.status === "sin_suscripcion"
                            ? "bg-muted text-muted-foreground"
                            : "bg-safety-soft text-safety"
                      }`}
                    >
                      {activa ? "Activa" : u.status === "sin_suscripcion" ? "Sin acceso" : u.status}
                    </span>
                    {activa && u.current_period_end && (
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        hasta {fecha(u.current_period_end)}
                      </p>
                    )}
                  </td>
                  <td className="p-4">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                        u.role === "owner"
                          ? "bg-carrot/25 text-carrot"
                          : u.role === "admin"
                            ? "bg-primary/15 text-primary"
                            : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="p-4 text-muted-foreground">{fecha(u.created_at)}</td>
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-1.5">
                      {puedeDesactivar ? (
                        <button
                          type="button"
                          onClick={() =>
                            A.setAccess.mutate(
                              { userId: u.user_id, active: !activa, planCode: u.plan_code ?? "mensual" },
                              {
                                onSuccess: () =>
                                  toast.success(activa ? "Acceso desactivado" : "Acceso activado"),
                                onError: (e: any) => toast.error(e.message ?? "No se pudo cambiar"),
                              },
                            )
                          }
                          disabled={A.setAccess.isPending}
                          title={activa ? "Desactivar acceso" : "Activar acceso"}
                          className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 ${
                            activa
                              ? "border border-input bg-background text-foreground hover:bg-accent"
                              : "bg-primary text-primary-foreground"
                          }`}
                        >
                          <Power className="h-3.5 w-3.5" />
                          {activa ? "Desactivar" : "Activar"}
                        </button>
                      ) : (
                        <span className="rounded-full bg-muted px-3 py-1.5 text-xs font-semibold text-muted-foreground">
                          {esYo ? "Tu cuenta" : "Cuenta owner"}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => setEditing(u)}
                        aria-label={`Editar ${u.email}`}
                        className="grid h-8 w-8 place-items-center rounded-full border border-input bg-background text-foreground hover:bg-accent"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      {puedeEliminar && (
                        <button
                          type="button"
                          onClick={() => setConfirmDel(u)}
                          aria-label={`Eliminar ${u.email}`}
                          className="grid h-8 w-8 place-items-center rounded-full border border-destructive/30 bg-background text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editing && (
        <EditUserModal
          user={editing}
          isOwner={isOwner}
          esYo={editing.user_id === myId}
          onClose={() => setEditing(null)}
          actions={A}
        />
      )}
      {creating && <CreateUserModal isOwner={isOwner} onClose={() => setCreating(false)} actions={A} />}
      {confirmDel && (
        <Modal title="Eliminar cuenta" onClose={() => setConfirmDel(null)}>
          <p className="text-sm text-foreground">
            ¿Eliminar la cuenta de <strong>{confirmDel.email}</strong>? Se borran sus hijos, planes y
            datos. Esta acción no se puede deshacer.
          </p>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() =>
                A.deleteUser.mutate(confirmDel.user_id, {
                  onSuccess: () => {
                    toast.success("Cuenta eliminada");
                    setConfirmDel(null);
                  },
                  onError: (e: any) => toast.error(e.message ?? "No se pudo eliminar"),
                })
              }
              disabled={A.deleteUser.isPending}
              className="flex-1 rounded-full bg-destructive px-5 py-3 text-sm font-semibold text-destructive-foreground disabled:opacity-60"
            >
              {A.deleteUser.isPending ? "Eliminando…" : "Sí, eliminar"}
            </button>
            <button
              type="button"
              onClick={() => setConfirmDel(null)}
              className="rounded-full border border-input bg-background px-5 py-3 text-sm font-semibold text-foreground hover:bg-accent"
            >
              Cancelar
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  tone,
  label,
  value,
  hint,
}: {
  icon: typeof Users;
  tone: string;
  label: string;
  value: number | string;
  hint?: string;
}) {
  return (
    <div className="rounded-3xl bg-card p-5 shadow-soft">
      <div className={`flex items-center gap-2 ${tone}`}>
        <Icon className="h-5 w-5" />
        <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-2 font-display text-3xl font-bold text-deep-green">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center lg:items-center">
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onClose}
        className="absolute inset-0 bg-deep-green/40 backdrop-blur-sm"
      />
      <div className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-background p-5 shadow-lift lg:rounded-3xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl font-bold text-deep-green">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="grid h-9 w-9 place-items-center rounded-full bg-card text-foreground shadow-soft hover:bg-accent"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const inputCls =
  "mt-1 w-full rounded-2xl border border-input bg-background px-4 py-3 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

function EditUserModal({
  user,
  isOwner,
  esYo,
  onClose,
  actions: A,
}: {
  user: AdminUser;
  isOwner: boolean;
  esYo: boolean;
  onClose: () => void;
  actions: ReturnType<typeof useAdminActions>;
}) {
  const [name, setName] = useState(user.display_name ?? "");
  const [plan, setPlan] = useState(user.plan_code ?? "mensual");
  const [status, setStatus] = useState(user.status === "sin_suscripcion" ? "pendiente" : user.status);
  const [role, setRole] = useState(user.role);
  const [email, setEmail] = useState(user.email);
  const [password, setPassword] = useState("");

  const guardar = () => {
    A.updateUser.mutate(
      {
        userId: user.user_id,
        displayName: name,
        planCode: plan,
        status,
        role: isOwner && role !== user.role ? role : null,
      },
      {
        onSuccess: () => {
          toast.success("Cambios guardados");
          onClose();
        },
        onError: (e: any) => toast.error(e.message ?? "No se pudo guardar"),
      },
    );
  };

  return (
    <Modal title="Editar usuario" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="text-sm font-semibold">Nombre</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-semibold">Plan</label>
            <select value={plan} onChange={(e) => setPlan(e.target.value)} className={inputCls}>
              {PLANES.map((p) => (
                <option key={p.code} value={p.code}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold">Estado</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as any)} className={inputCls}>
              {ESTADOS.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="text-sm font-semibold">Rol</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as any)}
            disabled={!isOwner || esYo}
            className={`${inputCls} disabled:opacity-60`}
          >
            <option value="user">user</option>
            <option value="admin">admin</option>
            <option value="owner">owner</option>
          </select>
          {esYo ? (
            <p className="mt-1 text-xs text-muted-foreground">
              No puedes cambiar tu propio rol: alguien debe quedar a cargo del panel.
            </p>
          ) : (
            !isOwner && (
              <p className="mt-1 text-xs text-muted-foreground">Solo el owner puede cambiar roles.</p>
            )
          )}
        </div>

        <button
          type="button"
          onClick={guardar}
          disabled={A.updateUser.isPending}
          className="w-full rounded-full bg-primary px-5 py-3.5 text-base font-semibold text-primary-foreground shadow-warm disabled:opacity-60"
        >
          {A.updateUser.isPending ? "Guardando…" : "Guardar cambios"}
        </button>

        {/* Credenciales: van por la Edge Function (service_role) */}
        <div className="space-y-3 border-t border-border pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Credenciales
          </p>
          <div>
            <label className="text-sm font-semibold">Correo</label>
            <div className="flex gap-2">
              <input value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
              <button
                type="button"
                onClick={() =>
                  A.updateEmail.mutate(
                    { userId: user.user_id, email },
                    {
                      onSuccess: () => toast.success("Correo actualizado"),
                      onError: (e: any) => toast.error(e.message ?? "No se pudo cambiar el correo"),
                    },
                  )
                }
                disabled={A.updateEmail.isPending || email === user.email}
                className="mt-1 flex-none rounded-2xl border border-input bg-background px-4 text-sm font-semibold text-foreground hover:bg-accent disabled:opacity-50"
              >
                Cambiar
              </button>
            </div>
          </div>
          <div>
            <label className="text-sm font-semibold">Nueva contraseña</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="mínimo 6 caracteres"
                className={inputCls}
              />
              <button
                type="button"
                onClick={() =>
                  A.updatePassword.mutate(
                    { userId: user.user_id, password },
                    {
                      onSuccess: () => {
                        toast.success("Contraseña actualizada");
                        setPassword("");
                      },
                      onError: (e: any) => toast.error(e.message ?? "No se pudo cambiar"),
                    },
                  )
                }
                disabled={A.updatePassword.isPending || password.length < 6}
                className="mt-1 flex-none rounded-2xl border border-input bg-background px-4 text-sm font-semibold text-foreground hover:bg-accent disabled:opacity-50"
              >
                Cambiar
              </button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function CreateUserModal({
  isOwner,
  onClose,
  actions: A,
}: {
  isOwner: boolean;
  onClose: () => void;
  actions: ReturnType<typeof useAdminActions>;
}) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [plan, setPlan] = useState("mensual");
  const [role, setRole] = useState("user");
  // Al crear la cuenta mostramos los accesos listos para enviar (todavía no hay
  // correo automático: el admin se los comparte a la persona).
  const [creada, setCreada] = useState<{ email: string; password: string; name: string } | null>(null);

  const mensaje = creada
    ? `¡Hola${creada.name ? " " + creada.name : ""}! Ya tienes acceso a MiniChefs 🥕\n\n` +
      `Entra aquí: ${typeof window !== "undefined" ? window.location.origin : ""}/auth\n` +
      `Correo: ${creada.email}\n` +
      `Contraseña: ${creada.password}\n\n` +
      `Te recomendamos cambiar la contraseña desde Ajustes → Mi cuenta.`
    : "";

  if (creada) {
    return (
      <Modal title="¡Cuenta creada!" onClose={onClose}>
        <div className="space-y-4">
          <div className="rounded-2xl bg-mint/30 p-4">
            <p className="text-sm text-deep-green">
              La cuenta de <strong>{creada.email}</strong> ya está activa y lista para entrar.
              Todavía no se envían correos automáticos, así que <strong>compártele estos accesos</strong>.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Mensaje listo para enviar
            </p>
            <pre className="mt-2 whitespace-pre-wrap break-words font-sans text-sm text-foreground">
              {mensaje}
            </pre>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(mensaje);
                toast.success("Mensaje copiado");
              }}
              className="rounded-full border border-input bg-background px-5 py-3 text-sm font-semibold text-foreground hover:bg-accent"
            >
              Copiar mensaje
            </button>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(mensaje)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-soft"
            >
              Enviar por WhatsApp
            </a>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-full px-5 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
          >
            Cerrar
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="Nuevo usuario" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="text-sm font-semibold">Correo</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="correo@ejemplo.com"
            autoComplete="off"
            className={inputCls}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Con este correo entrará a la app. Debe ser uno real y suyo.
          </p>
        </div>
        <div>
          <label className="text-sm font-semibold">Nombre</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="text-sm font-semibold">Contraseña</label>
          <input
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="mínimo 6 caracteres"
            className={inputCls}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-semibold">Plan</label>
            <select value={plan} onChange={(e) => setPlan(e.target.value)} className={inputCls}>
              <option value="">Sin acceso</option>
              {PLANES.map((p) => (
                <option key={p.code} value={p.code}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold">Rol</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              disabled={!isOwner}
              className={`${inputCls} disabled:opacity-60`}
            >
              <option value="user">user</option>
              <option value="admin">admin</option>
            </select>
          </div>
        </div>
        <button
          type="button"
          onClick={() =>
            A.createUser.mutate(
              {
                email,
                password,
                display_name: name || undefined,
                plan_code: plan || undefined,
                role: role !== "user" ? role : undefined,
              },
              {
                onSuccess: () => {
                  toast.success("Usuario creado");
                  setCreada({ email, password, name });
                },
                onError: (e: any) => toast.error(e.message ?? "No se pudo crear"),
              },
            )
          }
          disabled={A.createUser.isPending || !email.includes("@") || password.length < 6}
          className="w-full rounded-full bg-primary px-5 py-3.5 text-base font-semibold text-primary-foreground shadow-warm disabled:opacity-60"
        >
          {A.createUser.isPending ? "Creando…" : "Crear usuario"}
        </button>
        <p className="text-xs text-muted-foreground">
          La cuenta queda confirmada y lista para entrar. Al crearla te damos el mensaje con sus
          accesos, listo para enviárselo por WhatsApp.
        </p>
      </div>
    </Modal>
  );
}
