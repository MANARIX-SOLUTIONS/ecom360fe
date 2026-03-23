import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Scrolls window to top when the route changes.
 * Fixes the case where navigating to a new page leaves scroll position from the previous page.
 */
export function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
