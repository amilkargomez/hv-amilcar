import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CVView } from "@/components/cv/CVView";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import type { CVData } from "@/lib/cv-types";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Amilcar Gómez Cogollo — Ingeniero de Software" },
      { name: "description", content: "Currículum profesional editable de un Ingeniero de Software y Líder Técnico." },
    ],
  }),
});

function Index() {
  const [data, setData] = useState<CVData | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const cvRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.from("cv_content").select("data").eq("id", 1).single().then(({ data: row }) => {
      if (row) setData(row.data as unknown as CVData);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Cargando...</div>;
  if (!data) return <div className="flex min-h-screen items-center justify-center">No hay datos del CV.</div>;

  const handleDownload = async () => {
    if (!cvRef.current) return;
    setDownloading(true);
    try {
      const { toPng } = await import("html-to-image");
      const node = cvRef.current;
      const width = node.offsetWidth;
      const height = node.scrollHeight;
      const dataUrl = await toPng(node, {
        pixelRatio: 2,
        width,
        height,
        backgroundColor: "#ffffff",
        style: {
          margin: "0",
          width: `${width}px`,
          height: `${height}px`,
        },
      });
      const link = document.createElement("a");
      link.download = `${(data.name || "hoja-de-vida").replace(/\s+/g, "_")}_CV.png`;
      link.href = dataUrl;
      link.click();
    } catch (e) {
      console.error("Error generando imagen:", e);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex max-w-5xl justify-end px-6 pt-6 sm:px-10">
        <Button onClick={handleDownload} size="lg" disabled={downloading}>
          <Download className="h-4 w-4" />
          {downloading ? "Generando imagen..." : "Descargar Hoja de Vida (Imagen)"}
        </Button>
      </div>
      <div className="mx-auto max-w-5xl">
        <div ref={cvRef} className="inline-block w-full align-top">
          <CVView data={data} />
        </div>
      </div>
    </div>
  );
}
