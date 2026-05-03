"use server";

import { stackServerApp } from "@/stack/server";
import { prisma } from "../db/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function deleteUserAccount() {
  const user = await stackServerApp.getUser();

  if (!user) {
    throw new Error("User not found or not authenticated");
  }

  const userId = user.id;

  try {
    // 1. Delete from our database. 
    // This will cascade delete garden_projects due to the onDelete: Cascade in the schema.
    // We use deleteMany to avoid throwing if the record doesn't exist.
    await prisma.users_sync.deleteMany({
      where: { id: userId },
    });

    // 2. Delete from Stack Auth.
    // This will permanently delete the user and sign them out.
    await user.delete();

  } catch (error) {
    console.error("Error deleting user account:", error);
    throw new Error("Failed to delete user account. Please try again.");
  }

  revalidatePath("/");
  redirect("/");
}
