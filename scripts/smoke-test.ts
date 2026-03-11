// @ts-nocheck
import "dotenv/config";

const baseUrl = process.env.SMOKE_BASE_URL || "http://localhost:3000";

async function expectOk(path: string) {
  const response = await fetch(`${baseUrl}${path}`, { redirect: "manual" });
  if (!response.ok) {
    throw new Error(`${path} failed with status ${response.status}`);
  }
  return response;
}

async function main() {
  const home = await expectOk("/");
  const login = await expectOk("/auth/login");
  const health = await expectOk("/api/health");
  const healthJson = await health.json();

  if (!healthJson.ok) {
    throw new Error("Health endpoint unhealthy");
  }

  console.log(
    JSON.stringify({
      ok: true,
      baseUrl,
      checked: {
        home: home.status,
        login: login.status,
        health: health.status
      },
      health: healthJson.checks
    })
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
