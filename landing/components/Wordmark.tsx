export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-poppins font-bold ${className}`}>
      <span className="text-coral">Fehler</span>
      <span className="text-blue">Fix</span>
    </span>
  );
}
