import Image from "next/image";

type PencilDoodleProps = {
  className?: string;
  flip?: boolean;
};

// Direkt aus dem FehlerFix-Logo (public/logo.png) ausgeschnittenes
// Stift+Gekrakel-Motiv (siehe public/pencil-doodle.png) – keine
// Neuzeichnung, exakt dieselben Pixel wie im Logo.
export function PencilDoodle({ className = "", flip = false }: PencilDoodleProps) {
  return (
    <div className={className} style={flip ? { transform: "scaleX(-1)" } : undefined}>
      <Image
        src="/pencil-doodle.png"
        alt=""
        aria-hidden
        width={191}
        height={149}
        className="h-full w-full object-contain"
      />
    </div>
  );
}
