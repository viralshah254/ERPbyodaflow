export default function DashboardLoading() {
  return (
    <div className="flex min-h-[200px] w-full items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-foreground" />
        <span className="text-sm text-muted-foreground">Loading…</span>
      </div>
    </div>
  );
}
