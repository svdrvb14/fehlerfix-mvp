type PencilDoodleProps = {
  className?: string;
  flip?: boolean;
};

// Nachgebaut aus dem Stift-Motiv im FehlerFix-Logo (public/logo.png): ein
// gekippter Stift mit heller Mittelstreifen-Fase und einem kurzen,
// handschriftlichen Gekrakel, das aus der Spitze läuft.
export function PencilDoodle({ className = "", flip = false }: PencilDoodleProps) {
  return (
    <svg
      viewBox="0 0 120 100"
      className={className}
      style={flip ? { transform: "scaleX(-1)" } : undefined}
      fill="none"
      aria-hidden
    >
      <path
        d="M4 78 Q 14 68, 25 76 T 47 74 T 68 70"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-coral"
      />
      <g transform="rotate(-38 78 44)">
        <rect x="52" y="6" width="22" height="60" rx="7" className="fill-coral" />
        <rect x="60.5" y="11" width="5" height="44" rx="2.5" fill="white" fillOpacity="0.55" />
        <path d="M52 66 L74 66 L63 86 Z" className="fill-coral" />
      </g>
    </svg>
  );
}
