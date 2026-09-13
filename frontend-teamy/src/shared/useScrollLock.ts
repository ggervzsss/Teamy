import { useEffect } from "react";

export function useScrollLock(isLocked: boolean) {
  useEffect(() => {
    if (isLocked) {
      const originalOverflow = document.body.style.overflow;
      const originalPaddingRight = document.body.style.paddingRight;

      // Measure scrollbar width to compensate padding and prevent reflow layout shift
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`;
      }
      document.body.style.overflow = "hidden";

      const mainContainer = document.getElementById("main-scroll-container");
      let originalMainOverflow = "";
      if (mainContainer) {
        originalMainOverflow = mainContainer.style.overflow;
        mainContainer.style.overflow = "hidden";
      }

      return () => {
        document.body.style.overflow = originalOverflow;
        document.body.style.paddingRight = originalPaddingRight;
        if (mainContainer) {
          mainContainer.style.overflow = originalMainOverflow;
        }
      };
    }
  }, [isLocked]);
}
