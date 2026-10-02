import Link from "next/link";
import { FormAcceso } from "@/app/acceso/FormAcceso";
import { Nav } from "@/components/Nav";

export default async function IngresarAdmin(props: PageProps<"/admin/ingresar">) {
  const { siguiente } = await props.searchParams;
  return (
    <div className="min-h-dvh">
      <Nav actual="admin" />
      <main className="mx-auto grid max-w-sm gap-3 p-3">
        <h1 className="text-xl font-bold">Solo administrador</h1>
        <p className="text-gray-700">
          Esta parte (administración, alta y baja de caminantes, planilla) la usa solo el administrador. Si lo sos,
          ingresá tu código: este celular lo recuerda.
        </p>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <FormAcceso admin siguiente={typeof siguiente === "string" ? siguiente : "/admin"} />
        </div>
        <Link href="/tablero" className="text-center text-blue-700">
          ← Volver al tablero
        </Link>
      </main>
    </div>
  );
}
