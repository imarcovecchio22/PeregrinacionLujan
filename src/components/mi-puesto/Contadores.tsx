import type { EstadoPuesto } from "@/domain/recorrido";

export function Contadores({ estado }: { estado: EstadoPuesto }) {
  return (
    <div>
      <div className="grid grid-cols-2 gap-2">
        {estado.esperanIngreso > 0 && (
          <Tile titulo="Faltan ingresar" valor={estado.faltanIngresar} total={estado.esperanIngreso} color="blue" />
        )}
        {estado.esperanSalida > 0 && (
          <Tile titulo="Faltan salir" valor={estado.faltanSalir} total={estado.esperanSalida} color="green" />
        )}
      </div>
      <p className="mt-1 text-center text-xs text-gray-600">
        Esperados {estado.esperadosVigentes}
        {estado.esperadosVigentes !== estado.esperados && ` (de ${estado.esperados})`}
        {estado.esperanIngreso > 0 && ` · Ingresaron ${estado.ingresaron}`} · Salieron {estado.salieron}
        {estado.abandonos > 0 && ` · Abandonos acá ${estado.abandonos}`}
      </p>
    </div>
  );
}

function Tile({ titulo, valor, total, color }: { titulo: string; valor: number; total: number; color: "blue" | "green" }) {
  const listo = valor === 0;
  const estilos = listo
    ? "border-gray-300 bg-gray-50 text-gray-500"
    : color === "blue"
      ? "border-blue-300 bg-blue-50 text-blue-900"
      : "border-green-300 bg-green-50 text-green-900";
  return (
    <div className={`rounded-lg border px-2 py-1 text-center ${estilos}`}>
      <div className="text-xs font-medium">{titulo}</div>
      <div className="font-mono text-2xl font-bold leading-tight">
        {valor}
        <span className="text-sm font-normal"> / {total}</span>
      </div>
    </div>
  );
}
