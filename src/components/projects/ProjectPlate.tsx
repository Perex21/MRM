/**
 * Abstract ink plate that stands in for a project preview until real
 * screenshots exist. Each plate is a variation of the Divergence, so it reads
 * as artwork rather than a fake interface.
 */

const branches = [
  "M96 240c0-90 60-150 168-178",
  "M96 180c40-70 120-60 150-130",
  "M96 210c70-20 90-90 190-96",
];

type ProjectPlateProps = {
  /** Zero-based position in the archive; selects the variation. */
  index: number;
  number: string;
};

export function ProjectPlate({ index, number }: ProjectPlateProps) {
  const branch = branches[index % branches.length];

  return (
    <figure>
      <svg
        viewBox="0 0 320 240"
        role="img"
        aria-label={`Abstract plate ${number}: a line leaving a straight path.`}
        className="block aspect-4/3 w-full bg-ink"
      >
        <circle cx="236" cy="86" r="34" fill="var(--color-cinnabar)" opacity={index === 0 ? 1 : 0.55} />
        <g fill="none">
          <path d="M96 240V0" stroke="var(--color-silver-dim)" strokeDasharray="2 8" />
          <path d={branch} stroke="var(--color-parchment)" strokeWidth="1.5" strokeLinecap="round" />
        </g>
        <path fill="var(--color-ink-raised)" d="M0 240v-34c50-14 90 8 150-6s110-22 170-4v44z" />
      </svg>
      <figcaption className="label mt-3 text-fg-faint">
        Plate {number} — abstract; screenshots to follow
      </figcaption>
    </figure>
  );
}
