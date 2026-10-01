import { notFound } from "next/navigation";
import { MiMicro } from "@/components/micro/MiMicro";
import { cargarDatosMicro } from "@/lib/micros";

export default async function PaginaCheckin() {
  const datos = await cargarDatosMicro("CHECKIN");
  if (!datos) notFound();
  return <MiMicro inicial={datos} />;
}
