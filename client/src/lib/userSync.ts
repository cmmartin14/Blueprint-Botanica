import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "../db/prisma";

type SyncableUser = {
  id: string;
  primaryEmail?: string | null;
  displayName?: string | null;
};

function toJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

export async function syncUserToNeon(user: SyncableUser): Promise<void> {
  const now = new Date();

  await prisma.users_sync.upsert({
    where: { id: user.id },
    update: {
      email: user.primaryEmail ?? undefined,
      name: user.displayName ?? undefined,
      updated_at: now,
      deleted_at: null,
      raw_json: toJson(user),
    },
    create: {
      id: user.id,
      email: user.primaryEmail ?? undefined,
      name: user.displayName ?? undefined,
      created_at: now,
      updated_at: now,
      raw_json: toJson(user),
    },
  });
}

export async function ensureUserRowExists(userId: string): Promise<void> {
  const now = new Date();

  await prisma.users_sync.upsert({
    where: { id: userId },
    update: {
      updated_at: now,
      deleted_at: null,
    },
    create: {
      id: userId,
      created_at: now,
      updated_at: now,
    },
  });
}
