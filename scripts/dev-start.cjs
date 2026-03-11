const { execSync, spawn } = require("child_process");

const PORT = process.env.PORT || "3000";

function killProcessOnPort(port) {
  if (process.platform !== "win32") {
    return;
  }

  try {
    const output = execSync(
      `powershell -NoProfile -Command "$conn = Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue; if ($conn) { $conn | Select-Object -ExpandProperty OwningProcess -Unique }"`,
      { stdio: ["ignore", "pipe", "ignore"] }
    )
      .toString()
      .trim();

    if (!output) {
      return;
    }

    const pids = output
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (pids.length > 0) {
      execSync(
        `powershell -NoProfile -Command "$pids = @(${pids.join(",")}); $pids | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }"`,
        { stdio: "ignore" }
      );
      console.log(`Stopped process on port ${port}: ${pids.join(", ")}`);
    }
  } catch {
    // Continue even if port cleanup fails.
  }
}

killProcessOnPort(PORT);

const command =
  process.platform === "win32"
    ? `npx next dev -p ${PORT}`
    : `npx next dev -p ${PORT}`;
const child = spawn(command, {
  stdio: "inherit",
  shell: true,
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
