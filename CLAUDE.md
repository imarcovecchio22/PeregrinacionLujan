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
  inconsistencia (`inconsistencias()`) en el tablero. Excepción: si falta la Salida de la
  partida pero hay pasos posteriores, se da por hecha (la planilla no tiene columna para
  Liniers). Única traba, solo en "Mi puesto": no deja marcar la Salida de un puesto que
  espera Ingreso sin haber marcado el Ingreso (muestra el aviso "Primero tiene que
  llegar"). La API, la ficha y la importación siguen sin bloquear.

### Resumen esperado (test de aceptación, `src/domain/recorrido.test.ts`)
Con los datos de la planilla 2026 (y con el seed ficticio, que respeta las proporciones):
161 personas · Liniers 102 (95 micro / 7 por su cuenta) · La Reja 46 · Rodríguez 13 ·
Vuelta 152 micro / 9 por su cuenta · Pasan por: Castelar 102, Merlo 102, La Reja 102,
Rodríguez 148, Luján 161.

### Caminante
- `nombreCompleto` es texto libre: algunos vienen "Apellido Nombre" y otros "Nombre
  Apellido". **Nunca separar ni invertir.**
- `telefonos[]`: uno o más, guardados tal cual (no normalizar formatos no AMBA).
- `dni` opcional, tal cual vino. Búsqueda (Mi puesto y tablero, `coincideCaminante`): número,
  nombre (palabras en cualquier orden, sin acentos), DNI (con o sin puntos) o teléfono.
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
La hoja "Resumen y control" se regenera con fórmulas COUNTIF (con el resultado ya
calculado) y una sección "Para revisar" con abandonos e inconsistencias.
- Estructura de columnas: `src/domain/planilla.ts` (única fuente para importar y exportar).
- Lectura: `src/domain/importar.ts` (puro, con tests) sobre una matriz de celdas que arma
  `src/lib/excel-leer.ts` (ExcelJS / CSV propio). Escritura: `src/lib/excel-exportar.ts`
  (ExcelJS, porque SheetJS community no escribe estilos).
- Partida: columna "Sale desde"; las "NA" la validan (o la infieren si falta la columna).
- Horas sin fecha: la primera hora de cada caminante anterior al "corte" (12:00 por
  defecto, editable al importar) es del día siguiente; luego, cada hora que retrocede
  suma un día.
- Advertencias (no bloquean): posibles duplicados (mismo DNI, o mismas palabras del nombre
  en cualquier orden), teléfonos compartidos, varios teléfonos en una celda, no AMBA,
  "Sale desde" que no coincide con las NA, transporte u horas ilegibles. Errores (la fila
  no se importa): sin nombre, número inválido o repetido, partida desconocida.
- Verificado con la planilla real 2026: 161 filas, 0 errores, resumen de aceptación exacto.

## Decisiones
- **Sin login, con código de acceso compartido** (`ACCESO_CODIGO`): `src/proxy.ts` manda a
  `/acceso` (o 401 en `/api`), y además cada Server Action y Route Handler verifica con
  `exigirAcceso()` / `tieneAcceso()` (`src/lib/acceso.ts`) — no depender solo del proxy.
  Cookie httpOnly de 60 días con un HMAC del código: cambiar el código invalida todas las
  sesiones. Límite: 10 fallos por IP / 100 en total cada 15 min (tabla `IntentoAcceso`).
  En desarrollo, con `ACCESO_CODIGO` vacío no se pide; en producción sin código no entra
  nadie. El dispositivo elige su puesto y un nombre (se guarda en el celular) que va a
  `Registro.cargadoPor`.
- `Registro.id` lo genera el cliente (UUID) → reintentos idempotentes; base para la cola
  offline de fase 2.
- Horas en `timestamptz` (UTC); se muestran y editan siempre en
  `America/Argentina/Buenos_Aires`. La caminata cruza la medianoche: una hora "HH:mm"
  cargada a mano toma el día del registro vecino (`horaEditada`); al importar horas sin
  fecha, se infiere el día recorriendo el trayecto.
- Formularios con Server Actions (`src/app/caminantes/acciones.ts`). Ojo: con
  `<form action>` React 19 resetea los campos aunque haya error; en formularios largos
  usar `onSubmit` + `startTransition` (ver `FormCaminante`).
- Se cargan las ~161 personas en memoria y se calcula con `src/domain/` (en el servidor,
  y en el navegador para los contadores de "Mi puesto", así reflejan los cambios al instante).
- Guardado en "Mi puesto" (`useRegistrosPuesto`): cambio optimista, envío serializado por
  caminante+tipo, error visible por fila + banner + sección "Sin guardar" arriba de todo,
  reintento automático al volver la señal. Si dos celulares cargan lo mismo, gana el primero
  (`yaExistia`). La API rechaza (422) registros que no le corresponden al caminante.

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
- `npm run db:migrate` · `npm run db:seed` (borra todo y carga datos ficticios;
  `npm run db:seed -- --demo` además simula la caminata a mitad de camino).
- `npm test` · `npm run lint` · `npx tsc --noEmit` · `npm run dev`.

## Deploy
- Vercel + Neon. Variables en Vercel: `DATABASE_URL` (Neon **pooled**) y `ACCESO_CODIGO`.
- Migraciones en producción (desde la PC, con la URL **directa** de Neon, sin "-pooler"):
  `DATABASE_URL="<url directa>&connect_timeout=30" npx prisma migrate deploy`
  (Neon suspende la base sin uso y tarda unos segundos en despertar). Las URLs de Neon
  están en `.env.neon` (no se commitea).
- Producción NO se siembra: la peregrinación real se carga importando la planilla.
- Local: `prisma dev` es una sola base; la shadow va por `SHADOW_DATABASE_URL` (otro puerto).

## Fases
1. ✅ Setup + DB + seed + dominio con tests.
2. ~~Auth y roles~~ (pospuesto) → código de acceso compartido en la fase 6.
3. ✅ Vista "Mi puesto" (`/puesto/[id]`; selector de puesto y nombre en `/`).
4. ✅ Tablero (`/tablero`: resumen, por puesto en vivo, "¿dónde están?", matriz con
   inconsistencias) y ficha (`/caminantes/[id]`: recorrido editable, historial, abandono,
   editar/eliminar; alta en `/caminantes/nuevo`).
5. ✅ Importación / exportación y administración (`/admin`): importar .xlsx/.csv con
   previsualización (en una peregrinación nueva o reemplazando la activa), descargar la
   planilla (`/api/exportar`), editar peregrinación y puestos, activar/eliminar.
6. ✅ Código de acceso; migraciones aplicadas en Neon. Falta: deploy en Vercel.

### Control de micros (`/micro/ida`, `/micro/vuelta`)
Decisión del grupo: **no se asignan vehículos**, solo se marca "subió / no subió" por tramo
(tabla `Abordaje`, única por caminante+tramo). Lo marca una sola persona por tramo.
- Ida: quienes parten del primer puesto con ida "Micro". Vuelta: quienes vuelven en
  "Micro", **salvo los que abandonaron** (`src/domain/micros.ts`).
- Si sube alguien no anotado se registra igual y se muestra aparte ("no anotados").
- Misma mecánica que "Mi puesto" (`useAbordajes`, guardado visible, deshacer); se elige
  desde el inicio y el celular lo recuerda (`dispositivo.puestoId = "micro:ida"`).

**Pendiente (fase 2):** modo offline con cola de sincronización.
