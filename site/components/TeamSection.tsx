import Image from "next/image";
import { LinkedInIcon } from "./LinkedInIcon";
import { ScrollReveal } from "./ScrollReveal";

const TEAM_LINKEDIN = {
  mariam: "https://www.linkedin.com/in/mariam-barry-b5382b3b6/",
  salvador: "https://www.linkedin.com/in/salvador-elsen-659673397",
  blanca: "https://www.linkedin.com/in/blanca-maria-ostrowicz-a443993a7/",
};

// TODO: echte LinkedIn-Unternehmensseite von FehlerFix eintragen
// (wird auch im Footer verlinkt)
export const FEHLERFIX_LINKEDIN_URL = "#";

const team = [
  {
    name: "Mariam Barry",
    role: "CEO & CAO",
    linkedin: TEAM_LINKEDIN.mariam,
  },
  {
    name: "Salvador Elsen",
    role: "CFO & CTO",
    linkedin: TEAM_LINKEDIN.salvador,
  },
  {
    name: "Blanca Ostrowicz",
    role: "COO & CMO",
    linkedin: TEAM_LINKEDIN.blanca,
  },
];

export function TeamSection() {
  return (
    <section id="team" className="relative scroll-mt-24 px-6 py-20 sm:py-28">
      <div className="mx-auto max-w-4xl text-center">
        <ScrollReveal>
          <h2 className="text-balance font-poppins text-3xl font-bold text-ink sm:text-4xl">
            Das Team hinter FehlerFix
          </h2>
        </ScrollReveal>

        <ScrollReveal delay={0.1} className="mt-10">
          <div className="relative mx-auto aspect-[3/4] w-full max-w-md overflow-hidden rounded-[2rem] shadow-[0_10px_40px_rgba(0,0,0,0.08)]">
            <Image
              src="/team-foto.png"
              alt="Mariam, Salvador und Blanca im Schulflur"
              fill
              sizes="(min-width: 640px) 28rem, 100vw"
              className="object-cover"
            />
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.18} className="mt-8">
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
            {team.map((member) => (
              <div key={member.name} className="text-center">
                <p className="font-semibold text-ink">{member.name}</p>
                <p className="text-sm text-ink/60">{member.role}</p>
                <a
                  href={member.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-ink/50 transition hover:text-blue"
                >
                  <LinkedInIcon className="h-4 w-4 shrink-0" />
                  LinkedIn
                </a>
              </div>
            ))}
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.24} className="mt-6">
          <a
            href={FEHLERFIX_LINKEDIN_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-semibold text-blue hover:underline"
          >
            <LinkedInIcon className="h-4 w-4" />
            FehlerFix auf LinkedIn
          </a>
        </ScrollReveal>

        <ScrollReveal delay={0.3} className="mt-8 flex justify-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-green/15 px-5 py-2.5 text-sm font-semibold text-ink">
            Business@School Sieger 2026
          </span>
        </ScrollReveal>
      </div>
    </section>
  );
}
