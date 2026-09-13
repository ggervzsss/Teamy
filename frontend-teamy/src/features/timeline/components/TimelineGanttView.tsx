import { useEffect, useMemo, useRef, useState } from "react";
import { RotateCcw, Zap, ZoomIn, ZoomOut } from "lucide-react";
import { toLocalDate } from "@/shared/dateTime";
import { getUserDisplayName } from "@/shared/userDisplay";
import type { TimelineTask } from "../utils/timelineUtils";
import { buildMonthHeaders, dayIndex, formatShortDate, generateDateRange, getDaysBetween, getGanttRange, isSameDay, isWeekend, packTasksIntoLanes, statusConfig } from "../utils/timelineUtils";
import { AssigneeStack, StatusBadge } from "./TaskDetailTimelineModal";

const GANTT_NAME_COL = 0;
const panelClass = "gpu-panel rounded-xl border border-white/10 bg-white/4 shadow-[0_20px_40px_rgba(0,0,0,0.35)] backdrop-blur-[60px]";

function GanttTooltip({ task }: { task: TimelineTask }) {
  const startDate = toLocalDate(task.start_date);
  const dueDate = task.due_date ? toLocalDate(task.due_date) : null;
  const duration = dueDate ? getDaysBetween(startDate, dueDate) : null;

  return (
    <div className="pointer-events-none absolute top-full left-0 z-50 mt-2 hidden max-w-xs min-w-56 rounded-lg border border-white/15 bg-[#18181b] p-4 shadow-[0_16px_48px_rgba(0,0,0,0.5)] group-hover/bar:pointer-events-auto group-hover/bar:block">
      <p className="m-0 text-sm font-semibold text-white">{task.title}</p>
      <div className="mt-2 flex items-center gap-2">
        <StatusBadge status={task.effectiveStatus} />
        {duration ? (
          <span className="text-xs text-[#8e9192]">
            {duration} day{duration === 1 ? "" : "s"}
          </span>
        ) : null}
      </div>
      <div className="mt-3 flex flex-col gap-1 text-xs text-[#c4c7c8]">
        <span>
          <strong className="text-white/70">Start:</strong> {formatShortDate(startDate)}
        </span>
        <span>
          <strong className="text-white/70">Due:</strong> {dueDate ? formatShortDate(dueDate) : "No due date"}
        </span>
      </div>
      {task.assignees.length > 0 ? (
        <div className="mt-3 flex items-center gap-2">
          <AssigneeStack assignees={task.assignees} />
          <span className="text-xs text-[#8e9192]">{task.assignees.map((a) => getUserDisplayName(a.user)).join(", ")}</span>
        </div>
      ) : null}
    </div>
  );
}

export function TimelineGanttView({ currentDate, onSelect, tasks }: { currentDate: Date; onSelect: (item: TimelineTask) => void; tasks: TimelineTask[] }) {
  const panelRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [dayWidth, setDayWidth] = useState(28);

  const { start: ganttStart, end: ganttEnd } = useMemo(() => getGanttRange(tasks, currentDate), [tasks, currentDate]);
  const dates = useMemo(() => generateDateRange(ganttStart, ganttEnd), [ganttStart, ganttEnd]);
  const monthHeaders = useMemo(() => buildMonthHeaders(dates), [dates]);
  const totalWidth = dates.length * dayWidth;
  const today = new Date();
  const todayStartOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const todayIdx = dayIndex(ganttStart, todayStartOfDay);
  const isTodayVisible = todayIdx >= 0 && todayIdx < dates.length;

  const isCompactView = dayWidth < 16;
  const ganttRowHeight = isCompactView ? 34 : 44;
  const ganttBarHeight = isCompactView ? 22 : 28;

  const [isPackLanesEnabled, setIsPackLanesEnabled] = useState(true);

  const sortedTasks = useMemo(
    () =>
      [...tasks]
        .filter((task) => {
          const taskStart = toLocalDate(task.start_date);
          const taskEnd = task.due_date ? toLocalDate(task.due_date) : taskStart;
          return taskStart <= ganttEnd && taskEnd >= ganttStart;
        })
        .sort((a, b) => toLocalDate(a.start_date).getTime() - toLocalDate(b.start_date).getTime()),
    [tasks, ganttStart, ganttEnd],
  );

  const taskLanes = useMemo(() => {
    if (!isPackLanesEnabled) {
      return sortedTasks.map((t) => [t]);
    }
    return packTasksIntoLanes(sortedTasks);
  }, [sortedTasks, isPackLanesEnabled]);

  const hasInitialScrolledRef = useRef(false);

  // Initial scroll to Today (runs once on load)
  useEffect(() => {
    if (!hasInitialScrolledRef.current && scrollRef.current && isTodayVisible) {
      hasInitialScrolledRef.current = true;
      const scrollTo = todayIdx * dayWidth - scrollRef.current.clientWidth / 2 + GANTT_NAME_COL;
      scrollRef.current.scrollLeft = Math.max(0, scrollTo);
    }
  }, [todayIdx, isTodayVisible, dayWidth]);

  // Wheel listener: isolates scrolling & focal-point zooming inside Gantt section from whole-page scroll
  useEffect(() => {
    const panel = panelRef.current;
    const container = scrollRef.current;
    if (!panel || !container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (e.ctrlKey || e.metaKey) {
        // Ctrl + Wheel: Focal point zoom centered around mouse cursor position
        const rect = container.getBoundingClientRect();
        const mouseOffsetX = e.clientX - rect.left;
        const contentX = container.scrollLeft + mouseOffsetX;

        setDayWidth((prevDayWidth) => {
          const delta = e.deltaY < 0 ? 4 : -4;
          const nextDayWidth = Math.min(60, Math.max(4, prevDayWidth + delta));

          if (nextDayWidth !== prevDayWidth) {
            const cursorDateRatio = contentX / prevDayWidth;
            const newContentX = cursorDateRatio * nextDayWidth;
            const targetScrollLeft = Math.max(0, newContentX - mouseOffsetX);

            requestAnimationFrame(() => {
              if (container) {
                container.scrollLeft = targetScrollLeft;
              }
            });
          }

          return nextDayWidth;
        });
      } else if (e.shiftKey) {
        // Shift + Wheel: Horizontal timeline scroll
        container.scrollLeft += e.deltaY;
      } else {
        // Normal Wheel: Scroll vertical rows if scrollable, otherwise scroll timeline dates horizontally
        const maxScrollTop = container.scrollHeight - container.clientHeight;
        const isAtTop = container.scrollTop <= 0;
        const isAtBottom = container.scrollTop >= maxScrollTop - 1;

        if (maxScrollTop > 0 && ((e.deltaY > 0 && !isAtBottom) || (e.deltaY < 0 && !isAtTop))) {
          container.scrollTop += e.deltaY;
        } else {
          container.scrollLeft += e.deltaY || e.deltaX;
        }
      }
    };

    panel.addEventListener("wheel", handleWheel, { passive: false });
    return () => panel.removeEventListener("wheel", handleWheel);
  }, []);

  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const onMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeft(scrollRef.current.scrollLeft);
  };

  const onMouseLeave = () => {
    setIsDragging(false);
  };

  const onMouseUp = () => {
    setIsDragging(false);
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    scrollRef.current.scrollLeft = scrollLeft - walk;
  };

  const zoomAtCenter = (nextWidth: number) => {
    const container = scrollRef.current;
    if (!container) {
      setDayWidth(nextWidth);
      return;
    }
    const oldWidth = dayWidth;
    const viewportMiddle = container.clientWidth / 2;
    const contentX = container.scrollLeft + viewportMiddle;
    const cursorRatio = contentX / oldWidth;
    const newContentX = cursorRatio * nextWidth;
    const targetScrollLeft = Math.max(0, newContentX - viewportMiddle);

    setDayWidth(nextWidth);
    requestAnimationFrame(() => {
      if (container) {
        container.scrollLeft = targetScrollLeft;
      }
    });
  };

  const handleZoomIn = () => zoomAtCenter(Math.min(60, dayWidth + 4));
  const handleZoomOut = () => zoomAtCenter(Math.max(4, dayWidth - 4));
  const handleResetZoom = () => zoomAtCenter(28);

  const handleFitAll = () => {
    if (scrollRef.current && dates.length > 0) {
      const availableWidth = scrollRef.current.clientWidth - 16;
      const fitWidth = Math.max(4, Math.floor(availableWidth / dates.length));
      setDayWidth(fitWidth);
      scrollRef.current.scrollLeft = 0;
    }
  };

  const handleJumpToToday = () => {
    if (scrollRef.current && isTodayVisible) {
      const scrollTo = todayIdx * dayWidth - scrollRef.current.clientWidth / 2 + GANTT_NAME_COL;
      scrollRef.current.scrollTo({ left: Math.max(0, scrollTo), behavior: "smooth" });
    }
  };

  return (
    <div className={`${panelClass} overscroll-contain overflow-hidden`} ref={panelRef}>
      {/* ── Zoom Controls Toolbar ────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#09090b]/80 px-4 py-2.5 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#8e9192]">Gantt Zoom</span>
          <span className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] font-bold text-white">
            {Math.round((dayWidth / 28) * 100)}%
          </span>
          {isTodayVisible ? (
            <button
              type="button"
              onClick={handleJumpToToday}
              className="cursor-pointer rounded-lg border border-[#a855f7]/30 bg-[#a855f7]/15 px-3 py-1 text-xs font-bold uppercase text-white shadow-[0_0_12px_rgba(168,85,247,0.2)] transition-all hover:bg-[#a855f7]/25 active:scale-95"
            >
              Jump to Today
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setIsPackLanesEnabled(!isPackLanesEnabled)}
            className={`flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1 text-xs font-bold uppercase transition-all active:scale-95 ${
              isPackLanesEnabled
                ? "border-[#a855f7]/40 bg-[#a855f7]/20 text-white shadow-[0_0_12px_rgba(168,85,247,0.25)]"
                : "border-white/10 bg-white/5 text-[#8e9192] hover:bg-white/10 hover:text-white"
            }`}
            title={isPackLanesEnabled ? "Lane packing enabled: Non-overlapping tasks share horizontal rows" : "Lane packing disabled: 1 task per row"}
          >
            <Zap size={13} className={isPackLanesEnabled ? "text-[#a855f7]" : "text-[#8e9192]"} />
            {isPackLanesEnabled ? "Packed Lanes" : "Standard Rows"}
          </button>
          <span className="hidden text-[10px] text-[#8e9192] sm:inline">
            (Hold <kbd className="rounded border border-white/20 bg-white/10 px-1 py-0.5 text-[9px] text-white">Ctrl</kbd> + Scroll to zoom)
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Zoom Level Presets */}
          <div className="flex rounded-lg border border-white/10 bg-white/5 p-0.5">
            {[
              { label: "Fit All", action: "fit" as const },
              { label: "Compact", action: 10 },
              { label: "Normal", action: 28 },
              { label: "Detailed", action: 44 },
            ].map((preset) => {
              const isSelected = typeof preset.action === "number" && dayWidth === preset.action;
              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    if (preset.action === "fit") {
                      handleFitAll();
                    } else {
                      zoomAtCenter(preset.action);
                    }
                  }}
                  className={`cursor-pointer rounded-md px-2.5 py-1 text-xs font-semibold uppercase transition-all ${
                    isSelected ? "bg-[#a855f7]/25 text-white font-bold border border-[#a855f7]/30 shadow-[0_0_10px_rgba(168,85,247,0.3)]" : "text-[#8e9192] hover:bg-[#a855f7]/10 hover:text-white"
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          {/* Stepper Zoom Buttons */}
          <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 p-0.5">
            <button
              type="button"
              onClick={handleZoomOut}
              disabled={dayWidth <= 4}
              title="Zoom out"
              className="flex size-7 cursor-pointer items-center justify-center rounded-md border-0 bg-transparent text-[#8e9192] transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ZoomOut size={15} />
            </button>
            <button
              type="button"
              onClick={handleResetZoom}
              disabled={dayWidth === 28}
              title="Reset zoom (100%)"
              className="flex size-7 cursor-pointer items-center justify-center rounded-md border-0 bg-transparent text-[#8e9192] transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              <RotateCcw size={14} />
            </button>
            <button
              type="button"
              onClick={handleZoomIn}
              disabled={dayWidth >= 60}
              title="Zoom in"
              className="flex size-7 cursor-pointer items-center justify-center rounded-md border-0 bg-transparent text-[#8e9192] transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ZoomIn size={15} />
            </button>
          </div>
        </div>
      </div>

      <div
        className={`custom-scrollbar overscroll-contain overflow-x-auto overflow-y-auto ${isDragging ? "cursor-grabbing select-none" : "cursor-grab"}`}
        onMouseDown={onMouseDown}
        onMouseLeave={onMouseLeave}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        ref={scrollRef}
        style={{ maxHeight: "75vh" }}
      >
        <div className="relative" style={{ minWidth: GANTT_NAME_COL + totalWidth }}>
          {/* ── Month Header ──────────────────────────────────── */}
          <div className="sticky top-0 z-30 flex border-b border-white/10 bg-[#0e0e10]">
            <div className="flex">
              {monthHeaders.map((header) => (
                <div
                  className="truncate border-r border-white/10 px-1 py-2 text-center text-xs font-semibold text-white"
                  key={header.label}
                  style={{ width: header.days * dayWidth }}
                >
                  {header.days * dayWidth >= 30 ? header.label : ""}
                </div>
              ))}
            </div>
          </div>

          {/* ── Day Header ────────────────────────────────────── */}
          <div className="sticky top-9.25 z-30 flex border-b border-white/10 bg-[#0e0e10]">
            <div className="flex">
              {dates.map((date, idx) => {
                const isToday = isSameDay(date, todayStartOfDay);
                const isWkEnd = isWeekend(date);
                const isFirstOfMonth = date.getDate() === 1;
                const showDateText = dayWidth >= 16 || (dayWidth >= 8 && (date.getDate() === 1 || date.getDate() === 15)) || (dayWidth < 8 && date.getDate() === 1);

                return (
                  <div
                    className={`flex items-center justify-center border-r text-[10px] ${isToday ? "bg-white/15 font-bold text-white" : isWkEnd ? "border-white/5 bg-white/2 text-white/25" : "border-white/5 text-white/40"} ${isFirstOfMonth ? "border-l border-l-white/15" : ""}`}
                    key={idx}
                    style={{ width: dayWidth, height: 24 }}
                  >
                    {showDateText ? date.getDate() : ""}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Task Rows ───────────────────────────────────────────────────── */}
          {taskLanes.length === 0 ? (
            <div className="flex items-center justify-center px-6 py-12 text-[#8e9192]">No tasks in the visible range. Try navigating to a different month.</div>
          ) : (
            <>
              {taskLanes.map((lane, laneIdx) => (
                <div
                  className="group/row relative border-b border-white/5 last:border-b-0 hover:bg-white/2"
                  key={`lane-${laneIdx}`}
                  style={{
                    height: ganttRowHeight,
                    width: totalWidth,
                    backgroundImage: `repeating-linear-gradient(90deg, transparent 0, transparent ${dayWidth - 1}px, rgba(255,255,255,0.04) ${dayWidth - 1}px, rgba(255,255,255,0.04) ${dayWidth}px)`,
                  }}
                >
                  {lane.map((task) => {
                    const cfg = statusConfig[task.effectiveStatus];
                    const taskStart = toLocalDate(task.start_date);
                    const taskEnd = task.due_date ? toLocalDate(task.due_date) : taskStart;
                    const clampedStart = taskStart < ganttStart ? ganttStart : taskStart;
                    const clampedEnd = taskEnd > ganttEnd ? ganttEnd : taskEnd;
                    const startIdx = dayIndex(ganttStart, clampedStart);
                    const endIdx = dayIndex(ganttStart, clampedEnd);
                    const barLeft = startIdx * dayWidth;
                    const barWidth = Math.max(dayWidth, (endIdx - startIdx + 1) * dayWidth);

                    return (
                      <div
                        className="group/bar absolute z-10 flex cursor-pointer items-center overflow-hidden rounded-md transition-shadow hover:shadow-[0_0_12px_rgba(255,255,255,0.15)]"
                        key={`task-${task.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelect(task);
                        }}
                        style={{
                          left: barLeft,
                          width: barWidth,
                          height: ganttBarHeight,
                          top: (ganttRowHeight - ganttBarHeight) / 2,
                          backgroundColor: cfg.bg,
                          border: `1px solid ${cfg.border}`,
                        }}
                      >
                        <div className="absolute inset-y-0 left-0 w-1 rounded-l-md" style={{ backgroundColor: cfg.color }} />
                        <span className="truncate px-2.5 text-xs font-medium" style={{ color: cfg.color }}>
                          {barWidth >= 28 ? task.title : ""}
                        </span>
                        <GanttTooltip task={task} />
                      </div>
                    );
                  })}
                </div>
              ))}
            </>
          )}

          {/* ── Today Marker (vertical line) ────────────────────────────────── */}
          {isTodayVisible ? (
            <div
              className="pointer-events-none absolute z-50"
              style={{
                left: GANTT_NAME_COL + todayIdx * dayWidth + dayWidth / 2 - 1,
                top: 0,
                bottom: 0,
                width: 2,
                background: "linear-gradient(180deg, #f87171 0%, rgba(248,113,113,0.3) 100%)",
              }}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
