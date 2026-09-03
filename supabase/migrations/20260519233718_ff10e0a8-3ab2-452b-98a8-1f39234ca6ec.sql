
-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users see own roles" ON public.user_roles FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

-- CV content (singleton row)
CREATE TABLE public.cv_content (
  id INT PRIMARY KEY DEFAULT 1,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT singleton CHECK (id = 1)
);

ALTER TABLE public.cv_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read CV" ON public.cv_content FOR SELECT
  TO anon, authenticated USING (true);

CREATE POLICY "Admins can update CV" ON public.cv_content FOR UPDATE
  TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert CV" ON public.cv_content FOR INSERT
  TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed with default data from the image
INSERT INTO public.cv_content (id, data) VALUES (1, '{
  "name": "JUAN PÉREZ GARCÍA",
  "title": "INGENIERO DE SOFTWARE  |  LÍDER TÉCNICO",
  "contact": {
    "email": "juan.perez@email.com",
    "phone": "+57 300 123 4567",
    "location": "Medellín, Colombia",
    "linkedin": "linkedin.com/in/juanperez",
    "github": "github.com/juanperez"
  },
  "summary": "Ingeniero de Software con más de 7 años de experiencia liderando equipos de desarrollo en la construcción de soluciones escalables y de alto impacto. Especializado en arquitectura de software, desarrollo backend y gestión de proyectos ágiles. Enfocado en entregar valor de negocio a través de tecnología innovadora, buenas prácticas y liderazgo técnico.",
  "experience": [
    {
      "role": "Líder Técnico de Desarrollo",
      "company": "TechSolutions SAS",
      "location": "Medellín, Colombia",
      "period": "2021 – Presente",
      "bullets": [
        "Lideré un equipo de 8 desarrolladores en la migración de una plataforma monolítica a microservicios, mejorando el rendimiento del sistema en un 45%.",
        "Diseñé e implementé arquitecturas escalables en AWS, reduciendo costos operativos en un 30%.",
        "Implementé pipelines CI/CD que redujeron el tiempo de despliegue de 2 horas a 15 minutos.",
        "Colaboré con áreas de negocio para definir requerimientos y entregar soluciones alineadas a objetivos estratégicos."
      ]
    },
    {
      "role": "Ingeniero de Software Senior",
      "company": "DevEnterprise LTDA",
      "location": "Bogotá, Colombia",
      "period": "2018 – 2021",
      "bullets": [
        "Desarrollé y mantuve APIs RESTful con Java y Spring Boot utilizadas por más de 100k usuarios.",
        "Implementé pruebas automatizadas incrementando la cobertura de código del 60% al 85%.",
        "Optimicé consultas en bases de datos PostgreSQL mejorando tiempos de respuesta en un 35%.",
        "Participé en la toma de decisiones técnicas y revisión de código del equipo."
      ]
    },
    {
      "role": "Ingeniero de Software",
      "company": "SoftBuild S.A.S",
      "location": "Medellín, Colombia",
      "period": "2016 – 2018",
      "bullets": [
        "Desarrollé funcionalidades en aplicaciones web con Java, JavaScript y Angular.",
        "Colaboré en la integración de servicios de terceros y consumo de APIs.",
        "Documenté procesos técnicos y participé en metodologías ágiles (Scrum)."
      ]
    }
  ],
  "education": [
    {
      "degree": "Ingeniería de Software",
      "institution": "Universidad de Antioquia",
      "location": "Medellín, Colombia",
      "period": "2011 – 2016"
    }
  ],
  "technicalSkills": [
    "Java, Spring Boot, Node.js",
    "AWS (EC2, S3, Lambda, RDS)",
    "Microservicios, Docker, Kubernetes",
    "PostgreSQL, MySQL, MongoDB",
    "Git, GitLab CI/CD, Jenkins",
    "JavaScript, Angular, HTML, CSS",
    "RESTful APIs, GraphQL",
    "Scrum, Kanban, Jira"
  ],
  "softSkills": [
    "Liderazgo de equipos",
    "Comunicación efectiva",
    "Resolución de problemas",
    "Pensamiento analítico",
    "Adaptabilidad"
  ],
  "certifications": [
    "AWS Certified Solutions Architect – Associate (2023)",
    "Professional Scrum Master I (PSM I) (2022)",
    "Oracle Certified Professional, Java SE 11 Developer (2021)"
  ],
  "languages": [
    { "name": "Español", "level": 5 },
    { "name": "Inglés", "level": 4 }
  ],
  "focus": {
    "title": "ENFOQUE PROFESIONAL",
    "description": "Apasionado por la tecnología y el desarrollo de software. Mi objetivo es seguir creciendo como líder técnico y generar impacto positivo en los negocios y equipos que acompaño.",
    "values": ["Orientado a resultados", "Enfoque en calidad", "Mejora continua"]
  }
}'::jsonb);
