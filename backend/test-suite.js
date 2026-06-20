import { spawn } from "child_process";
import test from "node:test";
import assert from "node:assert";

const PORT = 5099;
const baseUrl = `http://localhost:${PORT}`;

// Launch server in isolated test environment
const startTestServer = () => {
  return new Promise((resolve, reject) => {
    console.log(`Starting test server on port ${PORT}...`);
    const proc = spawn("node", ["server.js"], {
      env: {
        ...process.env,
        PORT: PORT.toString(),
        MONGODB_URI: "mongodb://invalid-uri-fallback-to-memory", // force memory database fallback
        GROQ_API_KEY: "" // force simulated responses
      }
    });

    let stdoutBuffer = "";
    proc.stdout.on("data", (data) => {
      stdoutBuffer += data.toString();
      if (stdoutBuffer.includes("listening on") || stdoutBuffer.includes("listening")) {
        console.log("✅ Test server is active!");
        resolve(proc);
      }
    });

    proc.stderr.on("data", (data) => {
      console.error(`[Server Stderr]: ${data}`);
    });

    proc.on("error", (err) => {
      reject(err);
    });

    // Timeout after 8 seconds
    setTimeout(() => {
      reject(new Error("Test server failed to start within timeout."));
    }, 8000);
  });
};

test("EcoSyn Core Backend Integration Tests", async (t) => {
  let serverProcess;
  try {
    serverProcess = await startTestServer();
  } catch (error) {
    console.error("Initialization failed:", error);
    process.exit(1);
  }

  let testUserToken = "";
  const testEmail = `test-${Date.now()}@ecosyn.edu`;
  const testPassword = "Password123!";
  const testName = "Carbon Tester";

  // Test block teardown hook to stop the server subprocess
  t.after(() => {
    if (serverProcess) {
      console.log("Shutting down test server...");
      serverProcess.kill("SIGTERM");
    }
  });

  await t.test("1. GET /api/health - Server health report", async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.status, "ok");
    assert.strictEqual(data.database, "memory"); // Fallback mode active
  });

  await t.test("2. POST /api/auth/signup - Validation checks", async () => {
    const res = await fetch(`${baseUrl}/api/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: testEmail }) // Missing password
    });
    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.ok(data.error);
  });

  await t.test("3. POST /api/auth/signup - Success flow", async () => {
    const res = await fetch(`${baseUrl}/api/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
        studentName: testName
      })
    });
    assert.strictEqual(res.status, 201);
    const data = await res.json();
    assert.strictEqual(data.status, "success");
    assert.ok(data.token);
    assert.strictEqual(data.profile.isOnboarded, false);
    assert.strictEqual(data.profile.studentName, testName);
  });

  await t.test("4. POST /api/auth/login - Authentication validation", async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword
      })
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.status, "success");
    assert.ok(data.token);
    testUserToken = data.token;
  });

  await t.test("5. POST /api/profile/onboard - Invalid values boundary validation", async () => {
    const payloads = [
      { travel: "rocket", diet: "mixed", electricity: 300, shopping: 2 }, // Bad travel
      { travel: "car", diet: "insects", electricity: 300, shopping: 2 }, // Bad diet
      { travel: "car", diet: "mixed", electricity: 50, shopping: 2 }, // Out of bounds electricity low
      { travel: "car", diet: "mixed", electricity: 1200, shopping: 2 }, // Out of bounds electricity high
      { travel: "car", diet: "mixed", electricity: 300, shopping: -1 }, // Out of bounds shopping low
      { travel: "car", diet: "mixed", electricity: 300, shopping: 15 } // Out of bounds shopping high
    ];

    for (const body of payloads) {
      const res = await fetch(`${baseUrl}/api/profile/onboard`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${testUserToken}`
        },
        body: JSON.stringify(body)
      });
      assert.strictEqual(res.status, 400, `Payload ${JSON.stringify(body)} should be rejected with 400`);
      const data = await res.json();
      assert.ok(data.error, "Error message should be present");
    }
  });

  await t.test("6. POST /api/profile/onboard - Valid completion onboarding", async () => {
    const res = await fetch(`${baseUrl}/api/profile/onboard`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${testUserToken}`
      },
      body: JSON.stringify({
        travel: "car",
        diet: "mixed",
        electricity: 400,
        shopping: 4
      })
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.status, "success");
    assert.strictEqual(data.profile.isOnboarded, true);
    assert.ok(data.profile.monthlyFootprint > 0, "Monthly carbon footprint must be computed and logged");
  });

  await t.test("7. GET /api/profile - Fetch authorized profile stats", async () => {
    const res = await fetch(`${baseUrl}/api/profile`, {
      headers: {
        "Authorization": `Bearer ${testUserToken}`
      }
    });
    assert.strictEqual(res.status, 200);
    const profile = await res.json();
    assert.strictEqual(profile.studentName, testName);
    assert.strictEqual(profile.isOnboarded, true);
  });

  await t.test("8. PUT /api/profile - Update user info parameters", async () => {
    const updatedName = "Green Hero Extraordinaire";
    const res = await fetch(`${baseUrl}/api/profile`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${testUserToken}`
      },
      body: JSON.stringify({
        studentName: updatedName,
        avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=green-hero"
      })
    });
    assert.strictEqual(res.status, 200);
    const result = await res.json();
    assert.strictEqual(result.status, "success");
    assert.strictEqual(result.profile.studentName, updatedName);
    assert.strictEqual(result.profile.avatar, "https://api.dicebear.com/7.x/adventurer/svg?seed=green-hero");
  });
});
