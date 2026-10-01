import { connection } from "next/server";
import { Nav } from "@/components/Nav";
import { Tablero } from "@/components/tablero/Tablero";
import { cargarTablero } from "@/lib/tablero";

export default async function PaginaTablero() {
  await connection();
  const datos = await cargarTablero();
  return (
    <div className="min-h-dvh">
      <Nav actual="tablero" />
      {datos ? <Tablero datos={datos} /> : <p className="p-4">No hay ninguna peregrinación activa.</p>}
    </div>
  );
}
