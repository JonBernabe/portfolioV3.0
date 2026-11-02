export const SECTIONS = {
  about: { label: "ABOUT", paint: "#a23b2a" },
  projects: { label: "PROJECTS", paint: "#2f6b3f" },
  career: { label: "CAREER", paint: "#8a4f1d" },
  skills: { label: "SKILLS", paint: "#7c5e00" },
  contact: { label: "CONTACT", paint: "#27607d" },
} as const;

export type SectionId = keyof typeof SECTIONS;

export const SECTION_IDS = Object.keys(SECTIONS) as SectionId[];

export function isSectionId(value: string): value is SectionId {
  return Object.hasOwn(SECTIONS, value);
}
