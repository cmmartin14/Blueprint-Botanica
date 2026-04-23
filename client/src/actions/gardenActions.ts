"use server";

import { prisma } from "../db/prisma";
import { GardenState } from "../types/garden";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { Prisma } from "@prisma/client";
import { ensureUserRowExists } from "../lib/userSync";

function toInputJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

export async function saveGarden(
  userId: string,
  state: GardenState
): Promise<{ id: string }> {
  const now = new Date();
  const projectId = state.id || randomUUID();
  await ensureUserRowExists(userId);

  // Ensure the user row exists in users_sync before writing the garden
  // (Neon Auth sync can lag behind StackFrame auth on first save)
  await prisma.users_sync.upsert({
    where:  { id: userId },
    update: {},
    create: { id: userId },
  });

  await prisma.garden_projects.upsert({
    where:  { id: projectId },
    update: {
      name:      state.name,
      shapes:    toInputJson(state.shapes),
      beds:      toInputJson(state.beds),
      bedPlants: toInputJson(state.bedPlants),
      updatedAt: now,
    },
    create: {
      id:        projectId,
      name:      state.name,
      userId,
      shapes:    toInputJson(state.shapes),
      beds:      toInputJson(state.beds),
      bedPlants: toInputJson(state.bedPlants),
      updatedAt: now,
    },
  });

  revalidatePath("/");
  return { id: projectId };
}

export async function loadGarden(
  userId: string,
  projectId: string
): Promise<GardenState | null> {
  const project = await prisma.garden_projects.findFirst({
    where: { id: projectId, userId },
  });

  if (!project) return null;

  return {
    id:       project.id,
    name:     project.name,
    editMode: false,
    zone: null,
    shapes:   project.shapes as unknown as GardenState["shapes"],
    beds:     project.beds as unknown as GardenState["beds"],
    bedPlants: project.bedPlants as unknown as GardenState["bedPlants"],
    speciesColors: {},
    hardinessZone: null,
    gridMode: "dots",
    shapeMode: "white",
  };
}

export async function listGardens(
  userId: string
): Promise<{ id: string; name: string; updatedAt: Date }[]> {
  return prisma.garden_projects.findMany({
    where:   { userId },
    select:  { id: true, name: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
  });
}

export async function loadGardenById(
  projectId: string
): Promise<GardenState | null> {
  const project = await prisma.garden_projects.findFirst({
    where: { id: projectId },
  });

  if (!project) return null;

  return {
    id:        project.id,
    name:      project.name,
    editMode:  false,
    shapes:    project.shapes    as GardenState["shapes"],
    beds:      project.beds      as GardenState["beds"],
    bedPlants: project.bedPlants as GardenState["bedPlants"],
  };
}

export async function deleteGarden(
  userId: string,
  projectId: string
): Promise<void> {
  await prisma.garden_projects.deleteMany({
    where: { id: projectId, userId },
  });
  revalidatePath("/");
}