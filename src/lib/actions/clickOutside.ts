import type { Action } from "svelte/action";

type OutsideHandler = () => void;

export const clickOutside: Action<HTMLElement, OutsideHandler> = (
  node,
  onClickOutside = () => {}
) => {
  const handlePointerDown = (event: MouseEvent | TouchEvent) => {
    const target = event.target as Node | null;

    if (target && !node.contains(target)) {
      onClickOutside();
    }
  };

  document.addEventListener("mousedown", handlePointerDown, true);
  document.addEventListener("touchstart", handlePointerDown, true);

  return {
    update(newHandler = () => {}) {
      onClickOutside = newHandler;
    },
    destroy() {
      document.removeEventListener("mousedown", handlePointerDown, true);
      document.removeEventListener("touchstart", handlePointerDown, true);
    },
  };
};
