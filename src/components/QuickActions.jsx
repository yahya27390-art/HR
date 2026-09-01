export default function QuickActions({ actions }) {
  return (
    <div className="flex flex-wrap gap-3">
      {actions.map((a, i) => (
        <button
          key={i}
          onClick={a.onClick}
          className={`inline-flex items-center gap-2 h-11 px-5 rounded-xl text-sm font-medium transition-colors ${
            a.primary
              ? 'bg-accent text-accent-foreground hover:bg-accent/90 shadow-sm'
              : 'bg-card border border-border text-foreground hover:bg-secondary'
          }`}
        >
          <a.icon className="w-4 h-4" />
          {a.label}
        </button>
      ))}
    </div>
  );
}