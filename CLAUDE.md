@AGENTS.md

# Peregrinación a Luján — control de puestos

Web app para que los coordinadores de un grupo scout registren a qué hora cada caminante
entra y sale de cada puesto de la Peregrinación a Luján, y sepan en todo momento quién
falta y dónde. Se usa desde el celular, en la calle, con señal irregular, con varias
personas cargando en simultáneo en puestos distintos.

## Dominio

### Puestos (en orden)
0. Liniers (partida) · 1. Castelar · 2. Merlo · 3. La Reja · 4. Rodríguez · 5. Luján (llegada).
Son datos editables por peregrinación (`Puesto`), nunca hardcodear nombres: la lógica usa
`orden` y los flags `esPartidaPosible`, `registraIngreso`, `registraSalida`.
Puntos de partida posibles: Liniers, La Reja, Rodríguez.

### Reglas de paso por puesto (lo más importante)
Implementadas y testeadas en `src/domain/recorrido.ts`. **No se guardan: se derivan.**
- **Puestos anteriores a su partida**: no le corresponden (el "NA" de la planilla).
- **Punto de partida**: solo registra **Salida** (se presentó y arrancó). **No cuenta**
  como "pasa por ese puesto" para los totales.
- **Puestos posteriores**: Ingreso y Salida (según flags; Luján solo Ingreso).
- **Abandono** se marca como "abandonó después del puesto X" (`abandonoTrasPuestoId`):
  el Ingreso en X sigue esperado, la Salida de X pasa a ser opcional y no se espera nada
  más adelante. Los totales "pasan por" (plan) no cambian; los "vigentes" sí.
- **Orden de carga**: nunca se bloquea. Si falta un paso anterior (Ingreso en Merlo sin
  Salida de Castelar), un registro no corresponde o las horas retroceden, se marca como
  inconsistencia (`inconsistencias()`) en el tablero.

### Resumen esperado (test de aceptación, `src/domain/recorrido.test.ts`)
Con los datos de la planilla 2026 (y con el seed ficticio, que respeta las proporciones):
161 personas · Liniers 102 (95 micro / 7 por su cuenta) · La Reja 46 · Rodríguez 13 ·
Vuelta 152 micro / 9 por su cuenta · Pasan por: Castelar 102, Merlo 102, La Reja 102,
Rodríguez 148, Luján 161.

### Caminante
- `nombreCompleto` es texto libre: algunos vienen "Apellido Nombre" y otros "Nombre
  Apellido". **Nunca separar ni invertir.**
- `telefonos[]`: uno o más, guardados tal cual (no normalizar formatos no AMBA).
- `transporteIda` solo aplica a quienes parten de Liniers; `transporteVuelta` a todos.
- **No agregar otros datos personales** (edad, domicilio, mail, pago, etc.): se
  excluyeron a propósito.

### Planilla (import/export, hoja "Listado")
Filas 1–3: notas. Encabezado en filas 4–5 (celdas combinadas puesto → Ingreso/Salida).
Datos desde la fila 6. Columnas: A N° · B Apellido y nombre · C DNI · D Teléfono (varios
separados por "/") · E Sale desde · F Ida a Liniers (Micro / Por su cuenta / NA) ·
G-H Castelar I/S · I-J Merlo I/S · K-L La Reja I/S · M-N Rodríguez I/S · O Luján I ·
P Vuelta desde Luján. Liniers no tiene columnas de hora (en la planilla, Liniers es
"Ida a Liniers"): la Salida de Liniers queda solo en la app. La Salida de partida de
La Reja/Rodríguez va en la columna Salida de ese puesto (con el Ingreso en "NA").
La hoja "Resumen y control" se regenera con fórmulas COUNTIF.

## Decisiones
- **Sin login por ahora.** El dispositivo elige su puesto y un nombre (se guarda en el
  celular) que va a `Registro.cargadoPor`. Antes del deploy: **código de acceso
  compartido** (variable de entorno + cookie, en `src/proxy.ts`), porque hay datos
  personales.
- `Registro.id` lo genera el cliente (UUID) → reintentos idempotentes; base para la cola
  offline de fase 2.
- Horas en `timestamptz` (UTC); se muestran y editan siempre en
  `America/Argentina/Buenos_Aires`. La caminata cruza la medianoche: al importar horas
  sin fecha, se infiere el día recorriendo el trayecto.
- Se cargan las ~161 personas en memoria y se calcula en el servidor con `src/domain/`.

## Convenciones
- UI, nombres de dominio y comentarios en español. Mobile-first, botones grandes.
- Lógica de dominio pura en `src/domain/` (sin Prisma, sin Next), siempre con tests.
- Acceso a datos en `src/lib/`. Prisma 7 con `@prisma/adapter-pg`; cliente generado en
  `src/generated/prisma` (no se commitea).
- Nunca commitear datos reales ni planillas (`*.xlsx` está en `.gitignore`). El seed es
  ficticio (`prisma/datos-ficticios.ts`).
- Next 16: params asíncronos, `proxy.ts` en vez de `middleware.ts`. Consultar
  `node_modules/next/dist/docs/` antes de usar APIs de Next.

## Comandos
- `npm run db:dev` — Postgres local (`prisma dev`, sin Docker).
- `npm run db:migrate` · `npm run db:seed` (borra todo y carga datos ficticios).
- `npm test` · `npm run lint` · `npx tsc --noEmit` · `npm run dev`.

## Fases
1. ✅ Setup + DB + seed + dominio con tests.
2. ~~Auth y roles~~ (pospuesto) → código de acceso compartido en la fase 6.
3. Vista "Mi puesto".
4. Tablero, resumen y ficha (con abandono e inconsistencias).
5. Importación / exportación XLSX.
6. Código de acceso + deploy (Vercel + Neon).

**Fase 2 del producto (no implementar todavía):** control de micros (8 combis de vuelta,
152 lugares; micro de ida a Liniers; vista "subió / no subió") y modo offline con cola
de sincronización.
