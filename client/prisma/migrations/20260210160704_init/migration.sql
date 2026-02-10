-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100),
    "email" VARCHAR(100) NOT NULL,
    "password" VARCHAR(100) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zones" (
    "id" SERIAL NOT NULL,
    "zone" VARCHAR(4),
    "temp_min" INTEGER,
    "temp_max" INTEGER,
    "notes" VARCHAR,

    CONSTRAINT "zones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "garden_beds" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "zipcode" VARCHAR(10),
    "climate" VARCHAR(50),
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "garden_beds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "garden_projects" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "scale" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "unit" VARCHAR(10) NOT NULL DEFAULT 'feet',
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "garden_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shapes" (
    "id" TEXT NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "startPosX" DOUBLE PRECISION NOT NULL,
    "startPosY" DOUBLE PRECISION NOT NULL,
    "endPosX" DOUBLE PRECISION NOT NULL,
    "endPosY" DOUBLE PRECISION NOT NULL,
    "points" JSONB,
    "color" VARCHAR(20) NOT NULL DEFAULT '#ffffff',
    "strokeWidth" INTEGER NOT NULL DEFAULT 2,
    "gardenBedId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "shapes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Garden" (
    "id" TEXT NOT NULL,
    "userID" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shapes" JSONB NOT NULL,
    "beds" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Garden_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "zones_zone_key" ON "zones"("zone");

-- CreateIndex
CREATE INDEX "garden_beds_projectId_idx" ON "garden_beds"("projectId");

-- CreateIndex
CREATE INDEX "garden_projects_userId_idx" ON "garden_projects"("userId");

-- CreateIndex
CREATE INDEX "shapes_gardenBedId_idx" ON "shapes"("gardenBedId");

-- AddForeignKey
ALTER TABLE "garden_beds" ADD CONSTRAINT "garden_beds_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "garden_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "garden_projects" ADD CONSTRAINT "garden_projects_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shapes" ADD CONSTRAINT "shapes_gardenBedId_fkey" FOREIGN KEY ("gardenBedId") REFERENCES "garden_beds"("id") ON DELETE CASCADE ON UPDATE CASCADE;
