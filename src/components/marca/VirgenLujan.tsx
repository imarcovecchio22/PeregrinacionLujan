// Ilustración propia (SVG) de Nuestra Señora de Luján: silueta acampanada con manto
// celeste y túnica blanca, manos juntas, corona, medialuna a los pies y resplandor dorado.
// Dibujada en código para que pese poco y se vea nítida en cualquier pantalla.

const ORO = "#E9B949";
const ORO_OSCURO = "#B8860B";
const CELESTE = "#74ACDF";
const CELESTE_OSCURO = "#4A86C0";
const ROSTRO = "#8E5B3E";

export function VirgenLujan({ className }: { className?: string }) {
  // Rayos del resplandor: alternan largos y cortos alrededor de la figura.
  const rayos = Array.from({ length: 36 }, (_, i) => {
    const angulo = (i / 36) * Math.PI * 2;
    const largo = i % 2 === 0 ? 96 : 80; // dentro del dibujo, para que el resplandor quede redondo
    const ancho = i % 2 === 0 ? 0.045 : 0.03;
    const x1 = 100 + Math.cos(angulo - ancho) * 30;
    const y1 = 128 + Math.sin(angulo - ancho) * 30;
    const x2 = 100 + Math.cos(angulo) * largo;
    const y2 = 128 + Math.sin(angulo) * largo;
    const x3 = 100 + Math.cos(angulo + ancho) * 30;
    const y3 = 128 + Math.sin(angulo + ancho) * 30;
    return `M${x1.toFixed(1)},${y1.toFixed(1)} L${x2.toFixed(1)},${y2.toFixed(1)} L${x3.toFixed(1)},${y3.toFixed(1)} Z`;
  });

  return (
    <svg viewBox="0 0 200 256" role="img" aria-label="Nuestra Señora de Luján" className={className}>
      <defs>
        <radialGradient id="vl-brillo" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFF3C4" stopOpacity="0.95" />
          <stop offset="55%" stopColor={ORO} stopOpacity="0.35" />
          <stop offset="100%" stopColor={ORO} stopOpacity="0" />
        </radialGradient>
        <linearGradient id="vl-manto" x1="0" x2="1">
          <stop offset="0%" stopColor={CELESTE_OSCURO} />
          <stop offset="45%" stopColor={CELESTE} />
          <stop offset="100%" stopColor={CELESTE_OSCURO} />
        </linearGradient>
        <linearGradient id="vl-luna" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#F5F7FA" />
          <stop offset="100%" stopColor="#B9C2CC" />
        </linearGradient>
      </defs>

      {/* Resplandor */}
      <circle cx="100" cy="128" r="98" fill="url(#vl-brillo)" />
      <g fill={ORO} opacity="0.9">
        {rayos.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>

      {/* Manto celeste (forma acampanada) */}
      <path
        d="M100,62 C80,64 70,78 67,98 L50,214 Q100,226 150,214 L133,98 C130,78 120,64 100,62 Z"
        fill="url(#vl-manto)"
        stroke="#FFFFFF"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      {/* Estrellas del manto */}
      <g fill="#FFFFFF">
        {[
          [78, 120],
          [124, 128],
          [70, 160],
          [132, 168],
          [64, 196],
          [138, 200],
          [86, 184],
          [116, 150],
        ].map(([x, y], i) => (
          <path
            key={i}
            d={`M${x},${y - 3.2} L${x + 0.9},${y - 0.9} L${x + 3.2},${y} L${x + 0.9},${y + 0.9} L${x},${y + 3.2} L${x - 0.9},${y + 0.9} L${x - 3.2},${y} L${x - 0.9},${y - 0.9} Z`}
          />
        ))}
      </g>
      {/* Túnica blanca */}
      <path d="M100,104 L83,218 Q100,222 117,218 Z" fill="#FFFFFF" />
      <path d="M100,104 L83,218 Q100,222 117,218 Z" fill="none" stroke="#DDE6EE" strokeWidth="1" />

      {/* Manos juntas */}
      <path d="M100,94 C95,99 95,108 100,113 C105,108 105,99 100,94 Z" fill="#F3D9C6" stroke="#C99A7A" strokeWidth="1" />
      <line x1="100" y1="96" x2="100" y2="111" stroke="#C99A7A" strokeWidth="0.8" />

      {/* Rostrillo (marco claro del rostro) y rostro */}
      <ellipse cx="100" cy="56" rx="15" ry="17" fill="#FFFFFF" stroke={ORO} strokeWidth="2" />
      <ellipse cx="100" cy="57" rx="9.5" ry="12" fill={ROSTRO} />

      {/* Corona */}
      <path
        d="M84,40 L86,26 L92,34 L100,20 L108,34 L114,26 L116,40 Z"
        fill={ORO}
        stroke={ORO_OSCURO}
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <rect x="84" y="38" width="32" height="5" rx="1.5" fill={ORO} stroke={ORO_OSCURO} strokeWidth="1.2" />
      <path d="M100,8 L100,19 M96,12 L104,12" stroke={ORO} strokeWidth="2.4" strokeLinecap="round" />

      {/* Medialuna a los pies */}
      <path
        d="M58,222 Q100,252 142,222 Q100,240 58,222 Z"
        fill="url(#vl-luna)"
        stroke="#9AA5B1"
        strokeWidth="1"
      />
    </svg>
  );
}
