-- CreateTable
CREATE TABLE "IntentoAcceso" (
    "id" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntentoAcceso_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IntentoAcceso_createdAt_idx" ON "IntentoAcceso"("createdAt");

-- CreateIndex
CREATE INDEX "IntentoAcceso_ip_createdAt_idx" ON "IntentoAcceso"("ip", "createdAt");
