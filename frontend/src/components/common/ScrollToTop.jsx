import { useLayoutEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

// BrowserRouter keeps the old scroll position when the page changes.
// This puts every new page at the top. A link with a #hash scrolls to that
// section instead. Back and forward are left alone so the browser can
// return you to where you were.
export default function ScrollToTop() {
  const { pathname, hash } = useLocation();
  const navigationType = useNavigationType();

  useLayoutEffect(() => {
    if (navigationType === "POP") return;

    if (hash) {
      const id = decodeURIComponent(hash.slice(1));
      // Pages load lazily, so the section may not exist yet. Try for a moment.
      let tries = 0;
      const timer = setInterval(() => {
        const target = document.getElementById(id);
        if (target || ++tries > 20) {
          clearInterval(timer);
          target?.scrollIntoView({ block: "start" });
        }
      }, 50);
      return () => clearInterval(timer);
    }

    // "instant" overrides any smooth scroll set in CSS.
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname, hash, navigationType]);

  return null;
}
