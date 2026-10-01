/** Indicador grande de guardado, siempre visible arriba (header fijo). */
export function EstadoGuardado(props: { errores: number; enviando: number; guardado: boolean; onReintentar?: () => void }) {
  const { errores, enviando, guardado, onReintentar } = props;
  if (errores > 0) {
    return (
      <div role="alert" className="mt-2 flex items-center justify-between gap-2 rounded-lg bg-red-600 px-3 py-2 text-white">
        <span className="text-lg font-bold">⚠️ {errores === 1 ? "1 cambio sin guardar" : `${errores} cambios sin guardar`}</span>
        {onReintentar && (
          <button type="button" onClick={onReintentar} className="rounded-md bg-white px-3 py-2 font-semibold text-red-700">
            Reintentar
          </button>
        )}
      </div>
    );
  }
  if (enviando > 0) {
    return (
      <p role="status" className="mt-2 animate-pulse rounded-lg bg-amber-500 px-3 py-2 text-center text-lg font-bold text-white">
        ⏳ Guardando{enviando > 1 ? ` ${enviando}` : ""}…
      </p>
    );
  }
  if (guardado) {
    return (
      <p role="status" className="mt-2 rounded-lg bg-green-600 px-3 py-2 text-center text-lg font-bold text-white">
        ✓ Guardado
      </p>
    );
  }
  return null;
}
