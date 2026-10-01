// Horas en America/Argentina/Buenos_Aires, independientemente de la zona del dispositivo
// o del servidor (Vercel corre en UTC).

export const ZONA = "America/Argentina/Buenos_Aires";

const partesFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: ZONA,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function partes(d: Date) {
  const p = Object.fromEntries(partesFmt.formatToParts(d).map((x) => [x.type, x.value]));
  return {
    anio: Number(p.year),
    mes: Number(p.month),
    dia: Number(p.day),
    hora: Number(p.hour),
    minuto: Number(p.minute),
    segundo: Number(p.second),
  };
}

/** Diferencia (ms) entre la hora local de la zona y UTC en ese instante. */
function offsetMs(d: Date): number {
  const p = partes(d);
  const comoUtc = Date.UTC(p.anio, p.mes - 1, p.dia, p.hora, p.minuto, p.segundo);
  return comoUtc - Math.floor(d.getTime() / 1000) * 1000;
}

/** "HH:mm" en hora argentina. */
export function formatHora(d: Date): string {
  const p = partes(d);
  return `${String(p.hora).padStart(2, "0")}:${String(p.minuto).padStart(2, "0")}`;
}

/** Fecha y hora argentina legible, ej. "sáb 03/10 21:45". */
export function formatFechaHora(d: Date): string {
  const dia = new Intl.DateTimeFormat("es-AR", { timeZone: ZONA, weekday: "short" }).format(d);
  const p = partes(d);
  const dd = String(p.dia).padStart(2, "0");
  const mm = String(p.mes).padStart(2, "0");
  return `${dia.replace(".", "")} ${dd}/${mm} ${formatHora(d)}`;
}

/** Instante correspondiente a la fecha argentina de `base` con la hora "HH:mm" indicada. */
export function conHora(base: Date, hhmm: string): Date {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) throw new Error(`Hora inválida: ${hhmm}`);
  const [h, min] = [Number(m[1]), Number(m[2])];
  if (h > 23 || min > 59) throw new Error(`Hora inválida: ${hhmm}`);
  const p = partes(base);
  const comoUtc = Date.UTC(p.anio, p.mes - 1, p.dia, h, min);
  return new Date(comoUtc - offsetMs(new Date(comoUtc)));
}

/**
 * Hora editada a mano ("HH:mm") para un registro. Toma el día del valor anterior, pero
 * como la caminata cruza la medianoche, elige el día (anterior, mismo o siguiente) que
 * deja la hora más cerca del valor anterior, sin quedar en el futuro respecto de `ahora`
 * (salvo que el valor anterior ya esté en el futuro).
 */
export function horaEditada(anterior: Date, hhmm: string, ahora: Date = new Date()): Date {
  const DIA = 24 * 60 * 60 * 1000;
  const mismoDia = conHora(anterior, hhmm);
  const todos = [mismoDia.getTime() - DIA, mismoDia.getTime(), mismoDia.getTime() + DIA].map((t) => new Date(t));
  // Evitar horas en el futuro solo tiene sentido si la referencia es pasada
  // (con datos de prueba o de una peregrinación que todavía no ocurrió, no se filtra).
  const limite = ahora.getTime() + 5 * 60 * 1000;
  const noFuturos = todos.filter((d) => d.getTime() <= limite);
  const candidatos = anterior.getTime() <= limite && noFuturos.length > 0 ? noFuturos : todos;
  return candidatos.reduce((mejor, d) =>
    Math.abs(d.getTime() - anterior.getTime()) < Math.abs(mejor.getTime() - anterior.getTime()) ? d : mejor,
  );
}
