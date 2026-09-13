export const labelFont = "font-[Geist,system-ui,sans-serif] text-xs font-bold leading-none tracking-wider";

/**
 * Teamy Centralized Button & Brand Styling Utility Classes.
 * Colors are defined as CSS Custom Properties in src/index.css (:root).
 * To update the app's purple palette, simply change the variables in index.css!
 */
export const teamyPrimaryBtnClass = `${labelFont} teamy-btn-primary inline-flex shrink-0 whitespace-nowrap cursor-pointer items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs uppercase disabled:cursor-not-allowed disabled:opacity-50`;

export const teamyGlassBtnClass = `${labelFont} teamy-btn-glass inline-flex shrink-0 whitespace-nowrap cursor-pointer items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs uppercase disabled:cursor-not-allowed disabled:opacity-50`;

export const teamyFabClass = `${labelFont} teamy-fab fixed bottom-8 right-8 z-40 flex cursor-pointer items-center gap-2.5 rounded-full px-5.5 py-3.5 text-xs font-bold uppercase disabled:cursor-not-allowed disabled:opacity-50`;

export const teamyPillActiveClass = `${labelFont} teamy-pill-active rounded-lg px-4 py-2 text-xs uppercase`;
