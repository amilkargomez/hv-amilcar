import {
  Mail,
  Phone,
  MapPin,
  Linkedin,
  Github,
  User,
  Briefcase,
  GraduationCap,
  Settings,
  Star,
  BookOpen,
  Calendar,
  Target,
  TrendingUp,
  Shield,
  RefreshCw,
} from "lucide-react";
import type { CVData } from "@/lib/cv-types";

function SectionTitle({ icon: Icon, children }: { icon: any; children: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <div className="icon-pulse flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm hover:shadow-md">
        <Icon className="h-4 w-4" />
      </div>
      <h2 className="flex-1 text-sm font-bold tracking-wide text-foreground">{children}</h2>
      <div className="h-px flex-1 bg-[var(--cv-rule)]" />
    </div>
  );
}

export function CVView({ data }: { data: CVData }) {
  return (
    <div className="mx-auto max-w-5xl bg-background px-6 py-10 text-foreground sm:px-10">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-primary sm:text-5xl">
          {data.name}
        </h1>
        <p className="mt-2 border-b border-[var(--cv-rule)] pb-3 text-sm font-semibold tracking-wider text-[var(--cv-link)] sm:text-base">
          {data.title}
        </p>
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground sm:text-sm">
          <a href={`mailto:${data.contact.email}`} className="group flex items-center gap-2 hover:text-primary hover:underline">
            <Mail className="icon-wiggle h-4 w-4 text-primary" />{data.contact.email}
          </a>
          <a
            href={`https://wa.me/${data.contact.phone.replace(/[^0-9]/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-2 hover:text-primary hover:underline"
          >
            <Phone className="icon-wiggle h-4 w-4 text-primary" />{data.contact.phone}
          </a>
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(data.contact.location)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-2 hover:text-primary hover:underline"
          >
            <MapPin className="icon-wiggle h-4 w-4 text-primary" />{data.contact.location}
          </a>
          <a
            href={data.contact.linkedin.startsWith("http") ? data.contact.linkedin : `https://${data.contact.linkedin}`}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-2 hover:text-primary hover:underline"
          >
            <Linkedin className="icon-wiggle h-4 w-4 text-primary" />{data.contact.linkedin}
          </a>
          <a
            href={data.contact.github.startsWith("http") ? data.contact.github : `https://${data.contact.github}`}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-2 hover:text-primary hover:underline"
          >
            <Github className="icon-wiggle h-4 w-4 text-primary" />{data.contact.github}
          </a>
        </div>
      </header>

      <div className="grid gap-10 md:grid-cols-[1fr_280px]">
        {/* Main column */}
        <main className="space-y-8">
          <section>
            <SectionTitle icon={User}>RESUMEN PROFESIONAL</SectionTitle>
            <p className="text-sm leading-relaxed text-foreground/90">{data.summary}</p>
          </section>

          <section>
            <SectionTitle icon={Briefcase}>EXPERIENCIA PROFESIONAL</SectionTitle>
            <div className="space-y-6">
              {data.experience.map((exp, i) => (
                <div key={i} className={i > 0 ? "border-t border-[var(--cv-rule)] pt-6" : ""}>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="font-bold text-foreground">{exp.role}</h3>
                    <span className="text-xs text-muted-foreground">{exp.period}</span>
                  </div>
                  <p className="mt-1 text-sm">
                    <span className="text-[var(--cv-link)]">{exp.company}</span>
                    <span className="text-muted-foreground">  |  {exp.location}</span>
                  </p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-foreground/90 marker:text-primary">
                    {exp.bullets.map((b, j) => <li key={j}>{b}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          <section>
            <SectionTitle icon={GraduationCap}>EDUCACIÓN</SectionTitle>
            {data.education.map((ed, i) => (
              <div key={i} className="mb-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="font-bold">{ed.degree}</h3>
                  <span className="text-xs text-muted-foreground">{ed.period}</span>
                </div>
                <p className="mt-1 text-sm">
                  <span className="text-[var(--cv-link)]">{ed.institution}</span>
                  <span className="text-muted-foreground">  |  {ed.location}</span>
                </p>
              </div>
            ))}
          </section>
        </main>

        {/* Sidebar */}
        <aside className="space-y-8">
          <section>
            <SectionTitle icon={Settings}>HABILIDADES TÉCNICAS</SectionTitle>
            <ul className="list-disc space-y-1.5 pl-5 text-sm marker:text-primary">
              {data.technicalSkills.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </section>

          <section>
            <SectionTitle icon={Star}>HABILIDADES BLANDAS</SectionTitle>
            <ul className="list-disc space-y-1.5 pl-5 text-sm marker:text-primary">
              {data.softSkills.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </section>

          <section>
            <SectionTitle icon={BookOpen}>CURSOS DE ACTUALIZACIÓN</SectionTitle>
            <ul className="list-disc space-y-1.5 pl-5 text-sm marker:text-primary">
              {data.updateCourses.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </section>

          <section>
            <SectionTitle icon={Calendar}>AÑOS DE EXPERIENCIA</SectionTitle>
            <ul className="space-y-2 text-sm">
              {data.yearsOfExperience.map((exp, i) => (
                <li key={i} className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2"><span className="dot-pulse h-1.5 w-1.5 rounded-full bg-primary" />{exp.area}</span>
                  <span className="text-xs font-semibold text-primary">{exp.years} años</span>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>

      {/* Focus footer */}
      <div className="mt-10 grid gap-6 rounded-xl bg-[var(--cv-sidebar)] p-6 md:grid-cols-[1fr_240px]">
        <div className="flex gap-4">
          <div className="icon-pulse flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
            <Target className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-wide">{data.focus.title}</h3>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{data.focus.description}</p>
          </div>
        </div>
        <ul className="space-y-2 text-sm">
          {data.focus.values.map((v, i) => {
            const Icon = [TrendingUp, Shield, RefreshCw][i % 3];
            const animClass = i % 3 === 2 ? "icon-spin-hover" : "icon-anim";
            return (
              <li key={i} className="flex cursor-default items-center gap-2">
                <Icon className={`${animClass} h-4 w-4 text-[var(--cv-link)]`} />
                {v}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}