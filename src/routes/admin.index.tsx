import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { CVData } from "@/lib/cv-types";
import { Trash2, Plus, LogOut, Eye, Save } from "lucide-react";

export const Route = createFileRoute("/admin/")({
  component: AdminPage,
  head: () => ({ meta: [{ title: "Administrador — Editar CV" }] }),
});

const inputCls = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm";
const labelCls = "text-xs font-medium text-muted-foreground";

function AdminPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<CVData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) { navigate({ to: "/amilcargomez" }); return; }
      // Try to claim admin (first user) or check role
      const { data: claimed } = await supabase.rpc("claim_admin_if_first");
      if (!claimed) {
        setMsg("Tu cuenta no tiene permisos de administrador.");
        setLoading(false);
        return;
      }
      setIsAdmin(true);
      const { data: row } = await supabase.from("cv_content").select("data").eq("id", 1).single();
      if (row) setData(row.data as unknown as CVData);
      setLoading(false);
    })();
  }, [navigate]);

  async function save() {
    if (!data) return;
    setSaving(true); setMsg("");
    const { error } = await supabase.from("cv_content").update({ data: data as any, updated_at: new Date().toISOString() }).eq("id", 1);
    setSaving(false);
    setMsg(error ? "Error: " + error.message : "Cambios guardados ✓");
    setTimeout(() => setMsg(""), 3000);
  }

  async function logout() {
    await supabase.auth.signOut();
    navigate({ to: "/amilcargomez" });
  }

  if (loading) return <div className="flex min-h-screen items-center justify-center">Cargando...</div>;
  if (!isAdmin) return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <p>{msg}</p>
      <button onClick={logout} className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">Cerrar sesión</button>
    </div>
  );
  if (!data) return <div className="p-8">No hay datos</div>;

  const update = (patch: Partial<CVData>) => setData({ ...data, ...patch });

  return (
    <div className="min-h-screen bg-secondary pb-20">
      <header className="sticky top-0 z-10 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <h1 className="text-lg font-bold">Editor del CV</h1>
          <div className="flex items-center gap-2">
            {msg && <span className="text-xs text-muted-foreground">{msg}</span>}
            <Link to="/" className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs hover:bg-accent hover:text-accent-foreground"><Eye className="h-3 w-3" />Ver</Link>
            <button onClick={save} disabled={saving} className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50"><Save className="h-3 w-3" />{saving ? "Guardando..." : "Guardar"}</button>
            <button onClick={logout} className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs hover:bg-accent"><LogOut className="h-3 w-3" />Salir</button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl space-y-6 px-4 py-6">
        {/* Identidad */}
        <Section title="Identidad">
          <Field label="Nombre completo"><input className={inputCls} value={data.name} onChange={e => update({ name: e.target.value })} /></Field>
          <Field label="Título"><input className={inputCls} value={data.title} onChange={e => update({ title: e.target.value })} /></Field>
        </Section>

        {/* Contacto */}
        <Section title="Contacto">
          {(["email","phone","location","linkedin","github"] as const).map(k => (
            <Field key={k} label={k}><input className={inputCls} value={data.contact[k]} onChange={e => update({ contact: { ...data.contact, [k]: e.target.value } })} /></Field>
          ))}
        </Section>

        {/* Resumen */}
        <Section title="Resumen profesional">
          <textarea className={inputCls + " min-h-[120px]"} value={data.summary} onChange={e => update({ summary: e.target.value })} />
        </Section>

        {/* Experiencia */}
        <Section title="Experiencia profesional"
          onAdd={() => update({ experience: [...data.experience, { role: "", company: "", location: "", period: "", bullets: [""] }] })}>
          {data.experience.map((exp, i) => (
            <div key={i} className="space-y-2 rounded-lg border bg-background p-4">
              <div className="grid gap-2 sm:grid-cols-2">
                <Field label="Cargo"><input className={inputCls} value={exp.role} onChange={e => { const a = [...data.experience]; a[i] = { ...exp, role: e.target.value }; update({ experience: a }); }} /></Field>
                <Field label="Periodo"><input className={inputCls} value={exp.period} onChange={e => { const a = [...data.experience]; a[i] = { ...exp, period: e.target.value }; update({ experience: a }); }} /></Field>
                <Field label="Empresa"><input className={inputCls} value={exp.company} onChange={e => { const a = [...data.experience]; a[i] = { ...exp, company: e.target.value }; update({ experience: a }); }} /></Field>
                <Field label="Ubicación"><input className={inputCls} value={exp.location} onChange={e => { const a = [...data.experience]; a[i] = { ...exp, location: e.target.value }; update({ experience: a }); }} /></Field>
              </div>
              <Field label="Logros">
                <ListEditor items={exp.bullets} onChange={items => { const a = [...data.experience]; a[i] = { ...exp, bullets: items }; update({ experience: a }); }} multiline />
              </Field>
              <button onClick={() => update({ experience: data.experience.filter((_, j) => j !== i) })}
                className="inline-flex items-center gap-1 text-xs text-destructive hover:underline"><Trash2 className="h-3 w-3" />Eliminar experiencia</button>
            </div>
          ))}
        </Section>

        {/* Educación */}
        <Section title="Educación"
          onAdd={() => update({ education: [...data.education, { degree: "", institution: "", location: "", period: "" }] })}>
          {data.education.map((ed, i) => (
            <div key={i} className="space-y-2 rounded-lg border bg-background p-4">
              <div className="grid gap-2 sm:grid-cols-2">
                <Field label="Título"><input className={inputCls} value={ed.degree} onChange={e => { const a = [...data.education]; a[i] = { ...ed, degree: e.target.value }; update({ education: a }); }} /></Field>
                <Field label="Periodo"><input className={inputCls} value={ed.period} onChange={e => { const a = [...data.education]; a[i] = { ...ed, period: e.target.value }; update({ education: a }); }} /></Field>
                <Field label="Institución"><input className={inputCls} value={ed.institution} onChange={e => { const a = [...data.education]; a[i] = { ...ed, institution: e.target.value }; update({ education: a }); }} /></Field>
                <Field label="Ubicación"><input className={inputCls} value={ed.location} onChange={e => { const a = [...data.education]; a[i] = { ...ed, location: e.target.value }; update({ education: a }); }} /></Field>
              </div>
              <button onClick={() => update({ education: data.education.filter((_, j) => j !== i) })}
                className="inline-flex items-center gap-1 text-xs text-destructive hover:underline"><Trash2 className="h-3 w-3" />Eliminar</button>
            </div>
          ))}
        </Section>

        <Section title="Habilidades técnicas">
          <ListEditor items={data.technicalSkills} onChange={v => update({ technicalSkills: v })} />
        </Section>
        <Section title="Habilidades blandas">
          <ListEditor items={data.softSkills} onChange={v => update({ softSkills: v })} />
        </Section>
        <Section title="Cursos de actualización">
          <ListEditor items={data.updateCourses} onChange={v => update({ updateCourses: v })} />
        </Section>

        <Section title="Años de experiencia"
          onAdd={() => update({ yearsOfExperience: [...data.yearsOfExperience, { area: "", years: 1 }] })}>
          {data.yearsOfExperience.map((exp, i) => (
            <div key={i} className="rounded-lg border bg-background p-4">
              <div className="grid gap-3 sm:grid-cols-[1fr_140px_auto] sm:items-end">
                <Field label="Área / Habilidad">
                  <input
                    className={inputCls}
                    placeholder="Ej: Conducir, Liderazgo, React..."
                    value={exp.area}
                    onChange={e => { const a = [...data.yearsOfExperience]; a[i] = { ...exp, area: e.target.value }; update({ yearsOfExperience: a }); }}
                  />
                </Field>
                <Field label="Años">
                  <input
                    type="number"
                    min={0}
                    className={inputCls}
                    value={exp.years}
                    onChange={e => { const a = [...data.yearsOfExperience]; a[i] = { ...exp, years: Number(e.target.value) }; update({ yearsOfExperience: a }); }}
                  />
                </Field>
                <button
                  onClick={() => update({ yearsOfExperience: data.yearsOfExperience.filter((_, j) => j !== i) })}
                  className="inline-flex h-10 items-center justify-center rounded-md border border-destructive/30 px-3 text-destructive hover:bg-destructive/10"
                  aria-label="Eliminar"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </Section>

        <Section title="Enfoque profesional">
          <Field label="Título"><input className={inputCls} value={data.focus.title} onChange={e => update({ focus: { ...data.focus, title: e.target.value } })} /></Field>
          <Field label="Descripción"><textarea className={inputCls + " min-h-[80px]"} value={data.focus.description} onChange={e => update({ focus: { ...data.focus, description: e.target.value } })} /></Field>
          <Field label="Valores"><ListEditor items={data.focus.values} onChange={v => update({ focus: { ...data.focus, values: v } })} /></Field>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children, onAdd }: { title: string; children: React.ReactNode; onAdd?: () => void }) {
  return (
    <section className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-bold">{title}</h2>
        {onAdd && <button onClick={onAdd} className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-xs text-primary-foreground"><Plus className="h-3 w-3" />Agregar</button>}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block space-y-1"><span className={labelCls}>{label}</span>{children}</label>;
}

function ListEditor({ items, onChange, multiline }: { items: string[]; onChange: (v: string[]) => void; multiline?: boolean }) {
  return (
    <div className="space-y-2">
      {items.map((it, i) => (
        <div key={i} className="flex gap-2">
          {multiline
            ? <textarea className={inputCls + " min-h-[60px] flex-1"} value={it} onChange={e => { const a = [...items]; a[i] = e.target.value; onChange(a); }} />
            : <input className={inputCls + " flex-1"} value={it} onChange={e => { const a = [...items]; a[i] = e.target.value; onChange(a); }} />}
          <button onClick={() => onChange(items.filter((_, j) => j !== i))} className="text-destructive"><Trash2 className="h-4 w-4" /></button>
        </div>
      ))}
      <button onClick={() => onChange([...items, ""])} className="inline-flex items-center gap-1 text-xs text-primary hover:underline"><Plus className="h-3 w-3" />Añadir elemento</button>
    </div>
  );
}