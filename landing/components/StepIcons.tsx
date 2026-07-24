export function PencilIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" fill="none" className={className}>
      <rect x="6" y="6" width="28" height="28" rx="8" className="fill-current opacity-15" />
      <path
        d="M14 26.5 15 22l8.5-8.5a1.8 1.8 0 0 1 2.5 0l1.5 1.5a1.8 1.8 0 0 1 0 2.5L19 26l-5 .5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M22 15 25.5 18.5" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

export function SparkleIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" fill="none" className={className}>
      <rect x="6" y="6" width="28" height="28" rx="8" className="fill-current opacity-15" />
      <path
        d="M20 12v6M20 22v6M12 20h6M22 20h6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M20 14.5 21.4 18.6 25.5 20 21.4 21.4 20 25.5 18.6 21.4 14.5 20 18.6 18.6Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function BookIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" fill="none" className={className}>
      <rect x="6" y="6" width="28" height="28" rx="8" className="fill-current opacity-15" />
      <path
        d="M20 15c-1.6-1.3-3.8-2-6.5-2v13c2.7 0 4.9.7 6.5 2 1.6-1.3 3.8-2 6.5-2V13c-2.7 0-4.9.7-6.5 2Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M20 15v13" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}
