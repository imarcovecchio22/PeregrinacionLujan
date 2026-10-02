import Link from "next/link";
import { esAdmin } from "@/lib/acceso";

export async function Nav({ actual }: { actual?: "tablero" | "nuevo" | "admin" }) {
  const clase = (activo: boolean) =>
    `rounded-md px-3 py-2 text-sm font-medium ${activo ? "bg-gray-900 text-white" : "text-gray-700 active:bg-gray-200"}`;
  // "+ Caminante" solo para el administrador; "Admin" queda visible para poder ingresar el código.
  const admin = await esAdmin();
  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-gray-200 bg-white px-2 py-1">
      <Link href="/?cambiar=1" className={clase(false)}>
        Puestos
      </Link>
      <Link href="/tablero" className={clase(actual === "tablero")}>
        Tablero
      </Link>
      {admin && (
        <Link href="/caminantes/nuevo" className={clase(actual === "nuevo")}>
          + Caminante
        </Link>
      )}
      <Link href="/admin" className={clase(actual === "admin")}>
        Admin
      </Link>
    </nav>
  );
}
