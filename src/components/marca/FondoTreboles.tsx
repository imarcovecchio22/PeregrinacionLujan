/** Fondo con tréboles muy sutiles (San Patricio), como patrón SVG que no pesa nada. */
export function FondoTreboles() {
  return (
    <svg aria-hidden className="pointer-events-none absolute inset-0 h-full w-full" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="treboles" width="72" height="72" patternUnits="userSpaceOnUse" patternTransform="rotate(-12)">
          <Trebol x={18} y={18} />
          <Trebol x={54} y={54} />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#treboles)" />
    </svg>
  );
}

function Trebol({ x, y }: { x: number; y: number }) {
  // Tres hojas en forma de corazón + tallo.
  const hoja = "M0,0 C-2,-4 -8,-4 -8,-9 C-8,-13 -3,-14 0,-10 C3,-14 8,-13 8,-9 C8,-4 2,-4 0,0 Z";
  return (
    <g transform={`translate(${x},${y})`} fill="#FFFFFF" fillOpacity="0.07">
      <path d={hoja} />
      <path d={hoja} transform="rotate(120)" />
      <path d={hoja} transform="rotate(240)" />
      <path d="M0,0 Q3,7 1,12" stroke="#FFFFFF" strokeOpacity="0.07" strokeWidth="1.6" fill="none" />
    </g>
  );
}
