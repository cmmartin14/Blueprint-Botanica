import { describe, it, expect, vi, beforeEach } from "vitest";
import { deleteUserAccount } from "../actions/userActions";
import { stackServerApp } from "@/stack/server";
import { prisma } from "../db/prisma";
import { redirect } from "next/navigation";

vi.mock('server-only', () => ({}));

vi.mock("@/stack/server", () => ({
  stackServerApp: {
    getUser: vi.fn(),
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

vi.mock("../db/prisma", () => ({
  prisma: {
    users_sync: {
      deleteMany: vi.fn(),
    },
  },
}));

describe("deleteUserAccount action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("successfully deletes the user account", async () => {
    const mockUser = {
      id: "user_123",
      delete: vi.fn().mockResolvedValue(undefined),
    };
    (stackServerApp.getUser as any).mockResolvedValue(mockUser);
    (prisma.users_sync.deleteMany as any).mockResolvedValue({ count: 1 });

    await deleteUserAccount();

    expect(prisma.users_sync.deleteMany).toHaveBeenCalledWith({
      where: { id: "user_123" },
    });
    expect(mockUser.delete).toHaveBeenCalled();
    expect(redirect).toHaveBeenCalledWith("/");
  });

  it("throws error if user is not authenticated", async () => {
    (stackServerApp.getUser as any).mockResolvedValue(null);

    await expect(deleteUserAccount()).rejects.toThrow("User not found or not authenticated");
  });

  it("throws error if database deletion fails", async () => {
    const mockUser = {
      id: "user_123",
      delete: vi.fn(),
    };
    (stackServerApp.getUser as any).mockResolvedValue(mockUser);
    (prisma.users_sync.deleteMany as any).mockRejectedValue(new Error("DB error"));

    await expect(deleteUserAccount()).rejects.toThrow("Failed to delete user account. Please try again.");
    expect(mockUser.delete).not.toHaveBeenCalled();
  });
});
