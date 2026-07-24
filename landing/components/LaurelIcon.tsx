export function LaurelIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M12 3v14"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="M12 17c-2.5 1.5-5 1-6.5-1.2M5 12.2C4 10 4.3 7.6 6 6M7 9.2C6.3 7.6 6.6 6 8 5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="M12 17c2.5 1.5 5 1 6.5-1.2M19 12.2c1-2.2.7-4.6-1-6.2M17 9.2c.7-1.6.4-3.2-1-4.2"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
