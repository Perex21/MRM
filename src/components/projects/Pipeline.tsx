import type { PipelineStage } from "@/content/projects";

type PipelineProps = {
  caption: string;
  stages: PipelineStage[];
};

/**
 * Schematic of a system's flow, drawn as the Divergence at reading scale:
 * stages sit on one straight path, and parallel parts branch off it.
 * Built from HTML rather than an image so it reflows, scales with text and
 * is read in order by assistive technology.
 */
export function Pipeline({ caption, stages }: PipelineProps) {
  return (
    <figure className="surface-ink p-6 sm:p-8 lg:p-12">
      <ol className="relative">
        {stages.map((stage, index) => (
          <li key={stage.label} className="relative grid grid-cols-[2.5rem_1fr] gap-x-4 pb-10 last:pb-0 sm:gap-x-6">
            {/* The straight path, joining this stage to the next. */}
            {index < stages.length - 1 && (
              <span aria-hidden="true" className="absolute top-10 bottom-0 left-5 w-px border-l border-dashed border-line" />
            )}
            <span
              aria-hidden="true"
              className="label flex size-10 items-center justify-center rounded-full border border-line text-fg-muted"
            >
              {String(index + 1).padStart(2, "0")}
            </span>

            <div className="min-w-0 pt-1.5">
              <h3 className="font-display text-heading font-medium">{stage.label}</h3>
              <p className="mt-2 max-w-prose text-fg-muted">{stage.detail}</p>

              {stage.parts && (
                <ul className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {stage.parts.map((part) => (
                    <li key={part} className="flex items-start gap-3 border-l border-accent py-1 pl-3 font-mono text-sm">
                      {part}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </li>
        ))}
      </ol>
      <figcaption className="label mt-10 border-t border-line pt-5 text-fg-faint">Schematic — {caption}</figcaption>
    </figure>
  );
}
