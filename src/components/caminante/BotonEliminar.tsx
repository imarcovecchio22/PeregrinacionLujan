"use client";

export function BotonEliminar({ numero }: { numero: number }) {
  return (
    <button
      onClick={(e) => {
        if (!confirm(`¿Eliminar al caminante #${numero} y todos sus registros? No se puede deshacer.`)) e.preventDefault();
      }}
      className="w-full rounded-xl border-2 border-red-300 py-2 font-semibold text-red-700"
    >
      Eliminar caminante #{numero} y sus registros
    </button>
  );
}
