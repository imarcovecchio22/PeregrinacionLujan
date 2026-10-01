import { SelectorPuesto } from "@/components/SelectorPuesto";
import { cargarPeregrinacionActiva } from "@/lib/datos";

export default async function Inicio(props: PageProps<"/">) {
  const { cambiar } = await props.searchParams;
  const peregrinacion = await cargarPeregrinacionActiva();
  if (!peregrinacion) {
    return <main className="p-4">No hay ninguna peregrinación activa.</main>;
  }
  return (
    <SelectorPuesto
      titulo={peregrinacion.nombre}
      puestos={peregrinacion.puestos.map((p) => ({ id: p.id, orden: p.orden, nombre: p.nombre }))}
      cambiar={cambiar !== undefined}
    />
  );
}
