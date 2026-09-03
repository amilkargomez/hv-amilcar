export interface CVData {
  name: string;
  title: string;
  contact: {
    email: string;
    phone: string;
    location: string;
    linkedin: string;
    github: string;
  };
  summary: string;
  experience: {
    role: string;
    company: string;
    location: string;
    period: string;
    bullets: string[];
  }[];
  education: {
    degree: string;
    institution: string;
    location: string;
    period: string;
  }[];
  technicalSkills: string[];
  softSkills: string[];
  updateCourses: string[];
  yearsOfExperience: { area: string; years: number }[];
  focus: {
    title: string;
    description: string;
    values: string[];
  };
}