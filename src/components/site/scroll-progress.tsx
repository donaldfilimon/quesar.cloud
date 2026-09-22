import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";

export function ScrollProgress() {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let frame = 0;

    function update() {
      frame = 0;
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      setValue((window.scrollY / max) * 100);
    }

    function onScroll() {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    }

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <Progress
      value={value}
      aria-hidden="true"
      className="pointer-events-none fixed top-0 left-0 z-[70] h-[1.5px] rounded-none"
    />
  );
}
