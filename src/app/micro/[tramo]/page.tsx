import { notFound } from "next/navigation";
import { MiMicro } from "@/components/micro/MiMicro";
import { cargarDatosMicro } from "@/lib/micros";

export default async function PaginaMicro(props: PageProps<"/micro/[tramo]">) {
  const { tramo } = await props.params;
  const t = tramo.toUpperCase();
  if (t !== "IDA" && t !== "VUELTA") notFound();
  const datos = await cargarDatosMicro(t);
  if (!datos) notFound();
  return <MiMicro key={t} inicial={datos} />;
}
