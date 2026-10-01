-- CreateEnum
CREATE TYPE "Transporte" AS ENUM ('MICRO', 'POR_SU_CUENTA');

-- CreateEnum
CREATE TYPE "TipoRegistro" AS ENUM ('INGRESO', 'SALIDA');

-- CreateTable
CREATE TABLE "Peregrinacion" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "fechaInicio" DATE NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Peregrinacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Puesto" (
    "id" TEXT NOT NULL,
    "peregrinacionId" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "esPartidaPosible" BOOLEAN NOT NULL DEFAULT false,
    "registraIngreso" BOOLEAN NOT NULL DEFAULT true,
    "registraSalida" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Puesto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Caminante" (
    "id" TEXT NOT NULL,
    "peregrinacionId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "nombreCompleto" TEXT NOT NULL,
    "telefonos" TEXT[],
    "dni" TEXT,
    "transporteIda" "Transporte",
    "transporteVuelta" "Transporte",
    "puntoPartidaId" TEXT NOT NULL,
    "abandonoTrasPuestoId" TEXT,
    "abandonoHora" TIMESTAMPTZ,
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Caminante_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Registro" (
    "id" TEXT NOT NULL,
    "caminanteId" TEXT NOT NULL,
    "puestoId" TEXT NOT NULL,
    "tipo" "TipoRegistro" NOT NULL,
    "hora" TIMESTAMPTZ NOT NULL,
    "cargadoPor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Registro_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Puesto_peregrinacionId_orden_key" ON "Puesto"("peregrinacionId", "orden");

-- CreateIndex
CREATE UNIQUE INDEX "Puesto_peregrinacionId_nombre_key" ON "Puesto"("peregrinacionId", "nombre");

-- CreateIndex
CREATE INDEX "Caminante_peregrinacionId_idx" ON "Caminante"("peregrinacionId");

-- CreateIndex
CREATE UNIQUE INDEX "Caminante_peregrinacionId_numero_key" ON "Caminante"("peregrinacionId", "numero");

-- CreateIndex
CREATE INDEX "Registro_puestoId_idx" ON "Registro"("puestoId");

-- CreateIndex
CREATE UNIQUE INDEX "Registro_caminanteId_puestoId_tipo_key" ON "Registro"("caminanteId", "puestoId", "tipo");

-- AddForeignKey
ALTER TABLE "Puesto" ADD CONSTRAINT "Puesto_peregrinacionId_fkey" FOREIGN KEY ("peregrinacionId") REFERENCES "Peregrinacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Caminante" ADD CONSTRAINT "Caminante_peregrinacionId_fkey" FOREIGN KEY ("peregrinacionId") REFERENCES "Peregrinacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Caminante" ADD CONSTRAINT "Caminante_puntoPartidaId_fkey" FOREIGN KEY ("puntoPartidaId") REFERENCES "Puesto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Caminante" ADD CONSTRAINT "Caminante_abandonoTrasPuestoId_fkey" FOREIGN KEY ("abandonoTrasPuestoId") REFERENCES "Puesto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Registro" ADD CONSTRAINT "Registro_caminanteId_fkey" FOREIGN KEY ("caminanteId") REFERENCES "Caminante"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Registro" ADD CONSTRAINT "Registro_puestoId_fkey" FOREIGN KEY ("puestoId") REFERENCES "Puesto"("id") ON DELETE CASCADE ON UPDATE CASCADE;
