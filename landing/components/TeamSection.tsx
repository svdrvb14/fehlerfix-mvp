import Image from "next/image";
import { AccentDot, BackgroundBlob } from "./BackgroundBlob";
import { LaurelIcon } from "./LaurelIcon";
import { ScrollReveal } from "./ScrollReveal";

const team = [
  { name: "Salvador Elsen", role: "CFO & CTO" },
  { name: "Mariam Barry", role: "CEO & CAO" },
  { name: "Blanca Ostrowicz", role: "COO & CMO" },
];

export function TeamSection() {
  return (
    <section className="relative overflow-hidden px-6 py-24">
      <BackgroundBlob
        color="blue"
        className="-right-32 top-0 h-[22rem] w-[22rem]"
        speed={0.09}
      />
      <BackgroundBlob
        color="coral"
        className="-left-24 bottom-[-4rem] h-[20rem] w-[20rem]"
        speed={0.13}
      />
      <AccentDot color="green" className="left-1/4 top-8 h-2.5 w-2.5" />

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
              alt="Salvador, Mariam und Blanca im Schulflur"
              fill
              sizes="(min-width: 640px) 28rem, 100vw"
              className="object-cover"
            />
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.18} className="mt-8">
          <p className="text-lg text-ink/70">
            {team.map((member, index) => (
              <span key={member.name}>
                <span className="font-semibold text-ink">{member.name}</span>{" "}
                – {member.role}
                {index < team.length - 1 ? " · " : ""}
              </span>
            ))}
          </p>
        </ScrollReveal>

        <ScrollReveal delay={0.24} className="mt-6">
          <span className="inline-flex items-center gap-2 rounded-full bg-coral-light px-5 py-2.5 text-sm font-semibold text-coral">
            <LaurelIcon className="h-5 w-5" />
            Business@School Sieger 2026
          </span>
        </ScrollReveal>
      </div>
    </section>
  );
}
