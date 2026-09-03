import type { CVData } from "./cv-types";

/* -------------------------------------------------------------------------- */
/*  Shared helpers                                                            */
/* -------------------------------------------------------------------------- */

export function fileBase(name: string) {
  return (name || "hoja-de-vida")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, "_");
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function withProtocol(url: string) {
  return url.startsWith("http") ? url : `https://${url}`;
}

/* -------------------------------------------------------------------------- */
/*  1. PNG image, fitted to an A4 page at 300 dpi                             */
/* -------------------------------------------------------------------------- */

const A4_CSS_WIDTH = 794; // A4 width in CSS px @ 96 dpi (210 mm)
const A4_OUT_WIDTH = 2480; // A4 width @ 300 dpi (print quality)

export async function exportCvToImage(source: HTMLElement, data: CVData) {
  const { toCanvas } = await import("html-to-image");

  // Render an off-screen clone laid out at true A4 width so the result is the
  // same regardless of the visitor's viewport, with all animations frozen.
  // The image is exactly A4 wide at 300 dpi; height follows the content.
  const wrapper = document.createElement("div");
  wrapper.className = "cv-export-static";
  wrapper.style.cssText = `position:fixed;left:-10000px;top:0;width:${A4_CSS_WIDTH}px;background:#ffffff;z-index:-1;`;
  const clone = source.cloneNode(true) as HTMLElement;
  clone.style.width = `${A4_CSS_WIDTH}px`;
  clone.style.margin = "0";
  wrapper.appendChild(clone);
  document.body.appendChild(wrapper);

  try {
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    const height = clone.scrollHeight;

    const rendered = await toCanvas(clone, {
      pixelRatio: A4_OUT_WIDTH / A4_CSS_WIDTH,
      width: A4_CSS_WIDTH,
      height,
      backgroundColor: "#ffffff",
      style: { margin: "0", width: `${A4_CSS_WIDTH}px`, height: `${height}px` },
    });

    const blob = await new Promise<Blob>((resolve, reject) =>
      rendered.toBlob((b) => (b ? resolve(b) : reject(new Error("No se pudo generar la imagen"))), "image/png"),
    );
    downloadBlob(blob, `${fileBase(data.name)}_CV.png`);
  } finally {
    wrapper.remove();
  }
}

/* -------------------------------------------------------------------------- */
/*  2. PDF with real, selectable text (jsPDF)                                 */
/* -------------------------------------------------------------------------- */

const PAGE = { w: 210, h: 297 };
const MARGIN = 16;
const CONTENT_W = PAGE.w - MARGIN * 2;
const SIDEBAR_W = 58;
const COL_GAP = 9;
const MAIN_W = CONTENT_W - SIDEBAR_W - COL_GAP;
const BOTTOM = PAGE.h - MARGIN;
const PT_TO_MM = 0.352778;

const C = {
  primary: "#14295c",
  link: "#2f6fe0",
  text: "#161d33",
  body: "#2b3245",
  muted: "#6b7280",
  rule: "#d5dbe7",
  panel: "#f4f6fb",
};

type Cursor = {
  x: number;
  w: number;
  y: number;
  page: number;
  /** Once past this page the column may grow to the full content width. */
  expandAfterPage?: number;
};
type FontStyle = "normal" | "bold" | "italic" | "bolditalic";
type JsPdf = InstanceType<(typeof import("jspdf"))["jsPDF"]>;

export interface PdfOptions {
  /**
   * One-page résumé: drops the per-role activities, renders the professional
   * focus as a single complete paragraph and shrinks typography until the whole
   * document fits on a single A4 sheet.
   */
  compact?: boolean;
}

export async function exportCvToPdf(data: CVData, options: PdfOptions = {}) {
  const { jsPDF } = await import("jspdf");
  const compact = options.compact === true;

  const make = (k: number) => {
    const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
    const result = renderPdf(doc, data, { compact, k });
    return { doc, ...result };
  };

  let k = compact ? 0.92 : 1;
  let out = make(k);
  if (compact) {
    // Shrink typography step by step until everything fits on one page.
    while (out.doc.getNumberOfPages() > 1 && k > 0.6) {
      k -= 0.03;
      out = make(k);
    }
  } else {
    // Avoid a last page holding only the focus panel: nudge the scale down a
    // little (never below 88 %) so the panel joins the previous page.
    while (out.orphanPanel && k > 0.88) {
      k -= 0.02;
      out = make(k);
    }
  }

  out.doc.save(`${fileBase(data.name)}_CV${compact ? "_1pag" : ""}.pdf`);
}

function renderPdf(doc: JsPdf, data: CVData, { compact, k }: { compact: boolean; k: number }): { orphanPanel: boolean } {
  doc.setProperties({
    title: `${data.name} — Hoja de Vida${compact ? " (resumen)" : ""}`,
    subject: data.title,
    author: data.name,
    keywords: "CV, hoja de vida, currículum",
    creator: "Hoja de Vida",
  });
  doc.setLanguage("es-ES");

  /* ---- scale helpers: `k` shrinks fonts and vertical rhythm uniformly ---- */

  const fs = (pt: number) => pt * k;
  const sp = (mm: number) => mm * k;

  /* ---- low level writers ---- */

  const lineH = (size: number, lh = 1.4) => size * PT_TO_MM * lh;

  const setFont = (size: number, style: FontStyle = "normal", color = C.text) => {
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
    doc.setTextColor(color);
  };

  const ensure = (c: Cursor, h: number) => {
    if (c.y + h > BOTTOM) {
      c.page += 1;
      if (doc.getNumberOfPages() < c.page) doc.addPage();
      c.y = MARGIN;
      if (c.expandAfterPage !== undefined && c.page > c.expandAfterPage) c.w = CONTENT_W;
    }
    doc.setPage(c.page);
  };

  const paragraph = (
    c: Cursor,
    text: string,
    opts: { size?: number; style?: FontStyle; color?: string; lh?: number; indent?: number } = {},
  ) => {
    const { size: rawSize = 9.5, style = "normal", color = C.body, lh = 1.45, indent = 0 } = opts;
    const size = fs(rawSize);
    setFont(size, style, color);
    const lines = doc.splitTextToSize(text, c.w - indent) as string[];
    const h = lineH(size, lh);
    for (const line of lines) {
      ensure(c, h);
      setFont(size, style, color);
      doc.text(line, c.x + indent, c.y, { baseline: "top" });
      c.y += h;
    }
  };

  const bullet = (c: Cursor, text: string, rawSize = 9.5, color = C.body) => {
    const size = fs(rawSize);
    const h = lineH(size, 1.45);
    ensure(c, h);
    setFont(size, "normal", C.primary);
    doc.text("•", c.x + 1, c.y, { baseline: "top" });
    paragraph(c, text, { size: rawSize, color, indent: sp(5) });
  };

  const gap = (c: Cursor, mm: number) => {
    c.y += sp(mm);
  };

  const sectionTitle = (c: Cursor, title: string) => {
    const size = fs(9.5);
    const h = lineH(size, 1.2);
    ensure(c, h + sp(8));
    setFont(size, "bold", C.primary);
    doc.text(title, c.x, c.y, { baseline: "top", charSpace: 0.4 });
    const tw = doc.getTextWidth(title) + title.length * 0.4;
    const ruleY = c.y + h / 2;
    doc.setDrawColor(C.rule);
    doc.setLineWidth(0.3);
    if (c.x + tw + 4 < c.x + c.w) doc.line(c.x + tw + 4, ruleY, c.x + c.w, ruleY);
    c.y += h + sp(3.5);
  };

  const twoSided = (c: Cursor, left: string, right: string, opts: { leftStyle?: FontStyle; leftSize?: number; rightSize?: number; leftColor?: string; rightColor?: string; rightStyle?: FontStyle } = {}) => {
    const {
      leftStyle = "bold",
      leftSize: rawLeft = 10.5,
      rightSize: rawRight = 8,
      leftColor = C.text,
      rightColor = C.muted,
      rightStyle = "normal",
    } = opts;
    const leftSize = fs(rawLeft);
    const rightSize = fs(rawRight);
    setFont(rightSize, rightStyle, rightColor);
    const rw = doc.getTextWidth(right);
    const leftW = c.w - rw - 3;
    setFont(leftSize, leftStyle, leftColor);
    const lines = doc.splitTextToSize(left, leftW) as string[];
    const h = lineH(leftSize, 1.3);
    ensure(c, h);
    setFont(rightSize, rightStyle, rightColor);
    doc.text(right, c.x + c.w, c.y + (h - lineH(rightSize, 1.3)) / 2 + 0.3, { baseline: "top", align: "right" });
    for (const line of lines) {
      ensure(c, h);
      setFont(leftSize, leftStyle, leftColor);
      doc.text(line, c.x, c.y, { baseline: "top" });
      c.y += h;
    }
  };

  const companyLine = (c: Cursor, company: string, location: string) => {
    const size = fs(9);
    const h = lineH(size, 1.4);
    ensure(c, h);
    setFont(size, "normal", C.link);
    doc.text(company, c.x, c.y, { baseline: "top" });
    const cw = doc.getTextWidth(company);
    setFont(size, "normal", C.muted);
    doc.text(`  |  ${location}`, c.x + cw, c.y, { baseline: "top" });
    c.y += h;
  };

  /* ---- header (full width) ---- */

  let y = MARGIN;
  const nameSize = fs(compact ? 21 : 24);
  setFont(nameSize, "bold", C.primary);
  const nameLines = doc.splitTextToSize(data.name, CONTENT_W) as string[];
  for (const line of nameLines) {
    doc.text(line, MARGIN, y, { baseline: "top" });
    y += lineH(nameSize, 1.1);
  }
  y += sp(1.5);
  const titleSize = fs(10.5);
  setFont(titleSize, "bold", C.link);
  doc.text(data.title.toUpperCase(), MARGIN, y, { baseline: "top", charSpace: 0.6 });
  y += lineH(titleSize, 1.3) + sp(2);
  doc.setDrawColor(C.rule);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y, PAGE.w - MARGIN, y);
  y += sp(4);

  // Contact row: flows onto several lines if needed, each item is a link
  const contacts: { label: string; url?: string }[] = [
    { label: data.contact.email, url: `mailto:${data.contact.email}` },
    { label: data.contact.phone, url: `https://wa.me/${data.contact.phone.replace(/[^0-9]/g, "")}` },
    { label: data.contact.location, url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(data.contact.location)}` },
    { label: data.contact.linkedin, url: withProtocol(data.contact.linkedin) },
    { label: data.contact.github, url: withProtocol(data.contact.github) },
  ].filter((i) => i.label);

  const contactSize = fs(8.5);
  setFont(contactSize, "normal", C.muted);
  const sep = "   ·   ";
  const sepW = doc.getTextWidth(sep);
  const ch = lineH(contactSize, 1.5);
  let cx = MARGIN;
  contacts.forEach((item, idx) => {
    const w = doc.getTextWidth(item.label);
    if (idx > 0) {
      if (cx + sepW + w > PAGE.w - MARGIN) {
        cx = MARGIN;
        y += ch;
      } else {
        doc.text(sep, cx, y, { baseline: "top" });
        cx += sepW;
      }
    }
    setFont(contactSize, "normal", C.body);
    if (item.url) doc.textWithLink(item.label, cx, y, { baseline: "top", url: item.url });
    else doc.text(item.label, cx, y, { baseline: "top" });
    setFont(contactSize, "normal", C.muted);
    cx += w;
  });
  y += ch + sp(compact ? 5 : 7);

  /* ---- columns ---- */

  const main: Cursor = { x: MARGIN, w: MAIN_W, y, page: 1 };
  const side: Cursor = { x: MARGIN + MAIN_W + COL_GAP, w: SIDEBAR_W, y, page: 1 };

  // Sidebar column first, so the main column knows on which page it ends
  // and can take the full width on the following pages.
  const sideList = (title: string, items: string[]) => {
    sectionTitle(side, title);
    items.forEach((s) => bullet(side, s, 9));
    gap(side, 7);
  };
  sideList("HABILIDADES TÉCNICAS", data.technicalSkills);
  sideList("HABILIDADES BLANDAS", data.softSkills);
  sideList("CURSOS DE ACTUALIZACIÓN", data.updateCourses);

  sectionTitle(side, "AÑOS DE EXPERIENCIA");
  data.yearsOfExperience.forEach((exp) => {
    const size = fs(9);
    const h = lineH(size, 1.6);
    ensure(side, h);
    doc.setFillColor(C.primary);
    doc.circle(side.x + 1, side.y + h / 2 - 0.6, 0.7, "F");
    setFont(fs(8), "bold", C.primary);
    const years = `${exp.years} años`;
    const yw = doc.getTextWidth(years);
    doc.text(years, side.x + side.w, side.y + 0.5, { baseline: "top", align: "right" });
    setFont(size, "normal", C.body);
    const areaLines = doc.splitTextToSize(exp.area, side.w - yw - 7) as string[];
    doc.text(areaLines[0], side.x + 4, side.y, { baseline: "top" });
    side.y += h;
    for (const extra of areaLines.slice(1)) {
      ensure(side, h);
      doc.text(extra, side.x + 4, side.y, { baseline: "top" });
      side.y += h;
    }
  });

  // Main column
  main.expandAfterPage = side.page;
  sectionTitle(main, "RESUMEN PROFESIONAL");
  paragraph(main, data.summary, { size: 9.5 });
  gap(main, compact ? 5 : 7);

  sectionTitle(main, "EXPERIENCIA PROFESIONAL");
  data.experience.forEach((exp, i) => {
    if (i > 0) {
      if (compact) {
        gap(main, 3);
      } else {
        ensure(main, 6);
        doc.setDrawColor(C.rule);
        doc.setLineWidth(0.25);
        doc.line(main.x, main.y + 1, main.x + main.w, main.y + 1);
        gap(main, 5);
      }
    }
    twoSided(main, exp.role, exp.period);
    gap(main, 0.8);
    companyLine(main, exp.company, exp.location);
    // The one-page version lists only the roles, without their activities.
    if (!compact) {
      gap(main, 1.5);
      exp.bullets.forEach((b) => bullet(main, b));
    }
  });
  gap(main, compact ? 5 : 7);

  sectionTitle(main, "EDUCACIÓN");
  data.education.forEach((ed, i) => {
    if (i > 0) gap(main, 3);
    twoSided(main, ed.degree, ed.period);
    gap(main, 0.8);
    companyLine(main, ed.institution, ed.location);
  });

  /* ---- focus panel (full width, after the longer column) ---- */

  const lastPage = Math.max(main.page, side.page);
  const startY = Math.max(main.page === lastPage ? main.y : 0, side.page === lastPage ? side.y : 0) + sp(8);
  const panel: Cursor = { x: MARGIN, w: CONTENT_W, y: startY, page: lastPage };

  const PAD = sp(6);
  const focusTitleSize = fs(9.5);
  const focusDescSize = fs(8.5);
  const focusValSize = fs(9);
  const textX = panel.x + PAD + sp(14);

  if (compact) {
    // Full-width complete summary: title, the whole description, and the
    // values inline on one line so the block stays as short as possible.
    const descW = panel.x + panel.w - PAD - textX;
    setFont(focusDescSize, "normal", C.muted);
    const descLines = doc.splitTextToSize(data.focus.description, descW) as string[];
    const valuesText = data.focus.values.join("   ·   ");
    setFont(focusValSize, "normal", C.body);
    const valueLines = doc.splitTextToSize(valuesText, descW) as string[];
    const panelH =
      PAD * 2 +
      lineH(focusTitleSize, 1.3) +
      sp(1.5) +
      descLines.length * lineH(focusDescSize, 1.45) +
      sp(2) +
      valueLines.length * lineH(focusValSize, 1.5);

    ensure(panel, panelH);
    doc.setFillColor(C.panel);
    doc.roundedRect(panel.x, panel.y, panel.w, panelH, 3, 3, "F");
    drawFocusIcon(doc, panel.x + PAD + sp(5), panel.y + PAD + sp(5), sp(5));

    let ty = panel.y + PAD;
    setFont(focusTitleSize, "bold", C.text);
    doc.text(data.focus.title, textX, ty, { baseline: "top", charSpace: 0.3 });
    ty += lineH(focusTitleSize, 1.3) + sp(1.5);
    setFont(focusDescSize, "normal", C.muted);
    for (const line of descLines) {
      doc.text(line, textX, ty, { baseline: "top" });
      ty += lineH(focusDescSize, 1.45);
    }
    ty += sp(2);
    setFont(focusValSize, "normal", C.primary);
    for (const line of valueLines) {
      doc.text(line, textX, ty, { baseline: "top" });
      ty += lineH(focusValSize, 1.5);
    }
  } else {
    const VALUES_W = 60;
    const valX = panel.x + panel.w - PAD - VALUES_W;
    const descW = valX - textX - 8;
    setFont(focusDescSize, "normal", C.muted);
    const descLines = doc.splitTextToSize(data.focus.description, descW) as string[];
    const leftH = lineH(focusTitleSize, 1.3) + 1.5 + descLines.length * lineH(focusDescSize, 1.45);
    const rightH = data.focus.values.length * lineH(focusValSize, 1.7);
    const panelH = Math.max(leftH, rightH) + PAD * 2;

    ensure(panel, panelH);
    doc.setFillColor(C.panel);
    doc.roundedRect(panel.x, panel.y, panel.w, panelH, 3, 3, "F");
    drawFocusIcon(doc, panel.x + PAD + 5, panel.y + PAD + 5, 5);

    let ty = panel.y + PAD;
    setFont(focusTitleSize, "bold", C.text);
    doc.text(data.focus.title, textX, ty, { baseline: "top", charSpace: 0.3 });
    ty += lineH(focusTitleSize, 1.3) + 1.5;
    setFont(focusDescSize, "normal", C.muted);
    for (const line of descLines) {
      doc.text(line, textX, ty, { baseline: "top" });
      ty += lineH(focusDescSize, 1.45);
    }

    let vy = panel.y + PAD;
    data.focus.values.forEach((v) => {
      doc.setFillColor(C.link);
      doc.circle(valX + 1, vy + lineH(focusValSize, 1.7) / 2 - 0.8, 0.8, "F");
      setFont(focusValSize, "normal", C.body);
      doc.text(v, valX + 4.5, vy, { baseline: "top" });
      vy += lineH(focusValSize, 1.7);
    });
  }

  /* ---- page footer ---- */

  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    setFont(7.5, "normal", C.muted);
    doc.text(data.name, MARGIN, PAGE.h - 8, { baseline: "top" });
    if (total > 1) {
      doc.text(`${p} / ${total}`, PAGE.w - MARGIN, PAGE.h - 8, { baseline: "top", align: "right" });
    }
  }

  return { orphanPanel: panel.page > lastPage };
}

/** Small "target" medallion used as the icon of the professional-focus panel. */
function drawFocusIcon(doc: JsPdf, cx: number, cy: number, r: number) {
  doc.setFillColor(C.primary);
  doc.circle(cx, cy, r, "F");
  doc.setDrawColor("#ffffff");
  doc.setLineWidth(0.5);
  doc.circle(cx, cy, r * 0.64, "S");
  doc.circle(cx, cy, r * 0.34, "S");
  doc.setFillColor("#ffffff");
  doc.circle(cx, cy, r * 0.12, "F");
}

/* -------------------------------------------------------------------------- */
/*  3. Markdown                                                               */
/* -------------------------------------------------------------------------- */

export function buildCvMarkdown(data: CVData) {
  const md: string[] = [];
  const contact = data.contact;

  md.push(`# ${data.name}`);
  md.push("");
  md.push(`**${data.title}**`);
  md.push("");
  if (contact.email) md.push(`- **Correo:** [${contact.email}](mailto:${contact.email})`);
  if (contact.phone) md.push(`- **Teléfono:** [${contact.phone}](https://wa.me/${contact.phone.replace(/[^0-9]/g, "")})`);
  if (contact.location) md.push(`- **Ubicación:** ${contact.location}`);
  if (contact.linkedin) md.push(`- **LinkedIn:** [${contact.linkedin}](${withProtocol(contact.linkedin)})`);
  if (contact.github) md.push(`- **GitHub:** [${contact.github}](${withProtocol(contact.github)})`);
  md.push("");

  md.push("## Resumen profesional");
  md.push("");
  md.push(data.summary);
  md.push("");

  md.push("## Experiencia profesional");
  md.push("");
  data.experience.forEach((exp) => {
    md.push(`### ${exp.role}`);
    md.push("");
    md.push(`**${exp.company}** · ${exp.location}  `);
    md.push(`_${exp.period}_`);
    md.push("");
    exp.bullets.forEach((b) => md.push(`- ${b}`));
    md.push("");
  });

  md.push("## Educación");
  md.push("");
  data.education.forEach((ed) => {
    md.push(`### ${ed.degree}`);
    md.push("");
    md.push(`**${ed.institution}** · ${ed.location}  `);
    md.push(`_${ed.period}_`);
    md.push("");
  });

  const list = (title: string, items: string[]) => {
    md.push(`## ${title}`);
    md.push("");
    items.forEach((s) => md.push(`- ${s}`));
    md.push("");
  };
  list("Habilidades técnicas", data.technicalSkills);
  list("Habilidades blandas", data.softSkills);
  list("Cursos de actualización", data.updateCourses);

  md.push("## Años de experiencia");
  md.push("");
  md.push("| Área | Años |");
  md.push("| --- | ---: |");
  data.yearsOfExperience.forEach((e) => md.push(`| ${e.area} | ${e.years} |`));
  md.push("");

  md.push(`## ${data.focus.title}`);
  md.push("");
  md.push(data.focus.description);
  md.push("");
  data.focus.values.forEach((v) => md.push(`- ${v}`));
  md.push("");

  return md.join("\n");
}

export function exportCvToMarkdown(data: CVData) {
  const blob = new Blob([buildCvMarkdown(data)], { type: "text/markdown;charset=utf-8" });
  downloadBlob(blob, `${fileBase(data.name)}_CV.md`);
}
