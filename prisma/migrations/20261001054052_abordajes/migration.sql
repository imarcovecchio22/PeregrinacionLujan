-- CreateEnum
CREATE TYPE "Tramo" AS ENUM ('IDA', 'VUELTA');

-- CreateTable
CREATE TABLE "Abordaje" (
    "id" TEXT NOT NULL,
    "caminanteId" TEXT NOT NULL,
    "tramo" "Tramo" NOT NULL,
    "hora" TIMESTAMPTZ NOT NULL,
    "cargadoPor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Abordaje_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Abordaje_caminanteId_tramo_key" ON "Abordaje"("caminanteId", "tramo");

-- AddForeignKey
ALTER TABLE "Abordaje" ADD CONSTRAINT "Abordaje_caminanteId_fkey" FOREIGN KEY ("caminanteId") REFERENCES "Caminante"("id") ON DELETE CASCADE ON UPDATE CASCADE;
