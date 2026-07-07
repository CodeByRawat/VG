export default function StepPanel({ number, title, children, className = '' }) {
  return (
    <section className={`bg-panel border border-border rounded-lg p-5 ${className}`}>
      <div className="flex items-center gap-3 mb-4">
        <span className="flex items-center justify-center w-7 h-7 rounded-md bg-accent text-bg font-bold text-sm shrink-0">
          {number}
        </span>
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      {children}
    </section>
  );
}
