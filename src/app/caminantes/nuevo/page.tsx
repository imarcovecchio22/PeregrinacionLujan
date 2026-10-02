import { connection } from "next/server";
import { FormCaminante } from "@/components/caminante/FormCaminante";
import { Nav } from "@/components/Nav";
import { exigirAdminPagina } from "@/lib/acceso";
import { siguienteNumero } from "@/lib/caminante";
import { cargarPeregrinacionActiva } from "@/lib/datos";

export default async function NuevoCaminante() {
  await connection();
  await exigirAdminPagina("/caminantes/nuevo");
  const peregrinacion = await cargarPeregrinacionActiva();
  if (!peregrinacion) return <p className="p-4">No hay ninguna peregrinación activa.</p>;
  const puestos = peregrinacion.puestos;
  const partidas = puestos.filter((p) => p.esPartidaPosible);
  return (
    <div className="min-h-dvh">
      <Nav actual="nuevo" />
      <main className="mx-auto max-w-lg p-3">
        <h1 className="mb-3 text-xl font-bold">Nuevo caminante</h1>
        <div className="rounded-lg border border-gray-200 bg-white p-3">
          <FormCaminante
            valores={{
              numero: await siguienteNumero(peregrinacion.id),
              nombreCompleto: "",
              telefonos: [],
              dni: null,
              puntoPartidaId: partidas[0]?.id ?? "",
              transporteIda: null,
              transporteVuelta: null,
              notas: null,
            }}
            partidas={partidas}
            primerPuestoId={puestos[0].id}
          />
        </div>
      </main>
    </div>
  );
}
