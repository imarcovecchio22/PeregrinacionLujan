-- AlterEnum
ALTER TYPE "Tramo" ADD VALUE 'CHECKIN';

-- AlterTable
ALTER TABLE "Puesto" ADD COLUMN     "horaCheckin" TEXT;
