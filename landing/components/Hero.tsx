import Image from "next/image";
import { BackgroundBlob, AccentDot } from "./BackgroundBlob";
import { WaitlistForm } from "./WaitlistForm";
import { Wordmark } from "./Wordmark";

export function Hero() {
  return (
    <section className="relative overflow-hidden px-6 pb-24 pt-8 sm:pt-10">
      <BackgroundBlob
        color="coral"
        className="-right-24 -top-32 h-[26rem] w-[26rem] sm:h-[32rem] sm:w-[32rem]"
        speed={0.08}
      />
      <BackgroundBlob
        color="blue"
        className="-left-32 top-[22rem] h-[22rem] w-[22rem] sm:h-[28rem] sm:w-[28rem]"
        speed={0.14}
      />
      <AccentDot color="green" className="right-10 top-24 h-3 w-3" />
      <AccentDot color="blue" className="right-32 top-52 h-2 w-2" />

      <header className="mx-auto flex max-w-6xl items-center">
        <div className="relative aspect-[4/5] w-[140px] sm:w-[170px]">
          <Image
            src="/logo.png"
            alt="FehlerFix Logo"
            fill
            priority
            sizes="170px"
            className="object-contain object-left"
          />
        </div>
      </header>

      <div className="mx-auto mt-12 max-w-3xl text-center sm:mt-16">
        <h1 className="text-balance font-poppins text-4xl font-bold leading-tight text-ink sm:text-5xl md:text-6xl">
          Rechtschreibung, die endlich Sinn ergibt.
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-balance text-lg text-ink/70 sm:text-xl">
          <Wordmark className="font-semibold" /> erkennt Rechtschreibfehler
          direkt aus der Handschrift mit dem Apple Pencil auf dem iPad – und
          erklärt die Regel dahinter, statt nur rot anzustreichen.
        </p>

        <div className="mx-auto mt-10 max-w-lg">
          <WaitlistForm />
          <p className="mt-4 text-sm text-ink/50">
            Kein Newsletter. Eine Mail, sobald FehlerFix live geht.
          </p>
        </div>
      </div>
    </section>
  );
}
