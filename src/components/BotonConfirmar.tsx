"use client";

/** Botón de envío que pide confirmación antes de mandar el formulario. */
export function BotonConfirmar({ mensaje, className, children }: { mensaje: string; className?: string; children: React.ReactNode }) {
  return (
    <button
      onClick={(e) => {
        if (!confirm(mensaje)) e.preventDefault();
      }}
      className={className}
    >
      {children}
    </button>
  );
}
