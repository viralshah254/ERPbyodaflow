const runtimeMode = process.env.NEXT_PUBLIC_RUNTIME_MODE ?? "live";
const enableDevAuth = (process.env.NEXT_PUBLIC_ENABLE_DEV_AUTH ?? "0") === "1";
const enableMockAuth = (process.env.NEXT_PUBLIC_ENABLE_MOCK_AUTH ?? "0") === "1";
const demoMode = (process.env.NEXT_PUBLIC_API_DEMO_MODE ?? "0") === "1";

const allowedModes = new Set(["live", "dev", "demo"]);
if (!allowedModes.has(runtimeMode)) {
  throw new Error(`NEXT_PUBLIC_RUNTIME_MODE must be one of: ${Array.from(allowedModes).join(", ")}`);
}

if (runtimeMode === "live" && (enableDevAuth || enableMockAuth || demoMode)) {
  throw new Error("Live runtime mode cannot enable dev auth, mock auth, or demo mode.");
}

if (runtimeMode === "demo" && !enableMockAuth) {
  throw new Error("Demo runtime mode requires NEXT_PUBLIC_ENABLE_MOCK_AUTH=1.");
}

if (enableMockAuth && !enableDevAuth) {
  throw new Error("Mock auth requires NEXT_PUBLIC_ENABLE_DEV_AUTH=1.");
}

console.log("Frontend environment policy validated.");
