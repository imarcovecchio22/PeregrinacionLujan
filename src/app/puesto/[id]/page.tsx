import { notFound } from "next/navigation";
import { MiPuesto } from "@/components/mi-puesto/MiPuesto";
import { cargarDatosPuesto } from "@/lib/mi-puesto";

export default async function PaginaPuesto(props: PageProps<"/puesto/[id]">) {
  const { id } = await props.params;
  const datos = await cargarDatosPuesto(id);
  if (!datos) notFound();
  return <MiPuesto key={id} inicial={datos} />;
}
