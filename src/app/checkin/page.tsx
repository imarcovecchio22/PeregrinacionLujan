import { notFound } from "next/navigation";
import { connection } from "next/server";
import { MiMicro } from "@/components/micro/MiMicro";
import { cargarDatosMicro } from "@/lib/micros";

export default async function PaginaCheckin() {
  // Siempre con datos frescos (sin esto, Next la genera una sola vez al compilar).
  await connection();
  const datos = await cargarDatosMicro("CHECKIN");
  if (!datos) notFound();
  return <MiMicro inicial={datos} />;
}
