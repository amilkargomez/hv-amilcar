import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CVView } from "@/components/cv/CVView";
import { Button } from "@/components/ui/button";
import { FileImage, FileText, FileCode2, FileCheck2, Loader2 } from "lucide-react";
import type { CVData } from "@/lib/cv-types";
import { exportCvToImage, exportCvToPdf, exportCvToMarkdown } from "@/lib/cv-export";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Amilcar Gómez Cogollo — Ingeniero de Software" },
      { name: "description", content: "Currículum profesional editable de un Ingeniero de Software y Líder Técnico." },
    ],
  }),
});

type ExportKind = "png" | "pdf" | "pdf1" | "md";

function Index() {
  const [data, setData] = useState<CVData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<ExportKind | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cvRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.from("cv_content").select("data").eq("id", 1).single().then(({ data: row }) => {
      if (row) setData(row.data as unknown as CVData);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Cargando...</div>;
  if (!data) return <div className="flex min-h-screen items-center justify-center">No hay datos del CV.</div>;

  const run = async (kind: ExportKind) => {
    if (busy) return;
    setBusy(kind);
    setError(null);
    try {
      if (kind === "png") {
        if (!cvRef.current) return;
        await exportCvToImage(cvRef.current, data);
      } else if (kind === "pdf") {
        await exportCvToPdf(data);
      } else if (kind === "pdf1") {
        await exportCvToPdf(data, { compact: true });
      } else {
        exportCvToMarkdown(data);
      }
    } catch (e) {
      console.error(`Error exportando ${kind}:`, e);
      setError("No se pudo generar el archivo. Inténtalo de nuevo.");
    } finally {
      setBusy(null);
    }
  };

  const Icon = ({ kind, fallback: Fallback }: { kind: ExportKind; fallback: typeof FileImage }) =>
    busy === kind ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Fallback aria-hidden="true" />;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex max-w-5xl flex-col items-end gap-2 px-6 pt-6 sm:px-10">
        <div role="group" aria-label="Descargar hoja de vida" className="flex flex-wrap justify-end gap-2">
          <Button onClick={() => run("png")} size="lg" disabled={busy !== null}>
            <Icon kind="png" fallback={FileImage} />
            {busy === "png" ? "Generando imagen..." : "Descargar Imagen (A4)"}
          </Button>
          <Button onClick={() => run("pdf")} size="lg" disabled={busy !== null}>
            <Icon kind="pdf" fallback={FileText} />
            {busy === "pdf" ? "Generando PDF..." : "Descargar PDF"}
          </Button>
          <Button onClick={() => run("pdf1")} size="lg" disabled={busy !== null}>
            <Icon kind="pdf1" fallback={FileCheck2} />
            {busy === "pdf1" ? "Generando PDF..." : "Descargar PDF (1 página)"}
          </Button>
          <Button onClick={() => run("md")} size="lg" variant="outline" disabled={busy !== null}>
            <Icon kind="md" fallback={FileCode2} />
            {busy === "md" ? "Generando..." : "Descargar Markdown"}
          </Button>
        </div>
        {error && (
          <p role="alert" className="text-xs text-destructive">
            {error}
          </p>
        )}
      </div>
      <div className="mx-auto max-w-5xl">
        <div ref={cvRef} className="inline-block w-full align-top">
          <CVView data={data} />
        </div>
      </div>
    </div>
  );
}
