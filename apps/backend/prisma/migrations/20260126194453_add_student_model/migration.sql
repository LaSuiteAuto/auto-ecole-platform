-- CreateEnum
CREATE TYPE "LicenseType" AS ENUM ('B', 'AAC', 'CS', 'A1', 'A2');

-- CreateEnum
CREATE TYPE "StudentStatus" AS ENUM ('PROSPECT', 'ANTS_PROCESSING', 'ACTIVE', 'EXAM_READY', 'LICENSE_OBTAINED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "Student" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "birthName" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "birthDate" TIMESTAMP(3) NOT NULL,
    "birthCity" TEXT NOT NULL,
    "birthZipCode" TEXT,
    "birthCountry" TEXT NOT NULL DEFAULT 'FRANCE',
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "zipCode" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "neph" TEXT,
    "ePhotoCode" TEXT,
    "hasIdCard" BOOLEAN NOT NULL DEFAULT false,
    "hasProofOfAddress" BOOLEAN NOT NULL DEFAULT false,
    "hasAssr2" BOOLEAN NOT NULL DEFAULT false,
    "hasJdcCertificate" BOOLEAN NOT NULL DEFAULT false,
    "hasCensusCertificate" BOOLEAN NOT NULL DEFAULT false,
    "needsMedicalOpinion" BOOLEAN NOT NULL DEFAULT false,
    "hasMedicalOpinion" BOOLEAN NOT NULL DEFAULT false,
    "licenseType" "LicenseType" NOT NULL DEFAULT 'B',
    "status" "StudentStatus" NOT NULL DEFAULT 'PROSPECT',
    "minutesPurchased" INTEGER NOT NULL DEFAULT 0,
    "minutesUsed" INTEGER NOT NULL DEFAULT 0,
    "guardianName" TEXT,
    "guardianPhone" TEXT,
    "guardianEmail" TEXT,
    "guardianRelation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Student_userId_key" ON "Student"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Student_neph_key" ON "Student"("neph");

-- CreateIndex
CREATE INDEX "Student_tenantId_idx" ON "Student"("tenantId");

-- CreateIndex
CREATE INDEX "Student_neph_idx" ON "Student"("neph");

-- CreateIndex
CREATE INDEX "Student_birthName_idx" ON "Student"("birthName");

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
