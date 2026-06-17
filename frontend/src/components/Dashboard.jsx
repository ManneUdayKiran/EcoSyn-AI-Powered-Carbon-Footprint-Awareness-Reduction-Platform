import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Grid,
  Paper,
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Avatar,
  Chip,
  Divider,
  LinearProgress,
  CircularProgress,
} from "@mui/material";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import ParkRoundedIcon from "@mui/icons-material/ParkRounded";
import ElectricBoltRoundedIcon from "@mui/icons-material/ElectricBoltRounded";
import DirectionsCarRoundedIcon from "@mui/icons-material/DirectionsCarRounded";
import RestaurantRoundedIcon from "@mui/icons-material/RestaurantRounded";
import ShoppingBagRoundedIcon from "@mui/icons-material/ShoppingBagRounded";
import Co2RoundedIcon from "@mui/icons-material/Co2Rounded";
import AttachMoneyRoundedIcon from "@mui/icons-material/AttachMoneyRounded";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { api } from "../api/client";

const COLORS = {
  Electricity: "#10b981", // Emerald
  Transport: "#06b6d4", // Cyan
  Food: "#f59e0b", // Amber
  Shopping: "#ec4899", // Pink
  Lifestyle: "#6366f1", // Indigo
};

export default function Dashboard() {
  const [profile, setProfile] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const profRes = await api.get("/api/profile");
      const actRes = await api.get("/api/activities");
      setProfile(profRes.data);
      setActivities(actRes.data);
    } catch (e) {
      console.error("Error fetching dashboard data", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, []);

  // Compute category breakdown from activity logs
  const pieData = useMemo(() => {
    if (!activities.length) return [];
    const totals = {};
    activities.forEach((act) => {
      totals[act.category] = (totals[act.category] || 0) + act.carbon;
    });
    return Object.keys(totals).map((cat) => ({
      name: cat,
      value: Number(totals[cat].toFixed(1)),
      color: COLORS[cat] || "#94a3b8",
    }));
  }, [activities]);

  // Forecast trend data
  const trendData = [
    { name: "Jan", Footprint: 172.0, ForecastBAU: 172.0, ForecastEco: 172.0 },
    { name: "Feb", Footprint: 168.2, ForecastBAU: 168.2, ForecastEco: 168.2 },
    { name: "Mar", Footprint: 164.5, ForecastBAU: 164.5, ForecastEco: 164.5 },
    { name: "Apr", Footprint: 159.0, ForecastBAU: 159.0, ForecastEco: 159.0 },
    { name: "May", Footprint: 152.4, ForecastBAU: 152.4, ForecastEco: 152.4 },
    {
      name: "Jun (Forecast)",
      Footprint: null,
      ForecastBAU: profile ? profile.predictedFootprintBAU : 168.0,
      ForecastEco: profile ? profile.predictedFootprintEco : 112.5,
    },
  ];

  if (loading && !profile) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
        <CircularProgress color="primary" />
      </Box>
    );
  }

  // Fallback if data is blank
  const safeProfile = profile || {
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
    badges: ["Energy Saver", "Plant Eater"],
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case "Electricity":
        return <ElectricBoltRoundedIcon sx={{ color: COLORS.Electricity }} />;
      case "Transport":
        return <DirectionsCarRoundedIcon sx={{ color: COLORS.Transport }} />;
      case "Food":
        return <RestaurantRoundedIcon sx={{ color: COLORS.Food }} />;
      case "Shopping":
        return <ShoppingBagRoundedIcon sx={{ color: COLORS.Shopping }} />;
      default:
        return <Co2RoundedIcon sx={{ color: COLORS.Lifestyle }} />;
    }
  };

  return (
    <Box>
      {/* Onboarding Welcome Banner */}
      <Paper
        sx={{
          p: 3.5,
          mb: 4,
          borderRadius: 2,
          background: "linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(6, 182, 212, 0.08) 100%)",
          border: "1px solid rgba(16, 185, 129, 0.18)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
          backdropFilter: "blur(12px)",
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          alignItems: "center",
          justifyContent: "space-between",
          gap: 3,
        }}
      >
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, mb: 1, color: "#f8fafc" }}>
            Welcome back, {safeProfile.studentName}! 🌿
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 650 }}>
            Your ecological clone is synchronized. This month you have offset{" "}
            <strong>{safeProfile.savingsCO2} kg of CO₂</strong> and saved{" "}
            <strong>${safeProfile.savingsCost}</strong>. Keep checking in to hit your target level!
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="primary"
          component={Link}
          to="/coach"
          endIcon={<ArrowForwardRoundedIcon />}
          sx={{
            px: 3,
            py: 1.5,
            boxShadow: "0 4px 14px rgba(16, 185, 129, 0.3)",
            whiteSpace: "nowrap",
          }}
        >
          Consult EcoCoach
        </Button>
      </Paper>

      {/* Grid of Metric Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Footprint Card */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: "100%", background: "rgba(9, 18, 29, 0.65)", backdropFilter: "blur(10px)" }}>
            <CardContent>
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
                <Typography color="text.secondary" variant="body2" sx={{ fontWeight: 600 }}>
                  Monthly Footprint
                </Typography>
                <Avatar sx={{ bgcolor: "rgba(239, 68, 68, 0.1)", color: "#ef4444" }}>
                  <Co2RoundedIcon />
                </Avatar>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 800, color: "#f8fafc", mb: 1 }}>
                {safeProfile.monthlyFootprint} <Typography component="span" variant="body2">kg CO₂</Typography>
              </Typography>
              <Typography variant="caption" color="text.secondary">
                National average: ~400 kg / mo
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Sustainability Score Card */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: "100%", background: "rgba(9, 18, 29, 0.65)", backdropFilter: "blur(10px)" }}>
            <CardContent sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
                <Typography color="text.secondary" variant="body2" sx={{ fontWeight: 600 }}>
                  Sustainability Score
                </Typography>
                <Avatar
                  sx={{
                    bgcolor: "rgba(16, 185, 129, 0.1)",
                    color: "#10b981",
                  }}
                >
                  <ParkRoundedIcon />
                </Avatar>
              </Box>
              <Box sx={{ display: "flex", alignItems: "baseline", mb: 1 }}>
                <Typography variant="h4" sx={{ fontWeight: 800, color: "#10b981" }}>
                  {safeProfile.sustainabilityScore}
                </Typography>
                <Typography variant="h6" color="text.secondary" sx={{ ml: 0.5 }}>
                  /100
                </Typography>
              </Box>
              <Typography variant="caption" color="text.secondary">
                Grade: {safeProfile.sustainabilityScore >= 80 ? "A - Eco Champion" : safeProfile.sustainabilityScore >= 65 ? "B - Eco Citizen" : "C - Consumer"}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* CO2 Savings Card */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: "100%", background: "rgba(9, 18, 29, 0.65)", backdropFilter: "blur(10px)" }}>
            <CardContent>
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
                <Typography color="text.secondary" variant="body2" sx={{ fontWeight: 600 }}>
                  Carbon Savings
                </Typography>
                <Avatar sx={{ bgcolor: "rgba(6, 182, 212, 0.1)", color: "#06b6d4" }}>
                  <ParkRoundedIcon />
                </Avatar>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 800, color: "#06b6d4", mb: 1 }}>
                -{safeProfile.savingsCO2} <Typography component="span" variant="body2">kg CO₂</Typography>
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Equivalent to ~{Math.round(safeProfile.savingsCO2 / 1.5)} tree seedlings planted
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Financial Savings Card */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: "100%", background: "rgba(9, 18, 29, 0.65)", backdropFilter: "blur(10px)" }}>
            <CardContent>
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
                <Typography color="text.secondary" variant="body2" sx={{ fontWeight: 600 }}>
                  Cost Savings
                </Typography>
                <Avatar sx={{ bgcolor: "rgba(245, 158, 11, 0.1)", color: "#f59e0b" }}>
                  <AttachMoneyRoundedIcon />
                </Avatar>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 800, color: "#f59e0b", mb: 1 }}>
                ${safeProfile.savingsCost}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Cumulative household utility savings
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main Charts Row */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Trend Area Chart (Carbon Twin Prediction Engine) */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, borderRadius: 2, background: "rgba(9, 18, 29, 0.65)", backdropFilter: "blur(10px)", height: "100%" }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2.5 }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Carbon Footprint Forecast (Carbon Twin)
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Visualizing emission targets comparing Business As Usual (BAU) vs Recommended adjustments
                </Typography>
              </Box>
              <Chip label="AI Prediction Model" size="small" color="primary" variant="outlined" sx={{ fontWeight: 600 }} />
            </Box>
            <Box sx={{ height: 380, width: "100%" }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorFootprint" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorEco" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" stroke="#64748b" style={{ fontSize: "0.75rem" }} />
                  <YAxis stroke="#64748b" style={{ fontSize: "0.75rem" }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#09121d", borderColor: "rgba(255,255,255,0.08)", borderRadius: 8, color: "#f8fafc" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="Footprint"
                    stroke="#ef4444"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorFootprint)"
                    name="Actual Footprint"
                  />
                  <Area
                    type="monotone"
                    dataKey="ForecastBAU"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    fill="none"
                    name="Business As Usual (BAU)"
                  />
                  <Area
                    type="monotone"
                    dataKey="ForecastEco"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    strokeDasharray="4 4"
                    fillOpacity={1}
                    fill="url(#colorEco)"
                    name="EcoSyn Targeted Reduction"
                  />
                  <Legend wrapperStyle={{ fontSize: "0.8rem", paddingTop: 15 }} />
                </AreaChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>

        {/* Category breakdown (Pie Chart) */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, borderRadius: 2, background: "rgba(9, 18, 29, 0.65)", backdropFilter: "blur(10px)", height: "100%", display: "flex", flexDirection: "column" }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
              Category Breakdown
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 2.5 }}>
              Current Month Emissions (kg CO₂)
            </Typography>

            {pieData.length > 0 ? (
              <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <Box sx={{ height: 260, width: "100%", position: "relative" }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: "#09121d", borderColor: "rgba(255,255,255,0.08)", borderRadius: 8, color: "#f8fafc" }}
                        formatter={(value) => [`${value} kg CO₂`, "Footprint"]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Absolute Center Indicator */}
                  <Box
                    sx={{
                      position: "absolute",
                      top: "50%",
                      left: "50%",
                      transform: "translate(-50%, -50%)",
                      textAlign: "center",
                    }}
                  >
                    <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1 }}>
                      {safeProfile.monthlyFootprint}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      kg CO₂ Total
                    </Typography>
                  </Box>
                </Box>
                {/* Labels list */}
                <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, mt: 2 }}>
                  {pieData.map((entry) => (
                    <Box key={entry.name} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Box sx={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: entry.color }} />
                      <Typography variant="caption" sx={{ fontWeight: 600 }}>
                        {entry.name}: {entry.value} kg
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            ) : (
              <Box sx={{ flexGrow: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Typography color="text.secondary" variant="body2">
                  No logged activities for this period.
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Activities Summary Table & Leaderboard Preview */}
      <Grid container spacing={3}>
        {/* Recent Activities Panel */}
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 3, borderRadius: 2, background: "rgba(9, 18, 29, 0.65)", backdropFilter: "blur(10px)", height: "100%", display: "flex", flexDirection: "column" }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2.5 }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Recent Activities
              </Typography>
              <Button
                component={Link}
                to="/activities"
                size="small"
                endIcon={<ArrowForwardRoundedIcon />}
                sx={{ color: "primary.main", fontWeight: 700 }}
              >
                View Logs
              </Button>
            </Box>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, flexGrow: 1, justifyContent: "space-between" }}>
              {activities.slice(0, 4).map((act, index) => (
                <Box
                  key={act.id || index}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    p: 1.75,
                    borderRadius: 1,
                    backgroundColor: "rgba(255,255,255,0.015)",
                    border: "1px solid rgba(255,255,255,0.03)",
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Avatar sx={{ bgcolor: "rgba(255,255,255,0.03)", color: "text.secondary", width: 40, height: 40 }}>
                      {getCategoryIcon(act.category)}
                    </Avatar>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: "#f8fafc" }}>
                        {act.description}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Category: {act.category} • {act.amount}
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ textAlign: "right" }}>
                    <Typography variant="body2" sx={{ fontWeight: 800, color: "#ef4444" }}>
                      +{act.carbon} kg CO₂
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {act.date}
                    </Typography>
                  </Box>
                </Box>
              ))}
              {activities.length === 0 && (
                <Typography color="text.secondary" variant="body2" align="center" sx={{ py: 4 }}>
                  Log activities or scan receipts to populate database.
                </Typography>
              )}
            </Box>
          </Paper>
        </Grid>

        {/* Badges and gamification overview */}
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 3, borderRadius: 2, background: "rgba(9, 18, 29, 0.65)", backdropFilter: "blur(10px)", height: "100%" }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
              Unlocked Achievements
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 3, display: "block" }}>
              Badges earned through active ecological initiatives
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
              {safeProfile.badges.map((badge) => (
                <Box
                  key={badge}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    p: 2,
                    borderRadius: 1,
                    backgroundColor: "rgba(16, 185, 129, 0.04)",
                    border: "1px solid rgba(16, 185, 129, 0.12)",
                    flexGrow: 1,
                    maxWidth: { xs: "100%", sm: "calc(50% - 8px)" },
                  }}
                >
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      backgroundColor: "rgba(16, 185, 129, 0.15)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#10b981",
                    }}
                  >
                    🏆
                  </Box>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 800, color: "#f8fafc" }}>
                      {badge}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Unlocked
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
            <Divider sx={{ my: 3, borderColor: "rgba(255,255,255,0.06)" }} />
            <Box sx={{ p: 2, borderRadius: 1, background: "rgba(6, 182, 212, 0.05)", border: "1px solid rgba(6, 182, 212, 0.15)" }}>
              <Typography variant="body2" sx={{ fontWeight: 700, color: "#06b6d4", mb: 0.5 }}>
                Level 3 Unlock Challenge:
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.5 }}>
                Accumulate 600 total EcoPoints and claim the Transit Hero badge.
              </Typography>
              <Button
                variant="text"
                color="secondary"
                size="small"
                component={Link}
                to="/challenges"
                endIcon={<ArrowForwardRoundedIcon />}
                sx={{ p: 0, fontWeight: 700, textTransform: "none", color: "#06b6d4" }}
              >
                Go to Challenges
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

import { useMemo } from "react";
