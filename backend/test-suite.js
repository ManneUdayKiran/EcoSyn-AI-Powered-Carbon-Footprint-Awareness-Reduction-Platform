import { spawn } from "child_process";
import test from "node:test";
import assert from "node:assert";
import crypto from "crypto";

const PORT = 5099;
const baseUrl = `http://localhost:${PORT}`;

const JWT_SECRET = "ecosyn-test-secret-key-with-at-least-32-bytes";

function generateExpiredToken(userId, email) {
  const payload = JSON.stringify({ 
    userId, 
    email, 
    exp: Date.now() - 1000 // Expired 1 second ago
  });
  const signature = crypto.createHmac("sha256", JWT_SECRET).update(payload).digest("hex");
  return Buffer.from(payload).toString("base64") + "." + signature;
}

// Launch server in isolated test environment
const startTestServer = () => {
  return new Promise((resolve, reject) => {
    console.log(`Starting test server on port ${PORT}...`);
    const proc = spawn("node", ["server.js"], {
      env: {
        ...process.env,
        PORT: PORT.toString(),
        JWT_SECRET,
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

  await t.test("9. Token Verification - Expired token rejection", async () => {
    const expiredToken = generateExpiredToken("some-user-id", testEmail);
    const res = await fetch(`${baseUrl}/api/profile`, {
      headers: {
        "Authorization": `Bearer ${expiredToken}`
      }
    });
    assert.strictEqual(res.status, 401);
    const data = await res.json();
    assert.ok(data.error.includes("expired"));
  });

  await t.test("10. Token Verification - Signature tampering rejection", async () => {
    // Tamper the signature part of the token
    const tamperedToken = testUserToken.slice(0, -1) + (testUserToken.endsWith("z") ? "a" : "z");
    const res = await fetch(`${baseUrl}/api/profile`, {
      headers: {
        "Authorization": `Bearer ${tamperedToken}`
      }
    });
    assert.strictEqual(res.status, 401);
    const data = await res.json();
    assert.ok(data.error.includes("Invalid"));
  });

  await t.test("11. Auth - Memory login credential validation", async () => {
    // Incorrect password
    const res1 = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: testEmail, password: "WrongPassword" })
    });
    assert.strictEqual(res1.status, 400);

    // Non-existent user
    const res2 = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "notexists@ecosyn.edu", password: "Password123!" })
    });
    assert.strictEqual(res2.status, 400);
  });

  await t.test("12. GET /api/events - Real-time SSE authentication", async () => {
    // Missing token
    const res1 = await fetch(`${baseUrl}/api/events`);
    assert.strictEqual(res1.status, 401);

    // Invalid token
    const res2 = await fetch(`${baseUrl}/api/events?token=invalid`);
    assert.strictEqual(res2.status, 401);

    // Valid token
    const controller = new AbortController();
    const res3 = await fetch(`${baseUrl}/api/events?token=${testUserToken}`, { signal: controller.signal });
    assert.strictEqual(res3.status, 200);
    assert.ok(res3.headers.get("content-type").includes("text/event-stream"));
    controller.abort();
  });

  await t.test("13. AI Route Fallbacks - OCR, Vision & Chat resilience", async () => {
    // /api/scan fallback check
    const scanForm = new FormData();
    scanForm.append("file", new Blob(["mock"], { type: "application/pdf" }), "electricity_bill.pdf");
    const scanRes = await fetch(`${baseUrl}/api/scan`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${testUserToken}` },
      body: scanForm
    });
    assert.strictEqual(scanRes.status, 200);
    const scanData = await scanRes.json();
    assert.strictEqual(scanData.category, "Electricity");
    assert.ok(scanData.totalCarbon > 0);

    // /api/vision fallback check
    const visionForm = new FormData();
    visionForm.append("file", new Blob(["mock"], { type: "image/jpeg" }), "refrigerator.jpg");
    const visionRes = await fetch(`${baseUrl}/api/vision`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${testUserToken}` },
      body: visionForm
    });
    assert.strictEqual(visionRes.status, 200);
    const visionData = await visionRes.json();
    assert.strictEqual(visionData.category, "Electricity");
    assert.ok(visionData.alternatives.length > 0);

    // /api/coach/chat fallback check
    const chatRes = await fetch(`${baseUrl}/api/coach/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${testUserToken}`
      },
      body: JSON.stringify({ message: "How to save carbon footprint?" })
    });
    assert.strictEqual(chatRes.status, 200);
    const chatData = await chatRes.json();
    assert.ok(chatData.reply.includes("Fallback Mode"));
  });

  await t.test("14. Upload validation rejects missing and unsupported files", async () => {
    const missing = await fetch(`${baseUrl}/api/vision`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${testUserToken}` }
    });
    assert.strictEqual(missing.status, 400);

    const unsupportedForm = new FormData();
    unsupportedForm.append("file", new Blob(["text"], { type: "text/plain" }), "payload.txt");
    const unsupported = await fetch(`${baseUrl}/api/vision`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${testUserToken}` },
      body: unsupportedForm
    });
    assert.strictEqual(unsupported.status, 415);
  });

  await t.test("15. Activity and recommendation validation rejects corrupt input", async () => {
    const activity = await fetch(`${baseUrl}/api/activities/log`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${testUserToken}` },
      body: JSON.stringify({ category: "Transport", description: "Invalid", carbon: -1 })
    });
    assert.strictEqual(activity.status, 400);

    const recommendation = await fetch(`${baseUrl}/api/profile/accept-recommendation`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${testUserToken}` },
      body: JSON.stringify({ recommendationId: "does-not-exist" })
    });
    assert.strictEqual(recommendation.status, 404);
  });

  await t.test("16. Global Rate Limiter - 429 Block", async () => {
    const requests = [];
    // The limit is 150 requests per minute per IP. We send 155 requests concurrently to trigger 429.
    for (let i = 0; i < 155; i++) {
      requests.push(fetch(`${baseUrl}/api/health`));
    }
    const responses = await Promise.all(requests);
    const tooManyRequestsCount = responses.filter(r => r.status === 429).length;
    assert.ok(tooManyRequestsCount > 0, "Rate limiter should trigger 429 status for excessive calls");
  });
});
