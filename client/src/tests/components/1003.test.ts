// tests/navbar-home-link.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Navbar from "../src/components/Navbar"; // adjust path
import { useRouter } from "next/navigation";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));

describe("Navbar Home link", () => {
  const pushMock = vi.fn();

  beforeEach(() => {
    (useRouter as unknown as vi.Mock).mockReturnValue({ push: pushMock });
    render(<Navbar />);
  });

  it("navigates to '/' when Home is clicked", async () => {
    const user = userEvent.setup();
    const homeLink = screen.getByRole("link", { name: /home/i });

    await user.click(homeLink);

    expect(pushMock).toHaveBeenCalledWith("/");
  });
});
