import { useDAStore } from "@/store/daStore";

/** Returns the screenshots for the currently active page */
export function useActiveScreenshots() {
  const { scrapeResult, activePageIndex } = useDAStore();
  if (!scrapeResult) return null;

  // Index 0 = home page (main screenshots)
  if (activePageIndex === 0) {
    return scrapeResult.screenshots;
  }

  // Index 1+ = extra pages
  const extraPage = scrapeResult.extraPages[activePageIndex - 1];
  if (extraPage) {
    return {
      desktop: extraPage.desktop,
      desktopFull: extraPage.desktopFull,
      desktopMid: extraPage.desktop, // extra pages don't have scroll captures
      desktopLower: extraPage.desktop,
      mobile: extraPage.mobile,
    };
  }

  return scrapeResult.screenshots;
}
