import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/auth/register/route";

const mockFindUnique = vi.fn();
const mockCreate = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: mockFindUnique,
      create: mockCreate
    }
  }
}));

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("201 dondurur", async () => {
    mockFindUnique.mockResolvedValue(null);
    mockCreate.mockResolvedValue({ id: "u1" });

    const req = new Request("http://localhost/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Test", email: "t@t.com", password: "123456", birthDate: "2000-01-01" })
    });

    const res = await POST(req as never);
    expect(res.status).toBe(201);
  });

  it("409 dondurur", async () => {
    mockFindUnique.mockResolvedValue({ id: "u1" });

    const req = new Request("http://localhost/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Test", email: "t@t.com", password: "123456", birthDate: "2000-01-01" })
    });

    const res = await POST(req as never);
    expect(res.status).toBe(409);
  });
});
