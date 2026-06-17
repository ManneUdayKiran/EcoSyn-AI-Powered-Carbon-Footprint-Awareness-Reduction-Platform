import { useState, useEffect, useMemo } from "react";
import {
  Box,
  Typography,
  Paper,
  Grid,
  Slider,
  Card,
  CardContent,
  Button,
  Chip,
  Alert,
  TextField,
  Stack,
  Divider,
} from "@mui/material";
import DirectionsCarRoundedIcon from "@mui/icons-material/DirectionsCarRounded";
import RestaurantRoundedIcon from "@mui/icons-material/RestaurantRounded";
import ThermostatRoundedIcon from "@mui/icons-material/ThermostatRounded";
import ShoppingBagRoundedIcon from "@mui/icons-material/ShoppingBagRounded";
import DoubleArrowRoundedIcon from "@mui/icons-material/DoubleArrowRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import { api } from "../api/client";

export default function CarbonTwin() {
  const [profile, setProfile] = useState(null);
  
  // Real-time behavioral slider values
  const [carKm, setCarKm] = useState(40); // km driven per week
  const [meatMeals, setMeatMeals] = useState(4); // meals per week
  const [thermostat, setThermostat] = useState(0); // temperature adjustment relative to standard
  const [shoppingItems, setShoppingItems] = useState(3); // fast-fashion items per month

  const [synced, setSynced] = useState(false);
  const [scenarioName, setScenarioName] = useState("My lower-carbon month");
  const [scenarios, setScenarios] = useState([]);

  useEffect(() => {
    const fetchTwinData = async () => {
      try {
        const [profileRes, scenariosRes] = await Promise.all([
          api.get("/api/profile"),
          api.get("/api/twin/scenarios"),
        ]);
        setProfile(profileRes.data);
        setScenarios(scenariosRes.data);
      } catch (e) {
        console.error("Error loading carbon twin data", e);
      }
    };
    fetchTwinData();
  }, []);

  // Compute live calculations
  // Coefficients:
  // - Car: 0.26 kg CO2 per km * 4.3 weeks
  // - Meat: 6.2 kg CO2 per beef meal * 4.3 weeks
  // - Thermostat: 120 kg CO2 base electricity - (offset * 6.5 kg)
  // - Shopping: 7.2 kg CO2 per item
  const calculations = useMemo(() => {
    const carFootprint = Math.round(carKm * 0.26 * 4.3);
    const foodFootprint = Math.round(meatMeals * 6.2 * 4.3);
    const electricityFootprint = Math.round(Math.max(30, 120 - thermostat * 6.5));
    const shoppingFootprint = Math.round(shoppingItems * 7.2);
    
    const totalProjected = carFootprint + foodFootprint + electricityFootprint + shoppingFootprint;
    const baseLine = profile?.predictedFootprintBAU || 168.0;
    const carbonSaved = Math.max(0, Number((baseLine - totalProjected).toFixed(1)));
    const costSaved = Math.max(0, Math.round(carbonSaved * 0.35 + (thermostat * 4.5))); // approx financial index

    return {
      carFootprint,
      foodFootprint,
      electricityFootprint,
      shoppingFootprint,
      totalProjected,
      carbonSaved,
      costSaved,
    };
  }, [carKm, meatMeals, thermostat, shoppingItems, profile]);

  // Determine twin health color based on carbon emissions
  const twinColor = useMemo(() => {
    const total = calculations.totalProjected;
    if (total <= 120) return "#10b981"; // Emerald Green
    if (total <= 160) return "#f59e0b"; // Warning Amber
    return "#ef4444"; // Danger Red
  }, [calculations.totalProjected]);

  const handleSync = async () => {
    setSynced(true);
    try {
      const res = await api.post("/api/twin/scenarios", {
        name: scenarioName,
        variables: {
          carKm,
          meatMeals,
          thermostat,
          shoppingItems,
        },
        calculations,
      });
      setProfile(res.data.profile);
      const scenariosRes = await api.get("/api/twin/scenarios");
      setScenarios(scenariosRes.data);
    } catch (e) {
      console.error("Error saving twin scenario", e);
    } finally {
      setTimeout(() => setSynced(false), 1200);
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 1, color: "#f8fafc" }}>
          Carbon Twin Simulator
        </Typography>
        <Typography variant="body1" color="text.secondary">
          EcoSyn compiles a virtual representation of your environmental footprint. Slide handles below to forecast the immediate impact of lifestyle shifts on your emissions and expenses.
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Left Input Sliders */}
        <Grid item xs={12} md={7} sx={{ display: "flex", flexDirection: "column" }}>
          <Paper sx={{ p: 4, borderRadius: 2, background: "rgba(9, 18, 29, 0.65)", backdropFilter: "blur(10px)", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>
              Lifestyle Variables
            </Typography>

            {/* Slider 1: Commuting */}
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <DirectionsCarRoundedIcon color="primary" />
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    Weekly Automobile Commute
                  </Typography>
                </Box>
                <Chip label={`${carKm} km`} size="small" color="primary" sx={{ fontWeight: 700 }} />
              </Box>
              <Slider
                value={carKm}
                onChange={(e, val) => setCarKm(val)}
                min={0}
                max={200}
                step={5}
                valueLabelDisplay="auto"
                sx={{ color: "primary.main" }}
              />
              <Typography variant="caption" color="text.secondary">
                Calculated Footprint: <strong>{calculations.carFootprint} kg CO₂ / month</strong>
              </Typography>
            </Box>

            {/* Slider 2: Meat Consumption */}
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <RestaurantRoundedIcon color="warning" />
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    Meat/Beef Meals per Week
                  </Typography>
                </Box>
                <Chip label={`${meatMeals} meals`} size="small" color="warning" sx={{ fontWeight: 700 }} />
              </Box>
              <Slider
                value={meatMeals}
                onChange={(e, val) => setMeatMeals(val)}
                min={0}
                max={14}
                step={1}
                valueLabelDisplay="auto"
                sx={{ color: "#f59e0b" }}
              />
              <Typography variant="caption" color="text.secondary">
                Calculated Footprint: <strong>{calculations.foodFootprint} kg CO₂ / month</strong>
              </Typography>
            </Box>

            {/* Slider 3: Thermostat */}
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <ThermostatRoundedIcon color="secondary" />
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    Thermostat Temp Shift (Eco mode)
                  </Typography>
                </Box>
                <Chip label={thermostat > 0 ? `+${thermostat}°C` : `${thermostat}°C`} size="small" color="secondary" sx={{ fontWeight: 700 }} />
              </Box>
              <Slider
                value={thermostat}
                onChange={(e, val) => setThermostat(val)}
                min={-3}
                max={5}
                step={1}
                valueLabelDisplay="auto"
                sx={{ color: "#06b6d4" }}
              />
              <Typography variant="caption" color="text.secondary">
                Calculated Footprint: <strong>{calculations.electricityFootprint} kg CO₂ / month</strong>
              </Typography>
            </Box>

            {/* Slider 4: Fast Fashion */}
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <ShoppingBagRoundedIcon sx={{ color: "#ec4899" }} />
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    Shopping Purchases / Month
                  </Typography>
                </Box>
                <Chip label={`${shoppingItems} items`} size="small" sx={{ bgcolor: "#ec4899", color: "#fff", fontWeight: 700 }} />
              </Box>
              <Slider
                value={shoppingItems}
                onChange={(e, val) => setShoppingItems(val)}
                min={0}
                max={10}
                step={1}
                valueLabelDisplay="auto"
                sx={{ color: "#ec4899" }}
              />
              <Typography variant="caption" color="text.secondary">
                Calculated Footprint: <strong>{calculations.shoppingFootprint} kg CO₂ / month</strong>
              </Typography>
            </Box>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
              <TextField
                fullWidth
                label="Scenario name"
                value={scenarioName}
                onChange={(e) => setScenarioName(e.target.value)}
                size="small"
              />
              <Button
                variant="contained"
                color="primary"
                onClick={handleSync}
                disabled={synced}
                sx={{ py: 1.5, px: 3, whiteSpace: "nowrap" }}
              >
                {synced ? "Saving..." : "Save Twin Scenario"}
              </Button>
            </Stack>
          </Paper>
        </Grid>

        {/* Right Digital Twin Visualization */}
        <Grid item xs={12} md={5} sx={{ display: "flex", flexDirection: "column" }}>
          <Paper
            sx={{
              p: 4,
              borderRadius: 2,
              background: "rgba(9, 18, 29, 0.65)",
              backdropFilter: "blur(10px)",
              display: "flex",
              flexDirection: "column",
              height: "100%",
              justifyContent: "space-between",
            }}
          >
            <Box sx={{ textAlign: "center", mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Digital Sustainability Clone
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Interactive real-time health indicator of your Carbon Twin
              </Typography>
            </Box>

            {/* Glowing Digital Globe Visual */}
            <Box sx={{ display: "flex", justifyContent: "center", my: 2 }}>
              <Box
                sx={{
                  position: "relative",
                  width: 220,
                  height: 220,
                  borderRadius: "50%",
                  backgroundColor: "rgba(255, 255, 255, 0.02)",
                  border: `3px solid ${twinColor}`,
                  boxShadow: `0 0 20px ${twinColor}, inset 0 0 20px ${twinColor}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  animation: "pulseShadow 3s infinite ease-in-out",
                  transition: "all 0.5s ease-in-out",
                }}
              >
                {/* Simulated inner core glowing planet */}
                <Box
                  sx={{
                    width: 150,
                    height: 150,
                    borderRadius: "50%",
                    background: `radial-gradient(circle, ${twinColor}88 0%, transparent 80%)`,
                    position: "absolute",
                  }}
                />
                <Box sx={{ textAlign: "center", zIndex: 2 }}>
                  <Typography variant="h3" sx={{ fontWeight: 900, mb: 0.5 }}>
                    {calculations.totalProjected}
                  </Typography>
                  <Typography variant="caption" sx={{ fontWeight: 700 }}>
                    kg CO₂ / mo
                  </Typography>
                </Box>
              </Box>
            </Box>

            {/* Calculations Breakdown */}
            <Box sx={{ mb: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Card sx={{ bgcolor: "rgba(255,255,255,0.01)", textAlign: "center", border: "1px solid rgba(255,255,255,0.03)" }}>
                    <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
                      <Typography variant="caption" color="text.secondary">
                        Target Savings:
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 800, color: "#10b981" }}>
                        -{calculations.carbonSaved} kg
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6}>
                  <Card sx={{ bgcolor: "rgba(255,255,255,0.01)", textAlign: "center", border: "1px solid rgba(255,255,255,0.03)" }}>
                    <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
                      <Typography variant="caption" color="text.secondary">
                        Cost Offset:
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 800, color: "#f59e0b" }}>
                        +${calculations.costSaved}/mo
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Box>

            {/* Twin Status Summary Banner */}
            <Box>
              {calculations.totalProjected < 130 ? (
                <Alert icon={<CheckCircleRoundedIcon />} severity="success" sx={{ bgcolor: "rgba(16, 185, 129, 0.05)" }}>
                  Excellent! Your Carbon Twin has achieved <strong>Sub-Industrial target levels</strong>.
                </Alert>
              ) : calculations.totalProjected < 165 ? (
                <Alert severity="warning" sx={{ bgcolor: "rgba(245, 158, 11, 0.05)" }}>
                  Moderate footprint. Slide commuting and diet options to decrease levels by another {calculations.totalProjected - 120} kg.
                </Alert>
              ) : (
                <Alert severity="error" sx={{ bgcolor: "rgba(239, 68, 68, 0.05)" }}>
                  Critical footprint height. Highly recommended to switch to plant meal days or carpooling.
                </Alert>
              )}
            </Box>

            <Divider sx={{ my: 3, borderColor: "rgba(255,255,255,0.06)" }} />

            <Box>
              <Typography variant="body2" sx={{ fontWeight: 800, mb: 1 }}>
                Saved Scenarios
              </Typography>
              <Stack spacing={1.25}>
                {scenarios.slice(0, 3).map((scenario) => (
                  <Card key={scenario.id} sx={{ bgcolor: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.04)" }}>
                    <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
                      <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
                        <Typography variant="caption" sx={{ fontWeight: 800, color: "#f8fafc" }}>
                          {scenario.name}
                        </Typography>
                        <Chip
                          label={`${scenario.calculations?.totalProjected || 0} kg/mo`}
                          size="small"
                          color="primary"
                          sx={{ height: 20, fontSize: "0.65rem", fontWeight: 700 }}
                        />
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        Saves {scenario.calculations?.carbonSaved || 0} kg CO2 and ${scenario.calculations?.costSaved || 0}/mo
                      </Typography>
                    </CardContent>
                  </Card>
                ))}
                {scenarios.length === 0 && (
                  <Typography variant="caption" color="text.secondary">
                    Save a scenario to build your personal carbon playbook.
                  </Typography>
                )}
              </Stack>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* CSS Animation keyframe definition */}
      <style>{`
        @keyframes pulseShadow {
          0% { transform: scale(1); box-shadow: 0 0 16px \${twinColor}, inset 0 0 16px \${twinColor}; }
          50% { transform: scale(1.02); box-shadow: 0 0 28px \${twinColor}, inset 0 0 28px \${twinColor}; }
          100% { transform: scale(1); box-shadow: 0 0 16px \${twinColor}, inset 0 0 16px \${twinColor}; }
        }
      `}</style>
    </Box>
  );
}
