export default function ProgressBar({ current, total }) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5 text-sm text-muted">
        <span>
          Generating {Math.min(current, total)} of {total}
        </span>
        <span>{pct}%</span>
      </div>
      <div className="w-full h-2 rounded-md bg-bg border border-border overflow-hidden">
        <div
          className="h-full bg-accent transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
