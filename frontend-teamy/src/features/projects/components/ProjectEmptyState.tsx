import type { LucideIcon } from "lucide-react";

type ProjectEmptyStateProps = {
  actionLabel?: string;
  onAction?: () => void;
  icon: LucideIcon;
  label: string;
  title: string;
  body: string;
};

const labelFont = "font-[Geist,system-ui,sans-serif] text-xs font-medium leading-none tracking-normal";

function ProjectEmptyState({ actionLabel, onAction, body, icon: Icon, label, title }: ProjectEmptyStateProps) {
  return (
    <div className="mx-auto flex w-full max-w-360 flex-col gap-12 max-[860px]:gap-8">
      <header className="flex items-end justify-between gap-6 border-b border-white/10 pb-6 max-[860px]:flex-col max-[860px]:items-start">
        <div>
          <span className={`${labelFont} text-[#8e9192] uppercase`}>{label}</span>
          <h1 className="m-0 mt-2 text-[clamp(36px,6vw,48px)] leading-[1.1] font-extrabold text-white">{title}</h1>
          <p className="mt-2 max-w-3xl text-lg leading-relaxed text-[#8e9192]">{body}</p>
        </div>
      </header>

      <section className="flex min-h-90 flex-col items-center justify-center gap-5 rounded-xl border border-white/15 bg-white/5 p-10 text-center shadow-[0_20px_40px_rgba(0,0,0,0.5)] backdrop-blur-[60px]">
        <span className="grid size-16 place-items-center rounded-full border border-white/10 bg-white/10 text-white">
          <Icon aria-hidden="true" size={30} />
        </span>
        <div>
          <h2 className="m-0 text-2xl font-bold text-white">No real data yet</h2>
          <p className="mx-auto mt-2 max-w-xl text-[#8e9192]">This project area is connected to the selected project, but its records will be added in the next data workflow pass.</p>
        </div>
        {actionLabel ? (
          <button onClick={onAction} className={`${labelFont} rounded border border-white/20 bg-transparent px-4 py-3 text-white uppercase opacity-60`} type="button">
            {actionLabel}
          </button>
        ) : null}
      </section>
    </div>
  );
}

export default ProjectEmptyState;
