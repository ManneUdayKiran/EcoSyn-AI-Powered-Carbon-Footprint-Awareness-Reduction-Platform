import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import multer from "multer";
import { PDFParse } from "pdf-parse";
import Groq from "groq-sdk";
import { readFileSync } from "fs";
import crypto from "crypto";

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
const dbUri = process.env.MONGODB_URI || process.env.MONGO_URI || "mongodb://localhost:27017/ecosyn";
mongoose
  .connect(dbUri)
  .then(() => {
    console.log(`✅ MongoDB connected: ${dbUri.replace(/:[^@]+@/, ":****@")}`); // Hide credentials in log
    isMongoConnected = true;
  })
  .catch((err) => {
    console.error("⚠️ MongoDB connection failed. Operating in MEMORY-FALLBACK mode:", err.message);
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

// Memory Database (scoped by user ID)
let memoryProfiles = {};
let memoryActivities = {};
let memoryRecommendations = {};
let memoryChallenges = {};
let memoryLeaderboard = JSON.parse(JSON.stringify(sampleData.leaderboard));
let memoryTwinScenarios = {};

// MongoDB Schemas
const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }
}, { timestamps: true });

const User = mongoose.model("User", UserSchema);

const LogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
  action: { type: String, required: true },
  details: { type: mongoose.Schema.Types.Mixed },
  timestamp: { type: Date, default: Date.now }
});

const Log = mongoose.model("Log", LogSchema);

const ProfileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  studentName: { type: String, default: "Eco Warrior" },
  avatar: { type: String, default: "" },
  isOnboarded: { type: Boolean, default: false },
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
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  category: String,
  description: String,
  amount: String,
  carbon: Number,
  cost: Number,
  date: String
}, { timestamps: true });

const Activity = mongoose.model("Activity", ActivitySchema);

const ChallengeSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
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
const freshProfileDefaults = {
  isOnboarded: false,
  sustainabilityScore: 70,
  ecoPoints: 0,
  level: 1,
  levelProgress: 0,
  monthlyFootprint: 0,
  predictedFootprintBAU: 0,
  predictedFootprintEco: 0,
  savingsCO2: 0,
  savingsCost: 0,
  acceptedRecommendations: [],
  completedChallenges: [],
  badges: [],
  twinScenarios: []
};

async function getProfile(userId, customName) {
  const name = customName || "Eco Warrior";
  const seed = encodeURIComponent(name + "-" + userId.toString().slice(-4));
  const avatarUrl = `https://api.dicebear.com/7.x/adventurer/svg?seed=${seed}`;

  if (isMongoConnected) {
    try {
      let prof = await Profile.findOne({ userId });
      if (!prof) {
        prof = await Profile.create({
          userId,
          studentName: name,
          avatar: avatarUrl,
          ...freshProfileDefaults
        });
      } else if (!prof.avatar) {
        prof.avatar = avatarUrl;
        await prof.save();
      }
      return prof;
    } catch (e) {
      console.warn("Mongo error fetching profile, using memory store.");
    }
  }
  if (!memoryProfiles[userId]) {
    memoryProfiles[userId] = {
      userId,
      studentName: name,
      avatar: avatarUrl,
      ...JSON.parse(JSON.stringify(freshProfileDefaults))
    };
  } else if (!memoryProfiles[userId].avatar) {
    memoryProfiles[userId].avatar = avatarUrl;
  }
  return memoryProfiles[userId];
}

async function saveProfile(userId, prof) {
  if (isMongoConnected) {
    try {
      await Profile.updateOne({ userId }, prof, { upsert: true });
      return;
    } catch (e) {
      console.warn("Mongo error saving profile, updating memory store.");
    }
  }
  memoryProfiles[userId] = prof;
}

async function getRecommendations(userId) {
  if (!memoryRecommendations[userId]) {
    memoryRecommendations[userId] = JSON.parse(JSON.stringify(sampleData.recommendations || []));
  }
  return memoryRecommendations[userId];
}

async function addRecommendation(userId, rec) {
  if (!memoryRecommendations[userId]) {
    memoryRecommendations[userId] = JSON.parse(JSON.stringify(sampleData.recommendations || []));
  }
  const exists = memoryRecommendations[userId].some(r => r.title === rec.title);
  if (!exists) {
    memoryRecommendations[userId].unshift(rec);
  }
}

async function getTwinScenarios(userId) {
  const profile = await getProfile(userId);
  if (!memoryTwinScenarios[userId]) {
    memoryTwinScenarios[userId] = [];
  }
  return profile.twinScenarios?.length ? profile.twinScenarios : memoryTwinScenarios[userId];
}

async function saveTwinScenario(userId, scenario) {
  const profile = await getProfile(userId);
  const nextScenario = {
    id: scenario.id || `scenario-${Date.now()}`,
    name: scenario.name || `Scenario ${new Date().toLocaleDateString()}`,
    variables: scenario.variables || {},
    calculations: scenario.calculations || {},
    createdAt: scenario.createdAt || new Date().toISOString()
  };

  if (!memoryTwinScenarios[userId]) {
    memoryTwinScenarios[userId] = [];
  }
  const currentScenarios = profile.twinScenarios?.length ? profile.twinScenarios : memoryTwinScenarios[userId];
  const nextScenarios = [nextScenario, ...currentScenarios].slice(0, 8);
  profile.twinScenarios = nextScenarios;
  memoryTwinScenarios[userId] = nextScenarios;

  await saveProfile(userId, profile);
  const updatedProfile = await recalculateProfileMetrics(userId);
  return { scenario: nextScenario, profile: updatedProfile };
}

async function getActivities(userId) {
  if (isMongoConnected) {
    try {
      const dbActivities = await Activity.find({ userId }).sort({ createdAt: -1 });
      return dbActivities;
    } catch (e) {
      console.warn("Mongo error fetching activities, using memory store.");
    }
  }
  if (!memoryActivities[userId]) {
    memoryActivities[userId] = [];
  }
  return memoryActivities[userId];
}

async function addActivity(userId, activity) {
  if (isMongoConnected) {
    try {
      await Activity.create({ userId, ...activity });
      return;
    } catch (e) {
      console.warn("Mongo error creating activity, using memory store.");
    }
  }
  const newAct = { id: `act-${Date.now()}`, userId, ...activity };
  if (!memoryActivities[userId]) {
    memoryActivities[userId] = [];
  }
  memoryActivities[userId].unshift(newAct);
  // Cap memory activities to 50
  if (memoryActivities[userId].length > 50) memoryActivities[userId].pop();
}

async function getChallenges(userId) {
  if (isMongoConnected) {
    try {
      let dbChallenges = await Challenge.find({ userId });
      if (dbChallenges.length > 0) return dbChallenges;
      // Seed default challenges for this user in DB starting fresh
      const seeded = sampleData.challenges.map(c => ({ ...c, progress: 0, completed: false, userId }));
      dbChallenges = await Challenge.insertMany(seeded);
      return dbChallenges;
    } catch (e) {
      console.warn("Mongo error fetching challenges, using memory store.");
    }
  }
  if (!memoryChallenges[userId] || memoryChallenges[userId].length === 0) {
    memoryChallenges[userId] = sampleData.challenges.map(c => ({ ...c, progress: 0, completed: false, userId }));
  }
  return memoryChallenges[userId];
}

async function updateChallenge(userId, challengeId, updates) {
  if (isMongoConnected) {
    try {
      await Challenge.updateOne({ userId, id: challengeId }, updates);
      return;
    } catch (e) {
      console.warn("Mongo error updating challenge, using memory store.");
    }
  }
  if (!memoryChallenges[userId] || memoryChallenges[userId].length === 0) {
    memoryChallenges[userId] = sampleData.challenges.map(c => ({ ...c, progress: 0, completed: false, userId }));
  }
  const idx = memoryChallenges[userId].findIndex(c => c.id === challengeId);
  if (idx !== -1) {
    memoryChallenges[userId][idx] = { ...memoryChallenges[userId][idx], ...updates };
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

async function recalculateProfileMetrics(userId) {
  const profile = await getProfile(userId);
  const activities = await getActivities(userId);
  const challenges = await getChallenges(userId);

  // 1. Calculate monthlyFootprint
  const totalCarbon = activities.reduce((sum, act) => sum + Number(act.carbon || 0), 0);
  profile.monthlyFootprint = Number(totalCarbon.toFixed(1));

  // 2. Calculate savingsCO2 and savingsCost
  // Max savings from twin scenarios
  const twinScenarios = profile.twinScenarios || [];
  const maxTwinCO2 = twinScenarios.reduce((max, sc) => Math.max(max, Number(sc.calculations?.carbonSaved || 0)), 0);
  const maxTwinCost = twinScenarios.reduce((max, sc) => Math.max(max, Number(sc.calculations?.costSaved || 0)), 0);

  // Sum savings from accepted recommendations
  const acceptedIds = profile.acceptedRecommendations || [];
  let recCO2 = 0;
  let recCost = 0;
  let recPoints = 0;
  
  const recommendationsList = sampleData.recommendations || [];
  acceptedIds.forEach(id => {
    const rec = recommendationsList.find(r => r.id === id);
    if (rec) {
      recCO2 += Number(rec.co2Reduction || 0);
      recCost += Number(rec.costSavings || 0);
      recPoints += Number(rec.points || 0);
    } else {
      recCO2 += 10;
      recCost += 15;
      recPoints += 50;
    }
  });

  profile.savingsCO2 = Number((maxTwinCO2 + recCO2).toFixed(1));
  profile.savingsCost = Number((maxTwinCost + recCost).toFixed(1));

  // 3. Predicted footprints
  profile.predictedFootprintBAU = Number((profile.monthlyFootprint * 1.1).toFixed(1));
  profile.predictedFootprintEco = Number(Math.max(0, profile.predictedFootprintBAU - profile.savingsCO2).toFixed(1));

  // 4. Calculate ecoPoints
  // Points from activities: Custom = 15, Vision = 20, OCR = 25
  let activityPoints = 0;
  activities.forEach(act => {
    const desc = (act.description || "").toLowerCase();
    if (desc.startsWith("vision") || desc.includes("vision scan")) {
      activityPoints += 20;
    } else if (desc.includes("scan") || desc.includes("receipt") || desc.includes("bill")) {
      activityPoints += 25;
    } else {
      activityPoints += 15;
    }
  });

  // Points from challenges
  let challengePoints = 0;
  challenges.forEach(chal => {
    if (chal.completed) {
      challengePoints += Number(chal.points || 0);
    } else {
      challengePoints += Number(chal.progress || 0) * 5;
    }
  });

  // Points from twin scenarios
  const twinPoints = twinScenarios.length * 10;

  profile.ecoPoints = activityPoints + challengePoints + twinPoints + recPoints;

  // 5. Level calculation
  const ptsPerLevel = 200;
  profile.level = Math.floor(profile.ecoPoints / ptsPerLevel) + 1;
  profile.levelProgress = Math.round(((profile.ecoPoints % ptsPerLevel) / ptsPerLevel) * 100);

  // 6. Sustainability Score calculation
  profile.sustainabilityScore = Math.min(98, Math.round(70 + (profile.ecoPoints / 50)));

  // 7. Badges calculation
  const badgesSet = new Set();
  if (activities.some(act => act.category === "Electricity")) {
    badgesSet.add("Energy Saver");
  }
  if (activities.some(act => act.category === "Food")) {
    badgesSet.add("Plant Eater");
  }
  for (let L = 2; L <= profile.level; L++) {
    badgesSet.add(`Level ${L} Hero`);
  }
  challenges.forEach(chal => {
    if (chal.completed) {
      if (chal.id === "ch-1") badgesSet.add("Veggie Chef");
      if (chal.id === "ch-2") badgesSet.add("Transit Hero");
      if (chal.id === "ch-3") badgesSet.add("Vampire Slayer");
    }
  });
  profile.badges = Array.from(badgesSet);

  await saveProfile(userId, profile);
  return profile;
}

const JWT_SECRET = process.env.JWT_SECRET || "ecosyn-secret-key-12345";

function generateToken(user) {
  const payload = JSON.stringify({ userId: user._id, email: user.email, timestamp: Date.now() });
  const signature = crypto.createHmac("sha256", JWT_SECRET).update(payload).digest("hex");
  return Buffer.from(payload).toString("base64") + "." + signature;
}

function verifyToken(token) {
  if (!token) return null;
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;
    const payload = Buffer.from(parts[0], "base64").toString("utf-8");
    const signature = parts[1];
    const expectedSignature = crypto.createHmac("sha256", JWT_SECRET).update(payload).digest("hex");
    if (signature !== expectedSignature) return null;
    return JSON.parse(payload);
  } catch (e) {
    return null;
  }
}

async function logAction(userId, action, details) {
  try {
    if (isMongoConnected) {
      await Log.create({ userId, action, details });
    }
    console.log(`[AUDIT LOG] User: ${userId || "Guest"} | Action: ${action} | Details:`, details);
  } catch (err) {
    console.error("Failed to write log to Mongo:", err);
  }
}

async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Access denied. No session token provided." });
  }

  const token = authHeader.split(" ")[1];
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: "Invalid or expired session token." });
  }

  req.userId = decoded.userId;
  req.userEmail = decoded.email;
  next();
}

// REST API Endpoints

// Auth: Signup
app.post("/api/auth/signup", async (req, res) => {
  const { email, password, studentName } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  try {
    if (isMongoConnected) {
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        return res.status(400).json({ error: "A user with this email already exists." });
      }

      const hashedPassword = crypto.createHash("sha256").update(password).digest("hex");
      const user = await User.create({ email: email.toLowerCase(), password: hashedPassword });
      
      // Initialize profile
      const name = studentName || email.split("@")[0];
      const profile = await getProfile(user._id, name);

      await logAction(user._id, "SIGNUP", { email: user.email });
      const token = generateToken(user);
      return res.status(201).json({ status: "success", token, user: { email: user.email, id: user._id }, profile });
    } else {
      // Memory Store Fallback
      const mockId = `mock-user-${email.toLowerCase().replace(/[^a-z0-9]/g, "")}`;
      const name = studentName || email.split("@")[0];
      const profile = await getProfile(mockId, name);
      
      await logAction(mockId, "SIGNUP", { email });
      const mockUser = { _id: mockId, email };
      const token = generateToken(mockUser);
      return res.status(201).json({ status: "success", token, user: { email, id: mockId }, profile });
    }
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ error: "An error occurred during signup." });
  }
});

// Auth: Login
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  try {
    if (isMongoConnected) {
      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        return res.status(400).json({ error: "Invalid email or password." });
      }

      const hashedPassword = crypto.createHash("sha256").update(password).digest("hex");
      if (user.password !== hashedPassword) {
        return res.status(400).json({ error: "Invalid email or password." });
      }

      const profile = await getProfile(user._id);
      await logAction(user._id, "LOGIN", { email: user.email });
      const token = generateToken(user);
      return res.json({ status: "success", token, user: { email: user.email, id: user._id }, profile });
    } else {
      // Memory Store Fallback
      const mockId = `mock-user-${email.toLowerCase().replace(/[^a-z0-9]/g, "")}`;
      const profile = await getProfile(mockId, email.split("@")[0]);
      await logAction(mockId, "LOGIN", { email });
      const mockUser = { _id: mockId, email };
      const token = generateToken(mockUser);
      return res.json({ status: "success", token, user: { email, id: mockId }, profile });
    }
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "An error occurred during login." });
  }
});

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
app.get("/api/profile", authMiddleware, async (req, res) => {
  const profile = await recalculateProfileMetrics(req.userId);
  res.json(profile);
});

// 2b. Complete Survey Onboarding
app.post("/api/profile/onboard", authMiddleware, async (req, res) => {
  const { travel, diet, electricity, shopping } = req.body;
  const userId = req.userId;

  // Input Validation for Hackathon Security
  const validTravel = ["car", "bike", "public", "cycle"];
  const validDiet = ["vegetarian", "mixed", "heavy_meat"];

  if (!validTravel.includes(travel)) {
    return res.status(400).json({ error: "Invalid travel option. Must be car, bike, public, or cycle." });
  }
  if (!validDiet.includes(diet)) {
    return res.status(400).json({ error: "Invalid diet option. Must be vegetarian, mixed, or heavy_meat." });
  }
  const elecNum = Number(electricity);
  if (isNaN(elecNum) || elecNum < 100 || elecNum > 1000) {
    return res.status(400).json({ error: "Invalid electricity units. Must be a number between 100 and 1000." });
  }
  const shopNum = Number(shopping);
  if (isNaN(shopNum) || shopNum < 0 || shopNum > 10) {
    return res.status(400).json({ error: "Invalid shopping frequency. Must be a number between 0 and 10." });
  }

  // Clear existing activities first to ensure onboarding sets a clean baseline
  if (isMongoConnected) {
    try {
      await Activity.deleteMany({ userId });
    } catch (e) {
      console.warn("Error clearing activities for onboarding", e);
    }
  }
  memoryActivities[userId] = [];

  // 1. Travel Activity
  let travelCarbon = 0;
  let travelDesc = "";
  let travelAmt = "";
  let travelCost = 0;
  let carKm = 0;
  if (travel === "car") {
    travelCarbon = 112; // 25 km commute * 4.3 weeks * 0.26 kg/km + extra
    travelDesc = "Daily Car Commute";
    travelAmt = "100 km / week";
    travelCost = 35;
    carKm = 100;
  } else if (travel === "bike") {
    travelCarbon = 34;
    travelDesc = "Motorcycle Travel";
    travelAmt = "30 km / week";
    travelCost = 12;
    carKm = 30;
  } else if (travel === "public") {
    travelCarbon = 15;
    travelDesc = "Public Transit Commuting";
    travelAmt = "15 km / week";
    travelCost = 20;
    carKm = 15;
  } else {
    travelCarbon = 0;
    travelDesc = "Walking & Cycling";
    travelAmt = "0 km / week";
    travelCost = 0;
    carKm = 0;
  }

  // 2. Diet Activity
  let dietCarbon = 0;
  let dietDesc = "";
  let dietAmt = "";
  let dietCost = 0;
  let meatMeals = 0;
  if (diet === "heavy_meat") {
    dietCarbon = 260; // 10 meals * 6.2 kg * 4.3
    dietDesc = "Heavy Meat Diet Meals";
    dietAmt = "10 beef meals / week";
    dietCost = 150;
    meatMeals = 10;
  } else if (diet === "mixed") {
    dietCarbon = 107;
    dietDesc = "Mixed Diet Meals";
    dietAmt = "4 mixed meals / week";
    dietCost = 90;
    meatMeals = 4;
  } else {
    dietCarbon = 0;
    dietDesc = "Vegetarian Diet Meals";
    dietAmt = "0 meat meals / week";
    dietCost = 50;
    meatMeals = 0;
  }

  // 3. Electricity Activity
  const elecUnits = Number(electricity) || 300;
  const elecCarbon = Math.round(elecUnits * 0.45);
  const elecCost = Math.round(elecUnits * 0.24);

  // 4. Shopping Activity
  const shopItems = Number(shopping) || 2;
  const shopCarbon = Math.round(shopItems * 7.2);
  const shopCost = Math.round(shopItems * 35);

  const initialActivities = [
    { category: "Transport", description: travelDesc, amount: travelAmt, carbon: travelCarbon, cost: travelCost },
    { category: "Food", description: dietDesc, amount: dietAmt, carbon: dietCarbon, cost: dietCost },
    { category: "Electricity", description: "Monthly Household Utility Power", amount: `${elecUnits} Units`, carbon: elecCarbon, cost: elecCost },
    { category: "Shopping", description: "Monthly Shopping Purchases", amount: `${shopItems} items`, carbon: shopCarbon, cost: shopCost }
  ];

  for (const act of initialActivities) {
    const activityData = {
      ...act,
      date: new Date().toISOString().split("T")[0]
    };
    await addActivity(userId, activityData);
  }

  const profile = await getProfile(userId);
  profile.isOnboarded = true;
  profile.twinScenarios = [{
    id: `scenario-initial-${Date.now()}`,
    name: "My Starting Habits",
    variables: {
      carKm,
      meatMeals,
      thermostat: 0,
      shoppingItems: shopItems
    },
    calculations: {
      carFootprint: travelCarbon,
      foodFootprint: dietCarbon,
      electricityFootprint: elecCarbon,
      shoppingFootprint: shopCarbon,
      totalProjected: travelCarbon + dietCarbon + elecCarbon + shopCarbon,
      carbonSaved: 0,
      costSaved: 0
    },
    createdAt: new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
  }];

  await saveProfile(userId, profile);
  const updatedProfile = await recalculateProfileMetrics(userId);

  await logAction(userId, "ONBOARD", { travel, diet, electricity: elecUnits, shopping: shopItems });
  emitRealtimeEvent("profile.onboarded", { message: "Welcome onboard! Your carbon clone is synced.", userId });

  res.json({ status: "success", profile: updatedProfile });
});

// 2c. Update Profile Info (Edit Profile)
app.put("/api/profile", authMiddleware, async (req, res) => {
  const { studentName, avatar } = req.body;
  const userId = req.userId;

  if (!studentName || !studentName.trim()) {
    return res.status(400).json({ error: "Student name is required." });
  }

  try {
    const profile = await getProfile(userId);
    profile.studentName = studentName.trim();
    if (avatar) {
      profile.avatar = avatar;
    }

    await saveProfile(userId, profile);
    const updatedProfile = await recalculateProfileMetrics(userId);

    await logAction(userId, "EDIT_PROFILE", { studentName: profile.studentName, avatar: profile.avatar });
    emitRealtimeEvent("profile.updated", { message: "Your profile info has been updated.", userId });

    res.json({ status: "success", profile: updatedProfile });
  } catch (error) {
    console.error("Failed to update profile:", error);
    res.status(500).json({ error: "Failed to update profile information." });
  }
});



// 4. Fetch Activities
app.get("/api/activities", authMiddleware, async (req, res) => {
  const list = await getActivities(req.userId);
  res.json(list);
});

// 4b. Emission factors used by UI calculators and manual estimates
app.get("/api/emission-factors", (req, res) => {
  res.json(EMISSION_FACTORS);
});

// 5. Log Custom Activity Manually
app.post("/api/activities/log", authMiddleware, async (req, res) => {
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

  const userId = req.userId;
  await addActivity(userId, activity);

  const profile = await recalculateProfileMetrics(userId);
  await logAction(userId, "LOG_ACTIVITY", activity);

  emitRealtimeEvent("activity.logged", {
    message: `${activity.description} logged. +15 EcoPoints.`,
    activity,
    profile,
    userId
  });
  res.json({ status: "logged", activity, profile });
});

// 6. Get Recommendations
app.get("/api/recommendations", authMiddleware, async (req, res) => {
  const list = await getRecommendations(req.userId);
  res.json(list);
});

// 6b. Suggested challenge focus based on the user's largest recent footprint category
app.get("/api/challenges/suggested", authMiddleware, async (req, res) => {
  const userId = req.userId;
  const activities = await getActivities(userId);
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
app.post("/api/profile/accept-recommendation", authMiddleware, async (req, res) => {
  const { recommendationId } = req.body;
  if (!recommendationId) {
    return res.status(400).json({ error: "recommendationId is required." });
  }

  const userId = req.userId;
  const profile = await getProfile(userId);
  if (profile.acceptedRecommendations.includes(recommendationId)) {
    return res.json({ status: "already_accepted", profile });
  }

  profile.acceptedRecommendations.push(recommendationId);
  await saveProfile(userId, profile);

  const recommendations = await getRecommendations(userId);
  const rec = recommendations.find(r => r.id === recommendationId);
  const pts = rec ? rec.points : 50;

  await logAction(userId, "ACCEPT_RECOMMENDATION", { recommendationId, title: rec?.title });
  const updatedProfile = await recalculateProfileMetrics(userId);

  emitRealtimeEvent("recommendation.accepted", {
    message: `${rec?.title || "Recommendation"} accepted. +${pts} EcoPoints.`,
    recommendation: rec,
    profile: updatedProfile,
    userId
  });
  res.json({ status: "accepted", profile: updatedProfile, recommendation: rec });
});

// 7b. Carbon Twin saved scenarios
app.get("/api/twin/scenarios", authMiddleware, async (req, res) => {
  const scenarios = await getTwinScenarios(req.userId);
  res.json(scenarios);
});

app.post("/api/twin/scenarios", authMiddleware, async (req, res) => {
  const { name, variables, calculations } = req.body;
  if (!variables || !calculations) {
    return res.status(400).json({ error: "variables and calculations are required." });
  }

  const userId = req.userId;
  const saved = await saveTwinScenario(userId, { name, variables, calculations });
  await logAction(userId, "SAVE_TWIN_SCENARIO", { name });

  emitRealtimeEvent("twin.synced", {
    message: `${saved.scenario.name} saved to your Carbon Twin. +10 EcoPoints.`,
    scenario: saved.scenario,
    profile: saved.profile,
    userId
  });
  res.json({ status: "saved", ...saved });
});

// 8. Fetch Eco Challenges
app.get("/api/challenges", authMiddleware, async (req, res) => {
  const list = await getChallenges(req.userId);
  res.json(list);
});

// 9. Complete Challenge / Update Challenge Progress
app.post("/api/challenges/complete", authMiddleware, async (req, res) => {
  const { challengeId } = req.body;
  if (!challengeId) {
    return res.status(400).json({ error: "challengeId is required." });
  }

  const userId = req.userId;
  const challenges = await getChallenges(userId);
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

  await updateChallenge(userId, challengeId, { progress: chal.progress, completed: chal.completed });

  const profile = await getProfile(userId);
  if (completedNow) {
    profile.completedChallenges.push(challengeId);
    await saveProfile(userId, profile);
  }

  const updatedProfile = await recalculateProfileMetrics(userId);
  await logAction(userId, completedNow ? "COMPLETE_CHALLENGE" : "PROGRESS_CHALLENGE", { challengeId, title: chal.title });

  emitRealtimeEvent("challenge.progressed", {
    message: completedNow ? `${chal.title} completed!` : `${chal.title} progress checked in. +5 EcoPoints.`,
    challenge: chal,
    profile: updatedProfile,
    completedNow,
    userId
  });
  res.json({ status: "progressed", challenge: chal, profile: updatedProfile, completedNow });
});

// 10. Fetch Leaderboard
app.get("/api/leaderboard", authMiddleware, async (req, res) => {
  const userId = req.userId;
  const profile = await getProfile(userId);

  // Dynamically update user stats on leaderboard
  const updatedLeaderboard = memoryLeaderboard.map(user => {
    if (user.isCurrentUser) {
      return {
        ...user,
        name: `${profile.studentName} (You)`,
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
app.post("/api/scan", authMiddleware, upload.single("file"), async (req, res) => {
  const filename = req.file ? req.file.originalname : "electricity_bill.pdf";
  let extractedText = "Mock receipt content";
  const userId = req.userId;

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
    await addActivity(userId, activity);

    // Inject recommendation dynamically into the local recommendations store
    const recommendations = await getRecommendations(userId);
    const isRecExisted = recommendations.some(r => r.title === simulatedResult.recommendation.title);
    if (!isRecExisted) {
      recommendations.unshift({
        id: `rec-ocr-${Date.now()}`,
        ...simulatedResult.recommendation,
        category: simulatedResult.category
      });
    }

    const profile = await recalculateProfileMetrics(userId);
    await logAction(userId, "OCR_SCAN", { filename, simulated: true, totalCarbon: activity.carbon });

    emitRealtimeEvent("scan.completed", {
      message: `${simulatedResult.title} scanned and logged. +25 EcoPoints.`,
      result: simulatedResult,
      profile,
      userId
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
    await addActivity(userId, activity);

    if (result.recommendation) {
      const recommendations = await getRecommendations(userId);
      recommendations.unshift({
        id: `rec-ocr-${Date.now()}`,
        ...result.recommendation,
        category: result.category || "Lifestyle"
      });
    }

    const profile = await recalculateProfileMetrics(userId);
    await logAction(userId, "OCR_SCAN", { filename, simulated: false, totalCarbon: activity.carbon });

    emitRealtimeEvent("scan.completed", {
      message: `${result.title || "Receipt"} scanned and logged. +25 EcoPoints.`,
      result,
      profile,
      userId
    });
    res.json(result);

  } catch (error) {
    console.error("AI OCR scanner failed:", error.message);
    res.status(500).json({ error: "AI OCR scanning service error. Try uploading a different file." });
  }
});

// 12. AI Vision-Based Carbon Assessment (Image Classify & Recommendation)
app.post("/api/vision", authMiddleware, upload.single("file"), async (req, res) => {
  const filename = req.file ? req.file.originalname : "appliance.jpg";
  const { description = "Household object photo" } = req.body;
  const userId = req.userId;

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
    await addActivity(userId, activity);

    // Inject first alternative as a recommendation
    const alt = simulatedResult.alternatives[0];
    const recommendations = await getRecommendations(userId);
    const isRecExisted = recommendations.some(r => r.title === alt.name);
    if (!isRecExisted) {
      recommendations.unshift({
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

    const profile = await recalculateProfileMetrics(userId);
    await logAction(userId, "VISION_ASSESSMENT", { filename, simulated: true, objectName: simulatedResult.objectName });

    emitRealtimeEvent("vision.completed", {
      message: `${simulatedResult.objectName} assessed and logged. +20 EcoPoints.`,
      result: simulatedResult,
      profile,
      userId
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
    await addActivity(userId, activity);

    // Inject alternatives
    if (result.alternatives && result.alternatives.length > 0) {
      const recommendations = await getRecommendations(userId);
      result.alternatives.forEach((alt, i) => {
        recommendations.unshift({
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

    const profile = await recalculateProfileMetrics(userId);
    await logAction(userId, "VISION_ASSESSMENT", { filename, simulated: false, objectName: result.objectName });

    emitRealtimeEvent("vision.completed", {
      message: `${result.objectName || "Object"} assessed and logged. +20 EcoPoints.`,
      result,
      profile,
      userId
    });
    res.json(result);

  } catch (error) {
    console.error("AI Vision scanner failed:", error.message);
    res.status(500).json({ error: "AI Vision scanning service error. Try a different image name." });
  }
});

// 13. AI Personalized Coach Chat
app.post("/api/coach/chat", authMiddleware, async (req, res) => {
  const { message, history = [] } = req.body;
  if (!message) {
    return res.status(400).json({ error: "Message is required" });
  }

  const userId = req.userId;
  const profile = await getProfile(userId);
  const activities = await getActivities(userId);
  const activitySummary = summarizeActivities(activities);

  await logAction(userId, "COACH_CHAT", { messageLength: message.length });

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
