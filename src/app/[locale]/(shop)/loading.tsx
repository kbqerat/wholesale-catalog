export default function Loading() {
  return (
    <div className="animate-pulse space-y-5" aria-busy="true">
      <div className="space-y-2">
        <div className="h-8 w-48 rounded-lg bg-line" />
        <div className="h-4 w-full max-w-md rounded bg-line" />
      </div>
      <div className="h-12 rounded-2xl bg-line" />
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <li key={i} className="overflow-hidden rounded-2xl border border-line bg-surface">
            <div className="aspect-square bg-line/70" />
            <div className="space-y-2 p-3">
              <div className="h-4 w-4/5 rounded bg-line" />
              <div className="h-4 w-1/3 rounded bg-line" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
