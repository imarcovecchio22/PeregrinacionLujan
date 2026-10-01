// Seed con datos ficticios. Borra TODO y vuelve a crear una peregrinación de ejemplo.
// Uso: npm run db:seed            (sin registros)
//      npm run db:seed -- --demo  (simula la caminata a mitad de camino, para probar el tablero)

import "dotenv/config";
import { prisma } from "../src/lib/db";
import { PUESTOS_DEFAULT } from "../src/domain/puestos-default";
import { generarCaminantesFicticios, simularRegistros } from "./datos-ficticios";

async function main() {
  await prisma.peregrinacion.deleteMany();

  const peregrinacion = await prisma.peregrinacion.create({
    data: {
      nombre: "Peregrinación de ejemplo (datos ficticios)",
      fechaInicio: new Date("2026-10-03"),
      activa: true,
      puestos: { create: PUESTOS_DEFAULT.map((p) => ({ ...p })) },
    },
    include: { puestos: true },
  });
  const idPuesto = new Map(peregrinacion.puestos.map((p) => [p.nombre, p.id]));

  const caminantes = generarCaminantesFicticios();
  await prisma.caminante.createMany({
    data: caminantes.map((c) => ({
      peregrinacionId: peregrinacion.id,
      numero: c.numero,
      nombreCompleto: c.nombreCompleto,
      telefonos: c.telefonos,
      dni: c.dni,
      transporteIda: c.transporteIda,
      transporteVuelta: c.transporteVuelta,
      puntoPartidaId: idPuesto.get(c.partida)!,
    })),
  });

  if (process.argv.includes("--demo")) {
    const creados = await prisma.caminante.findMany({ where: { peregrinacionId: peregrinacion.id } });
    const sim = simularRegistros(
      creados.map((c) => ({ id: c.id, numero: c.numero, partida: peregrinacion.puestos.find((p) => p.id === c.puntoPartidaId)!.nombre })),
    );
    await prisma.registro.createMany({
      data: sim.registros.map((r) => ({
        id: crypto.randomUUID(),
        caminanteId: r.caminanteId,
        puestoId: idPuesto.get(r.puesto)!,
        tipo: r.tipo,
        hora: r.hora,
        cargadoPor: "Demo",
      })),
    });
    for (const a of sim.abandonos) {
      await prisma.caminante.update({
        where: { id: a.caminanteId },
        data: { abandonoTrasPuestoId: idPuesto.get(a.puesto)!, abandonoHora: a.hora },
      });
    }
    // Micro de ida: subieron los que van en micro y ya salieron de Liniers (un par no, para ver faltantes).
    const salieronLiniers = new Set(sim.registros.filter((r) => r.puesto === "Liniers").map((r) => r.caminanteId));
    const ida = creados.filter((c) => c.transporteIda === "MICRO" && salieronLiniers.has(c.id) && c.numero % 17 !== 0);
    await prisma.abordaje.createMany({
      data: ida.map((c) => ({
        id: crypto.randomUUID(),
        caminanteId: c.id,
        tramo: "IDA" as const,
        hora: new Date("2026-10-03T18:30:00-03:00"),
        cargadoPor: "Demo",
      })),
    });
    // Check-in: todos los que ya tienen registros (sin check-in no se marca nada) y la mayoría
    // de los que todavía no salieron (algunos no, para ver el aviso en "Mi puesto").
    const conRegistros = new Set(sim.registros.map((r) => r.caminanteId));
    const checkin = creados.filter((c) => conRegistros.has(c.id) || c.numero % 5 !== 0);
    await prisma.abordaje.createMany({
      data: checkin.map((c) => ({
        id: crypto.randomUUID(),
        caminanteId: c.id,
        tramo: "CHECKIN" as const,
        hora: new Date("2026-10-03T18:00:00-03:00"),
        cargadoPor: "Demo",
      })),
    });
    console.log(
      `Demo: ${sim.registros.length} registros, ${sim.abandonos.length} abandonos, ${checkin.length} check-in y ${ida.length} subidas al micro de ida.`,
    );
  }

  console.log(`Seed listo: "${peregrinacion.nombre}" con ${caminantes.length} caminantes ficticios.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
