// Single-instance SVG filter that smooths overlapping/adjacent painted cells
// into soft organic blobs. Mounted once per editor; referenced by id from CSS.
//
// Tuning:
//   stdDeviation     — blur radius in CSS pixels; controls how far cells reach
//   feColorMatrix    — alpha threshold; the trailing values (slope, bias)
//                      decide how sharply the blur is reclaimed into solid fill.
export function GooFilter({ id = 'goo' }: { id?: string }) {
  return (
    <svg
      aria-hidden="true"
      width="0"
      height="0"
      style={{ position: 'absolute', pointerEvents: 'none' }}
    >
      <defs>
        <filter id={id} x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.4" result="blur" />
          <feColorMatrix
            in="blur"
            mode="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 16 -7"
            result="goo"
          />
          <feComposite in="goo" in2="SourceGraphic" operator="atop" />
        </filter>
      </defs>
    </svg>
  );
}
