import { ChevronDown, Eye, EyeOff } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

const labelFont = "font-[Geist,system-ui,sans-serif] text-xs font-medium leading-none tracking-normal";

export type StatusOption = { id: string; label: string };

/** Custom status filter dropdown.
 *  The "Done" option (any option with id === "done") gets an inline Eye/EyeOff
 *  button that controls `showDone` without changing the selected filter value.
 */
export function StatusFilterDropdown({
  label = "Status",
  value,
  onChange,
  options,
  showDone,
  onToggleDone,
}: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: StatusOption[];
  showDone: boolean;
  onToggleDone: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const selectedLabel = options.find((o) => o.id === value)?.label ?? options[0]?.label;

  return (
    <div className="flex min-w-40 flex-col gap-2" ref={ref}>
      <span className={`${labelFont} text-[#8e9192] uppercase`}>{label}</span>

      {/* Trigger */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-2 rounded-lg border border-white/10 bg-[#09090b] px-3 py-2 text-left text-white transition-colors outline-none hover:border-white/20"
        >
          <span className={`${labelFont}`}>{selectedLabel}</span>
          <ChevronDown aria-hidden="true" size={14} className={`shrink-0 text-[#8e9192] transition-transform duration-150 ${isOpen ? "rotate-180" : ""}`} />
        </button>

        {/* Panel */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -2 }}
              transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
              className="absolute top-full right-0 left-0 z-50 mt-1 overflow-hidden rounded-xl border border-white/10 bg-[#09090b]/95 shadow-2xl backdrop-blur-xl"
            >
              {options.map((option) => {
                const isSelected = option.id === value;

                if (option.id === "done") {
                  return (
                    <div key="done" className={`flex items-center ${isSelected ? "bg-white/10" : "hover:bg-white/5"}`}>
                      <button
                        type="button"
                        className={`${labelFont} flex-1 cursor-pointer px-3 py-2.5 text-left transition-colors ${isSelected ? "text-white" : "text-[#c4c7c8] hover:text-white"}`}
                        onClick={() => {
                          onChange("done");
                          setIsOpen(false);
                        }}
                      >
                        Done
                      </button>
                      {/* Inline eye toggle — stops propagation so it doesn't select "done" */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleDone();
                        }}
                        className={`mr-2.5 shrink-0 cursor-pointer rounded p-1 transition-colors ${showDone ? "text-[#8e9192] hover:text-white" : "text-white"}`}
                        title={showDone ? "Hide done tasks" : "Show done tasks"}
                      >
                        {showDone ? <Eye aria-hidden="true" size={14} /> : <EyeOff aria-hidden="true" size={14} />}
                      </button>
                    </div>
                  );
                }

                return (
                  <button
                    key={option.id}
                    type="button"
                    className={`${labelFont} w-full cursor-pointer px-3 py-2.5 text-left transition-colors ${isSelected ? "bg-white/10 text-white" : "text-[#c4c7c8] hover:bg-white/5 hover:text-white"}`}
                    onClick={() => {
                      onChange(option.id);
                      setIsOpen(false);
                    }}
                  >
                    {option.label}
                  </button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
