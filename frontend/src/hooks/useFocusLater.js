import { useCallback, useEffect, useRef } from "react";

/**
 * Ref callback that focuses an element when it mounts, e.g. the Cancel
 * button of an inline confirm. It lives at module level so React calls it
 * once per mount, not on every render.
 */
export function focusOnMount(node) {
  node?.focus();
}

/**
 * Focus an element after the next render, for when the target only exists
 * once the state change has rendered (a trigger button that comes back after
 * a confirm closes). Pass a function that finds the element.
 */
export default function useFocusLater() {
  const pending = useRef(null);

  useEffect(() => {
    const find = pending.current;
    if (!find) return;
    pending.current = null;
    find()?.focus();
  });

  return useCallback((find) => {
    pending.current = find;
  }, []);
}
