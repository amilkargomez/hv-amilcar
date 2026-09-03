import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/amilcargomez")({
  component: LoginPage,
  head: () => ({ meta: [{ title: "Acceso administrador" }] }),
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      navigate({ to: "/admin" });
    } catch (err: any) {
      setError(err.message || "Error de autenticación");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 rounded-xl border bg-card p-6 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Panel administrador</h1>
          <p className="text-sm text-muted-foreground">Inicia sesión para editar el CV</p>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Correo</label>
          <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Contraseña</label>
          <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <button type="submit" disabled={loading}
          className="w-full rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">
          {loading ? "Cargando..." : "Iniciar sesión"}
        </button>
        <Link to="/" className="block text-center text-xs text-muted-foreground hover:text-foreground">← Volver al CV</Link>
      </form>
    </div>
  );
}