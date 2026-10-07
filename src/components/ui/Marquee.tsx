import { type ReactNode } from "react";

interface MarqueeProps {
  items: ReactNode[];
}

/**
 * Marquee - the homepage's "pulse strip": a continuously scrolling
 * row of short items (headlines, "NEW" callouts). The content is
 * duplicated once so the CSS loop (translateX 0% -> -50%) is seamless.
 */
export function Marquee({ items }: MarqueeProps) {
  return (
    <div className="group flex overflow-hidden">
      <div className="flex shrink-0 animate-marquee items-center gap-8 pr-8 group-hover:[animation-play-state:paused]">
        {items}
      </div>
      <div
        className="flex shrink-0 animate-marquee items-center gap-8 pr-8 group-hover:[animation-play-state:paused]"
        aria-hidden="true"
      >
        {items}
      </div>
    </div>
  );
}
