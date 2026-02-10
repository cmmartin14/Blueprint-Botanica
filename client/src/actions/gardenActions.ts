"use server";

import { prisma } from "../db/prisma";
import { GardenState } from "../types/garden";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";

export async function saveGarden(
  userId: string,
  state: GardenState
): Promise<{ id: string }> {
  const now = new Date();
  const projectId = state.id || randomUUID();

  await prisma.garden_projects.upsert({
    where:  { id: projectId },
    update: {
      name:      state.name,
      shapes:    state.shapes,
      beds:      state.beds,
      updatedAt: now,
    },
    create: {
      id:        projectId,
      name:      state.name,
      userId,
      shapes:    state.shapes,
      beds:      state.beds,
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
    shapes:   project.shapes as GardenState["shapes"],
    beds:     project.beds   as GardenState["beds"],
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

export async function deleteGarden(
  userId: string,
  projectId: string
): Promise<void> {
  await prisma.garden_projects.deleteMany({
    where: { id: projectId, userId },
  });
  revalidatePath("/");
}