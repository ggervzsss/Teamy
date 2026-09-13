import type { LucideIcon } from "lucide-react";

export type MiniMetricItem = {
  icon?: LucideIcon;
  label: string;
  value: number;
};

export function MyTaskHeader({
  isTicketsSection,
  metrics,
}: {
  isTicketsSection: boolean;
  metrics: MiniMetricItem[];
}) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-6">
      <div className="min-w-0 flex-1">
        <h1 className="m-0 text-3xl font-bold tracking-tight text-white">
          {isTicketsSection ? "Tickets" : "My Tasks"}
        </h1>
        <p className="m-0 mt-1 text-sm text-[#8e9192]">
          {isTicketsSection
            ? "Collaborative tickets assigned to or shared with you in this workspace."
            : "Your assigned project work and private personal tasks in one place."}
        </p>
      </div>

      {/* Mini Metrics Panel */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-2 shadow-inner backdrop-blur-md">
        {metrics.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className="flex items-center gap-2.5 rounded-lg border border-white/10 bg-white/5 px-3.5 py-2 transition-all duration-200 hover:border-[#a855f7]/40 hover:bg-[#a855f7]/10"
            >
              {Icon && <Icon className="text-[#d8b4fe]" size={15} />}
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8e9192]">{item.label}</span>
              <span className="text-sm font-bold text-white">{item.value}</span>
            </div>
          );
        })}
      </div>
    </header>
  );
}
