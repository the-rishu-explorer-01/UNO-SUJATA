/** Technical drawings used as page visuals. Decorative: marked aria-hidden. Replace with photography when approved. */

export function SectionDrawing({ label = "FIG. 02" }: { label?: string }) {
  return (
    <figure className="border border-line bg-paper p-6 sm:p-8">
      <svg viewBox="0 0 480 360" className="h-auto w-full" aria-hidden="true">
        <g stroke="#0E0F11" fill="none" strokeWidth="1">
          <rect x="60" y="70" width="360" height="200" />
          <rect x="60" y="70" width="360" height="200" strokeOpacity="0.25" transform="translate(16 -14)" />
          <line x1="60" y1="300" x2="420" y2="300" strokeDasharray="4 4" />
          <line x1="60" y1="296" x2="60" y2="304" />
          <line x1="420" y1="296" x2="420" y2="304" />
          <circle cx="240" cy="170" r="54" strokeWidth="1.5" />
          <circle cx="240" cy="170" r="30" stroke="#A9834A" strokeWidth="2" />
        </g>
        <g fontFamily="JetBrains Mono, monospace" fontSize="11" fill="#7D5F33">
          <text x="60" y="326">360</text>
          <text x="262" y="112">Ø 108</text>
          <text x="262" y="164">Ø 60</text>
        </g>
      </svg>
      <figcaption className="mt-3 flex justify-between border-t border-line pt-3 font-mono text-[11px] text-ink/65">
        <span>{label}</span>
        <span>TO PRINT</span>
      </figcaption>
    </figure>
  );
}

/** Horizontal process diagram: nodes joined by a measured line. */
export function ProcessLine({ count, labels }: { count: number; labels: string[] }) {
  return (
    <svg viewBox="0 0 1000 120" className="w-full" role="img" aria-label={`Process: ${labels.join(", ")}`}>
      <line x1="40" y1="60" x2="960" y2="60" stroke="#D8D2C4" strokeWidth="2" />
      {labels.map((l, i) => {
        const x = 40 + (920 / Math.max(count - 1, 1)) * i;
        return (
          <g key={l}>
            <rect x={x - 8} y="52" width="16" height="16" fill="#A9834A" />
            <text x={x} y="100" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="11" fill="#0E0F11" opacity="0.6">
              {String(i + 1).padStart(2, "0")}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
