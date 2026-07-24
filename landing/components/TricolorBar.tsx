export function TricolorBar() {
  return (
    <div className="flex h-2 w-full" aria-hidden>
      <div className="flex-1 bg-green" />
      <div className="flex-1 bg-blue" />
      <div className="flex-1 bg-coral" />
    </div>
  );
}
