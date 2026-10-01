// Seed con datos ficticios. Borra TODO y vuelve a crear una peregrinación de ejemplo.
// Uso: npm run db:seed

import "dotenv/config";
import { prisma } from "../src/lib/db";
import { PUESTOS_DEFAULT } from "../src/domain/puestos-default";
import { generarCaminantesFicticios } from "./datos-ficticios";

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
      transporteIda: c.transporteIda,
      transporteVuelta: c.transporteVuelta,
      puntoPartidaId: idPuesto.get(c.partida)!,
    })),
  });

  console.log(`Seed listo: "${peregrinacion.nombre}" con ${caminantes.length} caminantes ficticios.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
