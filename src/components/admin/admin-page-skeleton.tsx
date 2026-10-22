/** Placeholder shown while an admin page loads its data. */
export function AdminPageSkeleton() {
  return (
    <div className="animate-pulse space-y-4" aria-busy="true">
      <div className="h-8 w-48 rounded-lg bg-line" />
      <div className="h-24 rounded-2xl bg-line/70" />
      <div className="h-24 rounded-2xl bg-line/70" />
    </div>
  );
}
