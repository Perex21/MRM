import { cn } from "@/lib/cn";

type RollTextProps = {
  children: string;
  className?: string;
};

/**
 * Character roll: on hover or keyboard focus of the nearest `.group`, each
 * letter rolls up and an identical copy rolls in beneath it, staggered left
 * to right. Pure CSS (see `.roll-char` in globals.css), so it costs no
 * JavaScript and does nothing at all under reduced motion.
 *
 * The real label is read once by assistive technology; the animated glyphs
 * are hidden from it.
 */
export function RollText({ children, className }: RollTextProps) {
  return (
    <span className={cn("relative inline-flex overflow-hidden", className)}>
      <span className="sr-only">{children}</span>
      <span aria-hidden="true" className="flex whitespace-pre">
        {[...children].map((char, index) => (
          <span key={index} className="roll-char relative block" style={{ "--i": index } as React.CSSProperties}>
            <span className="block">{char}</span>
            <span className="absolute inset-x-0 top-full block">{char}</span>
          </span>
        ))}
      </span>
    </span>
  );
}
