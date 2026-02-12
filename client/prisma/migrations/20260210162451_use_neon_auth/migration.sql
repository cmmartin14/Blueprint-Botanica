/*
  Warnings:

  - You are about to drop the column `scale` on the `garden_projects` table. All the data in the column will be lost.
  - You are about to drop the column `unit` on the `garden_projects` table. All the data in the column will be lost.
  - You are about to drop the `garden_beds` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `shapes` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `users` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "neon_auth";

-- DropForeignKey
ALTER TABLE "garden_beds" DROP CONSTRAINT "garden_beds_projectId_fkey";

-- DropForeignKey
ALTER TABLE "garden_projects" DROP CONSTRAINT "garden_projects_userId_fkey";

-- DropForeignKey
ALTER TABLE "shapes" DROP CONSTRAINT "shapes_gardenBedId_fkey";

-- AlterTable
ALTER TABLE "garden_projects" DROP COLUMN "scale",
DROP COLUMN "unit",
ADD COLUMN     "beds" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "shapes" JSONB NOT NULL DEFAULT '{}',
ALTER COLUMN "userId" SET DATA TYPE TEXT;

-- DropTable
DROP TABLE "garden_beds";

-- DropTable
DROP TABLE "shapes";

-- DropTable
DROP TABLE "users";

-- CreateTable
CREATE TABLE "neon_auth"."users_sync" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "created_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),
    "raw_json" JSONB,

    CONSTRAINT "users_sync_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "garden_projects" ADD CONSTRAINT "garden_projects_userId_fkey" FOREIGN KEY ("userId") REFERENCES "neon_auth"."users_sync"("id") ON DELETE CASCADE ON UPDATE CASCADE;
