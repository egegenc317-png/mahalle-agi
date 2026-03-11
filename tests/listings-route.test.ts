import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/listings/route";

const mockFindMany = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    listing: {
      findMany: mockFindMany
    }
  }
}));

describe("GET /api/listings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("liste dondurur", async () => {
    mockFindMany.mockResolvedValue([{ id: "l1", title: "Deneme" }]);

    const req = new Request("http://localhost/api/listings?type=PRODUCT");
    const res = await GET(req as never);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.items).toHaveLength(1);
  });
});
