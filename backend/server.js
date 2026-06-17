import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import multer from "multer";
import { PDFParse } from "pdf-parse";
import Groq from "groq-sdk";
import { readFileSync } from "fs";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

const PORT = process.env.PORT || 5000;
const upload = multer({ storage: multer.memoryStorage() });

const hasGroqKey = Boolean(process.env.GROQ_API_KEY);
const groqClient = hasGroqKey ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null;

const eventClients = new Set();
const emitRealtimeEvent = (type, payload = {}) => {
  const event = {
    type,
    payload,
    timestamp: new Date().toISOString()
  };

  for (const client of eventClients) {
    client.write(`data: ${JSON.stringify(event)}\n\n`);
  }
};

const EMISSION_FACTORS = {
  Transport: {
    carKm: 0.26,
    busKm: 0.089,
    trainKm: 0.041
  },
  Food: {
    beefMeal: 6.2,
    vegetarianMeal: 1.4,
    dairyServing: 1.9
  },
  Electricity: {
    kWh: 0.393
  },
  Shopping: {
    fastFashionItem: 7.2,
    secondhandItem: 1.4
  },
  Lifestyle: {
    hotShowerMinute: 0.15
  }
};

// Database Connection & Memory Fallback State
let isMongoConnected = false;
mongoose
  .connect(process.env.MONGO_URI || "mongodb://localhost:27017/ecosyn")
  .then(() => {
    console.log(`✅ MongoDB connected ${process.env.MONGO_URI}`);
    isMongoConnected = true;
  })
  .catch((err) => {
    console.error("⚠️ MongoDB connection failed. Operating in MEMORY-FALLBACK mode.");
    isMongoConnected = false;
  });

// Load seed data from sample-data.json
let sampleData = {
  profile: {
    studentName: "Eco Warrior",
    sustainabilityScore: 72,
    ecoPoints: 450,
    level: 2,
    levelProgress: 60,
    monthlyFootprint: 152.4,
    predictedFootprintBAU: 168.0,
    predictedFootprintEco: 112.5,
    savingsCO2: 15.0,
    savingsCost: 45.0,
    acceptedRecommendations: [],
    completedChallenges: [],
    badges: ["Energy Saver", "Plant Eater"]
  },
  activities: [],
  recommendations: [],
  challenges: [],
  leaderboard: [],
  twinScenarios: []
};

try {
  const fileUrl = new URL("./sample-data.json", import.meta.url);
  sampleData = JSON.parse(readFileSync(fileUrl, "utf-8"));
} catch (error) {
  console.warn("ℹ️ sample-data.json missing or invalid. Using default fallback configuration.");
}

// Memory Database
let memoryProfile = JSON.parse(JSON.stringify(sampleData.profile));
let memoryActivities = JSON.parse(JSON.stringify(sampleData.activities));
let memoryRecommendations = JSON.parse(JSON.stringify(sampleData.recommendations));
let memoryChallenges = JSON.parse(JSON.stringify(sampleData.challenges));
let memoryLeaderboard = JSON.parse(JSON.stringify(sampleData.leaderboard));
let memoryTwinScenarios = JSON.parse(JSON.stringify(sampleData.twinScenarios || []));

// MongoDB Schemas
const ProfileSchema = new mongoose.Schema({
  studentName: { type: String, default: "Eco Warrior" },
  sustainabilityScore: { type: Number, default: 72 },
  ecoPoints: { type: Number, default: 450 },
  level: { type: Number, default: 2 },
  levelProgress: { type: Number, default: 60 },
  monthlyFootprint: { type: Number, default: 152.4 },
  predictedFootprintBAU: { type: Number, default: 168.0 },
  predictedFootprintEco: { type: Number, default: 112.5 },
  savingsCO2: { type: Number, default: 15.0 },
  savingsCost: { type: Number, default: 45.0 },
  acceptedRecommendations: [String],
  completedChallenges: [String],
  badges: [String],
  twinScenarios: [{
    id: String,
    name: String,
    variables: mongoose.Schema.Types.Mixed,
    calculations: mongoose.Schema.Types.Mixed,
    createdAt: String
  }]
}, { timestamps: true });

const Profile = mongoose.model("Profile", ProfileSchema);

const ActivitySchema = new mongoose.Schema({
  category: String,
  description: String,
  amount: String,
  carbon: Number,
  cost: Number,
  date: String
}, { timestamps: true });

const Activity = mongoose.model("Activity", ActivitySchema);

const ChallengeSchema = new mongoose.Schema({
  id: String,
  title: String,
  description: String,
  category: String,
  points: Number,
  difficulty: String,
  progress: Number,
  target: Number,
  unit: String,
  completed: Boolean
}, { timestamps: true });

const Challenge = mongoose.model("Challenge", ChallengeSchema);

// Helper Utilities
const stripCodeFences = (value = "") =>
  value
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

const safeJsonParse = (payload, fallback) => {
  if (!payload) return fallback;
  try {
    return JSON.parse(stripCodeFences(payload));
  } catch (error) {
    console.error("JSON parse error on content:", payload);
    return fallback;
  }
};

const summarizeActivities = (activities = []) => {
  const totals = activities.reduce((acc, activity) => {
    const category = activity.category || "Lifestyle";
    acc[category] = (acc[category] || 0) + Number(activity.carbon || 0);
    return acc;
  }, {});
  const topCategory = Object.entries(totals).sort((a, b) => b[1] - a[1])[0]?.[0] || "Lifestyle";
  return {
    count: activities.length,
    topCategory,
    totals
  };
};

// Database Operations Wrappers (Mongo with Memory Fallback)
async function getProfile() {
  if (isMongoConnected) {
    try {
      let prof = await Profile.findOne({ studentName: "Eco Warrior" });
      if (!prof) {
        prof = await Profile.create(sampleData.profile);
      }
      return prof;
    } catch (e) {
      console.warn("Mongo error fetching profile, using memory store.");
    }
  }
  return memoryProfile;
}

async function saveProfile(prof) {
  if (isMongoConnected) {
    try {
      await Profile.updateOne({ studentName: "Eco Warrior" }, prof, { upsert: true });
      return;
    } catch (e) {
      console.warn("Mongo error saving profile, updating memory store.");
    }
  }
  memoryProfile = prof;
}

async function getTwinScenarios() {
  const profile = await getProfile();
  return profile.twinScenarios?.length ? profile.twinScenarios : memoryTwinScenarios;
}

async function saveTwinScenario(scenario) {
  const profile = await getProfile();
  const nextScenario = {
    id: scenario.id || `scenario-${Date.now()}`,
    name: scenario.name || `Scenario ${new Date().toLocaleDateString()}`,
    variables: scenario.variables || {},
    calculations: scenario.calculations || {},
    createdAt: scenario.createdAt || new Date().toISOString()
  };

  const currentScenarios = profile.twinScenarios?.length ? profile.twinScenarios : memoryTwinScenarios;
  const nextScenarios = [nextScenario, ...currentScenarios].slice(0, 8);
  profile.twinScenarios = nextScenarios;

  if (Number.isFinite(Number(nextScenario.calculations?.carbonSaved))) {
    profile.savingsCO2 = Number(Math.max(profile.savingsCO2, Number(nextScenario.calculations.carbonSaved)).toFixed(1));
  }
  if (Number.isFinite(Number(nextScenario.calculations?.costSaved))) {
    profile.savingsCost = Number(Math.max(profile.savingsCost, Number(nextScenario.calculations.costSaved)).toFixed(1));
  }
  profile.predictedFootprintEco = Number((profile.predictedFootprintBAU - profile.savingsCO2).toFixed(1));

  checkLevelUp(profile, 10);
  await saveProfile(profile);
  memoryTwinScenarios = nextScenarios;
  return { scenario: nextScenario, profile };
}

async function getActivities() {
  if (isMongoConnected) {
    try {
      const dbActivities = await Activity.find().sort({ createdAt: -1 });
      if (dbActivities.length > 0) return dbActivities;
    } catch (e) {
      console.warn("Mongo error fetching activities, using memory store.");
    }
  }
  return memoryActivities;
}

async function addActivity(activity) {
  if (isMongoConnected) {
    try {
      await Activity.create(activity);
      return;
    } catch (e) {
      console.warn("Mongo error creating activity, using memory store.");
    }
  }
  const newAct = { id: `act-${Date.now()}`, ...activity };
  memoryActivities.unshift(newAct);
  // Cap memory activities to 50
  if (memoryActivities.length > 50) memoryActivities.pop();
}

async function getChallenges() {
  if (isMongoConnected) {
    try {
      const dbChallenges = await Challenge.find();
      if (dbChallenges.length > 0) return dbChallenges;
    } catch (e) {
      console.warn("Mongo error fetching challenges, using memory store.");
    }
  }
  return memoryChallenges;
}

async function updateChallenge(challengeId, updates) {
  if (isMongoConnected) {
    try {
      await Challenge.updateOne({ id: challengeId }, updates);
      return;
    } catch (e) {
      console.warn("Mongo error updating challenge, using memory store.");
    }
  }
  const idx = memoryChallenges.findIndex(c => c.id === challengeId);
  if (idx !== -1) {
    memoryChallenges[idx] = { ...memoryChallenges[idx], ...updates };
  }
}

// Level-up checking function
function checkLevelUp(profile, pointsGained) {
  profile.ecoPoints += pointsGained;

  // Custom leveling up mechanism (e.g. 200 points per level)
  const ptsPerLevel = 200;
  const currentTotal = profile.ecoPoints;
  const newLevel = Math.floor(currentTotal / ptsPerLevel) + 1;

  if (newLevel > profile.level) {
    profile.level = newLevel;
    // Add level up badge if appropriate
    const levelBadge = `Level ${newLevel} Hero`;
    if (!profile.badges.includes(levelBadge)) {
      profile.badges.push(levelBadge);
    }
  }

  profile.levelProgress = Math.round(((currentTotal % ptsPerLevel) / ptsPerLevel) * 100);

  // Dynamically calculate sustainability score (capped at 100)
  // Base 72 + points-based modifier
  profile.sustainabilityScore = Math.min(98, Math.round(70 + (profile.ecoPoints / 50)));
}

// REST API Endpoints

// Real-time event stream for live dashboard updates
app.get("/api/events", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  eventClients.add(res);
  res.write(`data: ${JSON.stringify({ type: "connected", payload: { status: "live" }, timestamp: new Date().toISOString() })}\n\n`);

  req.on("close", () => {
    eventClients.delete(res);
  });
});

// 1. Health Status
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    hasGroqKey,
    database: isMongoConnected ? "mongodb" : "memory",
    realtimeClients: eventClients.size
  });
});

// 2. Fetch User Profile
app.get("/api/profile", async (req, res) => {
  const profile = await getProfile();
  res.json(profile);
});

// 3. Reset Demo State
app.post("/api/profile/reset", async (req, res) => {
  memoryProfile = JSON.parse(JSON.stringify(sampleData.profile));
  memoryActivities = JSON.parse(JSON.stringify(sampleData.activities));
  memoryRecommendations = JSON.parse(JSON.stringify(sampleData.recommendations));
  memoryChallenges = JSON.parse(JSON.stringify(sampleData.challenges));
  memoryLeaderboard = JSON.parse(JSON.stringify(sampleData.leaderboard));

  if (isMongoConnected) {
    try {
      await Profile.deleteMany({});
      await Activity.deleteMany({});
      await Challenge.deleteMany({});
      await Profile.create(sampleData.profile);
      await Activity.insertMany(sampleData.activities);
      await Challenge.insertMany(sampleData.challenges);
    } catch (e) {
      console.warn("Error resetting MongoDB collections. Using memory reset.");
    }
  }
  emitRealtimeEvent("profile.reset", { message: "Demo flow reset to seed data." });
  res.json({ status: "reset", profile: memoryProfile });
});

// 4. Fetch Activities
app.get("/api/activities", async (req, res) => {
  const list = await getActivities();
  res.json(list);
});

// 4b. Emission factors used by UI calculators and manual estimates
app.get("/api/emission-factors", (req, res) => {
  res.json(EMISSION_FACTORS);
});

// 5. Log Custom Activity Manually
app.post("/api/activities/log", async (req, res) => {
  const { category, description, amount, carbon, cost, date } = req.body;
  if (!category || !description) {
    return res.status(400).json({ error: "Category and description are required." });
  }

  const numCarbon = Number(carbon) || 2.5;
  const numCost = Number(cost) || 0;

  const activity = {
    category,
    description,
    amount: amount || "1 occurrence",
    carbon: numCarbon,
    cost: numCost,
    date: date || new Date().toISOString().split("T")[0]
  };

  await addActivity(activity);

  // Update profile monthly emission and predictions
  const profile = await getProfile();
  profile.monthlyFootprint = Number((profile.monthlyFootprint + numCarbon).toFixed(1));
  profile.predictedFootprintBAU = Number((profile.monthlyFootprint * 1.1).toFixed(1));
  profile.predictedFootprintEco = Number((profile.predictedFootprintBAU - profile.savingsCO2).toFixed(1));

  // Award 15 EcoPoints for logging activity
  checkLevelUp(profile, 15);
  await saveProfile(profile);

  emitRealtimeEvent("activity.logged", {
    message: `${activity.description} logged. +15 EcoPoints.`,
    activity,
    profile
  });
  res.json({ status: "logged", activity, profile });
});

// 6. Get Recommendations
app.get("/api/recommendations", async (req, res) => {
  res.json(memoryRecommendations);
});

// 6b. Suggested challenge focus based on the user's largest recent footprint category
app.get("/api/challenges/suggested", async (req, res) => {
  const activities = await getActivities();
  const totals = activities.reduce((acc, activity) => {
    acc[activity.category] = (acc[activity.category] || 0) + Number(activity.carbon || 0);
    return acc;
  }, {});
  const topCategory = Object.entries(totals).sort((a, b) => b[1] - a[1])[0]?.[0] || "Transport";

  const suggestions = {
    Electricity: {
      title: "Smart Power Sprint",
      description: "Cut peak-hour power use and unplug standby devices for three evenings.",
      category: "Electricity",
      estimatedCO2: 8.5
    },
    Transport: {
      title: "Two-Day Transit Swap",
      description: "Replace two solo car trips with transit, cycling, walking, or carpooling.",
      category: "Transport",
      estimatedCO2: 11.0
    },
    Food: {
      title: "Low-Carbon Plate Week",
      description: "Swap two beef-heavy meals for legumes, chicken, or plant-based meals.",
      category: "Food",
      estimatedCO2: 9.6
    },
    Shopping: {
      title: "Secondhand First",
      description: "Buy one planned item used, repaired, borrowed, or skipped entirely.",
      category: "Shopping",
      estimatedCO2: 5.8
    },
    Lifestyle: {
      title: "Short Shower Streak",
      description: "Keep showers below 8 minutes for five days.",
      category: "Lifestyle",
      estimatedCO2: 3.2
    }
  };

  res.json({
    topCategory,
    categoryTotals: totals,
    suggestion: suggestions[topCategory] || suggestions.Transport
  });
});

// 7. Accept Recommendation
app.post("/api/profile/accept-recommendation", async (req, res) => {
  const { recommendationId } = req.body;
  if (!recommendationId) {
    return res.status(400).json({ error: "recommendationId is required." });
  }

  const profile = await getProfile();
  if (profile.acceptedRecommendations.includes(recommendationId)) {
    return res.json({ status: "already_accepted", profile });
  }

  // Find recommendation points/savings
  const rec = memoryRecommendations.find(r => r.id === recommendationId);
  const pts = rec ? rec.points : 50;
  const co2Reduction = rec ? rec.co2Reduction : 10;
  const costSavings = rec ? rec.costSavings : 15;

  profile.acceptedRecommendations.push(recommendationId);
  profile.savingsCO2 = Number((profile.savingsCO2 + co2Reduction).toFixed(1));
  profile.savingsCost = Number((profile.savingsCost + costSavings).toFixed(1));

  // Recalculate predictions
  profile.predictedFootprintEco = Number((profile.predictedFootprintBAU - profile.savingsCO2).toFixed(1));

  // Award points
  checkLevelUp(profile, pts);

  await saveProfile(profile);
  emitRealtimeEvent("recommendation.accepted", {
    message: `${rec?.title || "Recommendation"} accepted. +${pts} EcoPoints.`,
    recommendation: rec,
    profile
  });
  res.json({ status: "accepted", profile, recommendation: rec });
});

// 7b. Carbon Twin saved scenarios
app.get("/api/twin/scenarios", async (req, res) => {
  const scenarios = await getTwinScenarios();
  res.json(scenarios);
});

app.post("/api/twin/scenarios", async (req, res) => {
  const { name, variables, calculations } = req.body;
  if (!variables || !calculations) {
    return res.status(400).json({ error: "variables and calculations are required." });
  }

  const saved = await saveTwinScenario({ name, variables, calculations });
  emitRealtimeEvent("twin.synced", {
    message: `${saved.scenario.name} saved to your Carbon Twin. +10 EcoPoints.`,
    scenario: saved.scenario,
    profile: saved.profile
  });
  res.json({ status: "saved", ...saved });
});

// 8. Fetch Eco Challenges
app.get("/api/challenges", async (req, res) => {
  const list = await getChallenges();
  res.json(list);
});

// 9. Complete Challenge / Update Challenge Progress
app.post("/api/challenges/complete", async (req, res) => {
  const { challengeId } = req.body;
  if (!challengeId) {
    return res.status(400).json({ error: "challengeId is required." });
  }

  const challenges = await getChallenges();
  const chal = challenges.find(c => c.id === challengeId);
  if (!chal) {
    return res.status(404).json({ error: "Challenge not found." });
  }

  if (chal.completed) {
    return res.json({ status: "already_completed", challenge: chal });
  }

  // Increment progress
  chal.progress += 1;
  let completedNow = false;
  if (chal.progress >= chal.target) {
    chal.progress = chal.target;
    chal.completed = true;
    completedNow = true;
  }

  await updateChallenge(challengeId, { progress: chal.progress, completed: chal.completed });

  const profile = await getProfile();
  if (completedNow) {
    checkLevelUp(profile, chal.points);
    profile.completedChallenges.push(challengeId);

    // Add badge for specific achievements
    if (chal.id === "ch-1" && !profile.badges.includes("Veggie Chef")) {
      profile.badges.push("Veggie Chef");
    } else if (chal.id === "ch-2" && !profile.badges.includes("Transit Hero")) {
      profile.badges.push("Transit Hero");
    } else if (chal.id === "ch-3" && !profile.badges.includes("Vampire Slayer")) {
      profile.badges.push("Vampire Slayer");
    }
  } else {
    // Award 5 points for incremental progress check-in
    checkLevelUp(profile, 5);
  }

  await saveProfile(profile);
  emitRealtimeEvent("challenge.progressed", {
    message: completedNow ? `${chal.title} completed!` : `${chal.title} progress checked in. +5 EcoPoints.`,
    challenge: chal,
    profile,
    completedNow
  });
  res.json({ status: "progressed", challenge: chal, profile, completedNow });
});

// 10. Fetch Leaderboard
app.get("/api/leaderboard", async (req, res) => {
  const profile = await getProfile();

  // Dynamically update user stats on leaderboard
  const updatedLeaderboard = memoryLeaderboard.map(user => {
    if (user.isCurrentUser) {
      return {
        ...user,
        level: profile.level,
        points: profile.ecoPoints
      };
    }
    return user;
  });

  // Re-sort leaderboard by points descending
  updatedLeaderboard.sort((a, b) => b.points - a.points);
  res.json(updatedLeaderboard);
});

// 11. AI Smart Receipt & Bill Scanner (OCR Estimation)
app.post("/api/scan", upload.single("file"), async (req, res) => {
  const filename = req.file ? req.file.originalname : "electricity_bill.pdf";
  let extractedText = "Mock receipt content";

  if (req.file && req.file.mimetype === "application/pdf") {
    let parser;
    try {
      parser = new PDFParse({ data: req.file.buffer });
      const result = await parser.getText();
      extractedText = result?.text?.slice(0, 8000) || `PDF file parse: ${filename}`;
    } catch (e) {
      extractedText = `File analysis fallback: ${filename}`;
    } finally {
      await parser?.destroy?.();
    }
  } else if (req.file) {
    extractedText = `Uploaded image/document details: Name: ${filename}, Size: ${req.file.size} bytes`;
  }

  if (!hasGroqKey) {
    // Return high-quality mock carbon extraction if Groq API is offline
    const isElectricity = filename.toLowerCase().includes("electric") || filename.toLowerCase().includes("power") || filename.toLowerCase().includes("energy") || filename.toLowerCase().includes("utility") || filename.toLowerCase().includes("bill");

    let simulatedResult;
    if (isElectricity) {
      simulatedResult = {
        title: "City Power Utility Bill Scan",
        category: "Electricity",
        items: [
          { name: "Electricity usage charge", qty: "320 kWh", cost: 74.50, carbon: 125.8 },
          { name: "Distribution surcharge", qty: "1 service", cost: 10.50, carbon: 0.0 }
        ],
        totalCost: 85.00,
        totalCarbon: 125.8,
        recommendation: {
          title: "Vampire Power Mitigation",
          description: "Unplug standby home theater devices and switch off energy-hungry appliances during peak demand hours (4 PM - 8 PM).",
          co2Reduction: 18.5,
          costSavings: 15.00,
          difficulty: "Easy",
          points: 60
        }
      };
    } else {
      simulatedResult = {
        title: "Trader Joe's Grocery Scan",
        category: "Food",
        items: [
          { name: "Organic Beef Sirloin Steak", qty: "0.8 kg", cost: 18.99, carbon: 14.50 },
          { name: "Greek Yogurt & Shredded Cheddar", qty: "2 units", cost: 7.50, carbon: 3.80 },
          { name: "Fresh Broccoli, Carrots & Apples", qty: "1.5 kg", cost: 9.80, carbon: 0.60 }
        ],
        totalCost: 36.29,
        totalCarbon: 18.9,
        recommendation: {
          title: "Sustainable Meal Swapping",
          description: "Replace beef purchases with poultry, fish, or legumes to reduce food-associated methane footprints by up to 80%.",
          co2Reduction: 12.0,
          costSavings: 10.00,
          difficulty: "Easy",
          points: 50
        }
      };
    }

    // Automatically log this scanned activity
    const activity = {
      category: simulatedResult.category,
      description: simulatedResult.title,
      amount: simulatedResult.category === "Electricity" ? "320 kWh" : "3 food items",
      carbon: simulatedResult.totalCarbon,
      cost: simulatedResult.totalCost,
      date: new Date().toISOString().split("T")[0]
    };
    await addActivity(activity);

    const profile = await getProfile();
    profile.monthlyFootprint = Number((profile.monthlyFootprint + simulatedResult.totalCarbon).toFixed(1));
    profile.predictedFootprintBAU = Number((profile.monthlyFootprint * 1.1).toFixed(1));
    profile.predictedFootprintEco = Number((profile.predictedFootprintBAU - profile.savingsCO2).toFixed(1));
    checkLevelUp(profile, 25); // 25 points bonus for OCR Scan!

    // Inject recommendation dynamically into the local recommendations store
    const isRecExisted = memoryRecommendations.some(r => r.title === simulatedResult.recommendation.title);
    if (!isRecExisted) {
      memoryRecommendations.unshift({
        id: `rec-ocr-${Date.now()}`,
        ...simulatedResult.recommendation,
        category: simulatedResult.category
      });
    }

    await saveProfile(profile);
    emitRealtimeEvent("scan.completed", {
      message: `${simulatedResult.title} scanned and logged. +25 EcoPoints.`,
      result: simulatedResult,
      profile
    });
    return res.json(simulatedResult);
  }

  try {
    const ocrSystemPrompt = `You are EcoScan AI, an expert carbon footprint estimator. You analyze bills and receipts.
Estimate the carbon emissions of the activities in this receipt or bill.
Provide:
- A title for the bill/receipt (e.g. "Grocery Shopping at Target", "City Electric Bill")
- Category: one of "Electricity", "Transport", "Food", "Shopping", "Lifestyle"
- A list of item details (e.g. 400 kWh electricity, beef, flights) with estimated cost and carbon footprint in kg CO₂
- Total cost in dollars
- Total carbon footprint in kg CO₂
- A personalized recommendation to reduce footprint next time (with title, description, co2Reduction, costSavings, difficulty: "Easy"|"Medium"|"Hard", and points: 30-100)

Return ONLY a valid JSON object matching this schema:
{
  "title": "string",
  "category": "Electricity" | "Transport" | "Food" | "Shopping" | "Lifestyle",
  "items": [{"name": "string", "qty": "string", "cost": number, "carbon": number}],
  "totalCost": number,
  "totalCarbon": number,
  "recommendation": {
    "title": "string",
    "description": "string",
    "co2Reduction": number,
    "costSavings": number,
    "difficulty": "Easy" | "Medium" | "Hard",
    "points": number
  }
}`;

    const completion = await groqClient.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: ocrSystemPrompt },
        { role: "user", content: `Filename: ${filename}\nExtracted text/details: ${extractedText}` }
      ]
    });

    const rawResult = completion.choices?.[0]?.message?.content?.trim();
    const result = safeJsonParse(rawResult, null);

    if (!result) {
      throw new Error("Unable to parse AI OCR response.");
    }

    // Save as activity
    const activity = {
      category: result.category || "Lifestyle",
      description: result.title || `Scanned receipt: ${filename}`,
      amount: result.items?.[0]?.qty || "1 batch",
      carbon: Number(result.totalCarbon) || 10,
      cost: Number(result.totalCost) || 0,
      date: new Date().toISOString().split("T")[0]
    };
    await addActivity(activity);

    const profile = await getProfile();
    profile.monthlyFootprint = Number((profile.monthlyFootprint + activity.carbon).toFixed(1));
    profile.predictedFootprintBAU = Number((profile.monthlyFootprint * 1.1).toFixed(1));
    profile.predictedFootprintEco = Number((profile.predictedFootprintBAU - profile.savingsCO2).toFixed(1));
    checkLevelUp(profile, 25);

    if (result.recommendation) {
      memoryRecommendations.unshift({
        id: `rec-ocr-${Date.now()}`,
        ...result.recommendation,
        category: result.category || "Lifestyle"
      });
    }

    await saveProfile(profile);
    emitRealtimeEvent("scan.completed", {
      message: `${result.title || "Receipt"} scanned and logged. +25 EcoPoints.`,
      result,
      profile
    });
    res.json(result);

  } catch (error) {
    console.error("AI OCR scanner failed:", error.message);
    res.status(500).json({ error: "AI OCR scanning service error. Try uploading a different file." });
  }
});

// 12. AI Vision-Based Carbon Assessment (Image Classify & Recommendation)
app.post("/api/vision", upload.single("file"), async (req, res) => {
  const filename = req.file ? req.file.originalname : "appliance.jpg";
  const { description = "Household object photo" } = req.body;

  if (!hasGroqKey) {
    // Simulated vision classification falls back
    const nameLower = filename.toLowerCase();
    let simulatedResult;

    if (nameLower.includes("car") || nameLower.includes("vehicle") || nameLower.includes("suv") || nameLower.includes("tesla")) {
      simulatedResult = {
        objectName: "Gasoline Combustion SUV",
        category: "Transport",
        carbonFootprint: { value: 460.5, unit: "kg CO2 / month", rating: "High" },
        energyEfficiency: { rating: "E", details: "Fuel economy averaging 22 MPG (10.7 L/100km)." },
        alternatives: [
          { name: "Hybrid Compact Crossover", carbonSavings: 180.0, costSavings: 65.00, description: "Switching to a modern hybrid reduces emissions by 40%." },
          { name: "Public Transit Commuting", carbonSavings: 310.0, costSavings: 120.00, description: "Utilize subway/train networks for daily workplace travel." }
        ]
      };
    } else if (nameLower.includes("refrigerator") || nameLower.includes("fridge") || nameLower.includes("ac") || nameLower.includes("appliance")) {
      simulatedResult = {
        objectName: "Old Refrigerator (Vintage 2012)",
        category: "Electricity",
        carbonFootprint: { value: 65.2, unit: "kg CO2 / month", rating: "Medium" },
        energyEfficiency: { rating: "F", details: "Estimated annual power draw of 680 kWh." },
        alternatives: [
          { name: "ENERGY STAR certified refrigerator", carbonSavings: 28.5, costSavings: 12.00, description: "Modern compressors consume 45% less power than models from 10+ years ago." },
          { name: "Smart Plug Schedule", carbonSavings: 8.0, costSavings: 4.50, description: "Program thermostat cycles to reduce cooling intensities during cold evenings." }
        ]
      };
    } else {
      // Meal fallback
      simulatedResult = {
        objectName: "Hamburger & French Fries Plate",
        category: "Food",
        carbonFootprint: { value: 5.8, unit: "kg CO2 / meal", rating: "High" },
        energyEfficiency: { rating: "N/A", details: "High methane footprint associated with beef cattle rearing and supply chains." },
        alternatives: [
          { name: "Beyond Meat Plant-Based Burger", carbonSavings: 4.6, costSavings: 2.50, description: "Plant-based mock meats yield 90% fewer greenhouse emissions." },
          { name: "Grilled Salmon Steak Meal", carbonSavings: 3.2, costSavings: 1.00, description: "Opting for wild-caught fish cuts food footprints by more than half." }
        ]
      };
    }

    // Automatically log this vision activity
    const activity = {
      category: simulatedResult.category,
      description: `Vision scan: ${simulatedResult.objectName}`,
      amount: "1 item",
      carbon: simulatedResult.category === "Transport" ? 25.0 : (simulatedResult.category === "Electricity" ? 8.5 : 5.8),
      cost: simulatedResult.category === "Food" ? 14.0 : 0.0,
      date: new Date().toISOString().split("T")[0]
    };
    await addActivity(activity);

    const profile = await getProfile();
    profile.monthlyFootprint = Number((profile.monthlyFootprint + activity.carbon).toFixed(1));
    profile.predictedFootprintBAU = Number((profile.monthlyFootprint * 1.1).toFixed(1));
    profile.predictedFootprintEco = Number((profile.predictedFootprintBAU - profile.savingsCO2).toFixed(1));
    checkLevelUp(profile, 20); // 20 points vision scan bonus

    // Inject first alternative as a recommendation
    const alt = simulatedResult.alternatives[0];
    const isRecExisted = memoryRecommendations.some(r => r.title === alt.name);
    if (!isRecExisted) {
      memoryRecommendations.unshift({
        id: `rec-vis-${Date.now()}`,
        title: alt.name,
        description: alt.description,
        co2Reduction: alt.carbonSavings / 10, // scale appropriately
        costSavings: alt.costSavings,
        difficulty: "Medium",
        points: 70,
        category: simulatedResult.category
      });
    }

    await saveProfile(profile);
    emitRealtimeEvent("vision.completed", {
      message: `${simulatedResult.objectName} assessed and logged. +20 EcoPoints.`,
      result: simulatedResult,
      profile
    });
    return res.json(simulatedResult);
  }

  try {
    const visionSystemPrompt = `You are EcoVision AI, an expert computer vision assistant for carbon footprint assessment.
Analyze the user's uploaded image of an object (categorized into Transport, Food, Electricity, Shopping, or Lifestyle).
Provide:
- Object name / identified type
- Category: one of "Electricity", "Transport", "Food", "Shopping", "Lifestyle"
- Carbon footprint rating: "Low" | "Medium" | "High" and value in kg CO₂
- Energy efficiency (rating A-G or details if applicable, otherwise "N/A")
- 2 sustainable green alternatives with carbon savings in kg CO₂ and money saved in dollars, and a description.

Return ONLY a valid JSON object matching this schema:
{
  "objectName": "string",
  "category": "Electricity" | "Transport" | "Food" | "Shopping" | "Lifestyle",
  "carbonFootprint": {
    "value": number,
    "unit": "kg CO2",
    "rating": "Low" | "Medium" | "High"
  },
  "energyEfficiency": {
    "rating": "string",
    "details": "string"
  },
  "alternatives": [
    {
      "name": "string",
      "carbonSavings": number,
      "costSavings": number,
      "description": "string"
    }
  ]
}`;

    const completion = await groqClient.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: visionSystemPrompt },
        { role: "user", content: `Filename: ${filename}\nAdditional user description: ${description}` }
      ]
    });

    const rawResult = completion.choices?.[0]?.message?.content?.trim();
    const result = safeJsonParse(rawResult, null);

    if (!result) {
      throw new Error("Unable to parse AI vision response.");
    }

    // Save as activity
    const activity = {
      category: result.category || "Lifestyle",
      description: `Vision identified: ${result.objectName}`,
      amount: "1 item",
      carbon: Number(result.carbonFootprint?.value) || 5.0,
      cost: 0,
      date: new Date().toISOString().split("T")[0]
    };
    await addActivity(activity);

    const profile = await getProfile();
    profile.monthlyFootprint = Number((profile.monthlyFootprint + activity.carbon).toFixed(1));
    profile.predictedFootprintBAU = Number((profile.monthlyFootprint * 1.1).toFixed(1));
    profile.predictedFootprintEco = Number((profile.predictedFootprintBAU - profile.savingsCO2).toFixed(1));
    checkLevelUp(profile, 20);

    // Inject alternatives
    if (result.alternatives && result.alternatives.length > 0) {
      result.alternatives.forEach((alt, i) => {
        memoryRecommendations.unshift({
          id: `rec-vis-${Date.now()}-${i}`,
          title: alt.name,
          description: alt.description,
          co2Reduction: alt.carbonSavings,
          costSavings: alt.costSavings,
          difficulty: "Medium",
          points: 70,
          category: result.category || "Lifestyle"
        });
      });
    }

    await saveProfile(profile);
    emitRealtimeEvent("vision.completed", {
      message: `${result.objectName || "Object"} assessed and logged. +20 EcoPoints.`,
      result,
      profile
    });
    res.json(result);

  } catch (error) {
    console.error("AI Vision scanner failed:", error.message);
    res.status(500).json({ error: "AI Vision scanning service error. Try a different image name." });
  }
});

// 13. AI Personalized Coach Chat
app.post("/api/coach/chat", async (req, res) => {
  const { message, history = [] } = req.body;
  if (!message) {
    return res.status(400).json({ error: "Message is required" });
  }

  const profile = await getProfile();
  const activities = await getActivities();
  const activitySummary = summarizeActivities(activities);

  if (!hasGroqKey) {
    const defaultReplies = [
      "Switching to public transit or cycling just 2 days a week can cut your commute emissions by 30%. Would you like to check out some transit challenges?",
      "To decrease food footprint, focus on minimizing waste and purchasing local produce. Swapping red meat for poultry or plant-based meals cuts footprint significantly.",
      "Vampire loads consume 5-10% of household electricity. Unplugging home devices and entertainment units during work hours yields effortless savings!",
      "Heating and cooling account for over half of household utility emissions. Consider lowering your thermostat by 2°C in winter or raising it in summer to save $50 annually."
    ];
    const randomReply = defaultReplies[Math.floor(Math.random() * defaultReplies.length)];

    return res.json({
      reply: `[EcoCoach Fallback Mode]\n\nHello, ${profile.studentName}! ${randomReply}\n\nYour current sustainability score is ${profile.sustainabilityScore}/100 and you have saved ${profile.savingsCO2} kg CO₂ so far. Keep it up!`
    });
  }

  try {
    const coachSystemPrompt = `You are EcoCoach, a personalized AI sustainability coach. You help users reduce their carbon footprint, adopt sustainable habits, and save money.
Keep your answers highly encouraging, friendly, and actionable. Suggest specific, practical modifications.
Keep your response concise and under 150 words.
Use user statistics in your replies:
- Current Footprint: ${profile.monthlyFootprint} kg CO2/month
- Sustainability Score: ${profile.sustainabilityScore}/100
- EcoPoints: ${profile.ecoPoints} (Level ${profile.level})
- Total Carbon Savings: ${profile.savingsCO2} kg CO2
- Logged Activities: ${activitySummary.count}
- Largest Footprint Category: ${activitySummary.topCategory}
- Category Totals: ${JSON.stringify(activitySummary.totals)}`;

    const completion = await groqClient.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0.3,
      messages: [
        { role: "system", content: coachSystemPrompt },
        ...history.slice(-6), // Send last 6 messages for context
        { role: "user", content: message }
      ]
    });

    res.json({
      reply: completion.choices?.[0]?.message?.content || "Keep syncing your lifestyle with a sustainable future!"
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 EcoSyn API server listening on http://localhost:${PORT}`);
});
