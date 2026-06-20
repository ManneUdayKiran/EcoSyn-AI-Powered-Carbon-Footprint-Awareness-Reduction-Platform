import { useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Slider,
  LinearProgress,
  Alert,
  CircularProgress,
} from "@mui/material";
import { motion, AnimatePresence } from "framer-motion";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import { api, extractErrorMessage } from "../api/client";

export default function Onboarding({ onOnboardComplete }) {
  const [step, setStep] = useState(1);
  const [travel, setTravel] = useState("");
  const [diet, setDiet] = useState("");
  const [electricity, setElectricity] = useState(450); // 100 - 1000
  const [shopping, setShopping] = useState(3); // 0 - 10

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleNext = () => {
    if (step === 1 && !travel) {
      setError("Please select how you travel.");
      return;
    }
    if (step === 2 && !diet) {
      setError("Please select your diet.");
      return;
    }
    setError("");
    if (step < 4) {
      setStep((prev) => prev + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    setError("");
    if (step > 1) {
      setStep((prev) => prev - 1);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.post("/api/profile/onboard", {
        travel,
        diet,
        electricity,
        shopping,
      });
      if (res.data.status === "success") {
        onOnboardComplete();
      } else {
        setError("Failed to initialize profile. Please try again.");
        setLoading(false);
      }
    } catch (err) {
      setError(extractErrorMessage(err));
      setLoading(false);
    }
  };

  const travelOptions = [
    { id: "car", label: "Car", emoji: "🚗", desc: "Daily commutes or personal driving" },
    { id: "bike", label: "Motorcycle", emoji: "🏍", desc: "Commuting by motorbike or scooter" },
    { id: "public", label: "Public Transit", emoji: "🚌", desc: "Buses, trains, subways, or shuttles" },
    { id: "cycle", label: "Walk / Cycle", emoji: "🚲", desc: "Active transit or zero-emission commute" },
  ];

  const dietOptions = [
    { id: "vegetarian", label: "Vegetarian", emoji: "🥗", desc: "No meat, plant-based diet" },
    { id: "mixed", label: "Mixed Diet", emoji: "🍗", desc: "Occasional poultry and red meat" },
    { id: "heavy_meat", label: "Heavy Meat", emoji: "🍖", desc: "Red meat, pork, or beef daily" },
  ];

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "radial-gradient(circle at 50% 50%, #030d1a 0%, #010409 100%)",
        p: 3,
        position: "relative",
        overflow: "hidden",
        "&::before": {
          content: '""',
          position: "absolute",
          top: "-20%",
          left: "-10%",
          width: "50vw",
          height: "50vw",
          background: "radial-gradient(circle, rgba(16, 185, 129, 0.08) 0%, transparent 70%)",
          borderRadius: "50%",
          pointerEvents: "none",
        },
        "&::after": {
          content: '""',
          position: "absolute",
          bottom: "-25%",
          right: "-10%",
          width: "60vw",
          height: "60vw",
          background: "radial-gradient(circle, rgba(6, 182, 212, 0.08) 0%, transparent 70%)",
          borderRadius: "50%",
          pointerEvents: "none",
        },
      }}
    >
      {/* Onboarding Card */}
      <Card
        sx={{
          width: "100%",
          maxWidth: 600,
          borderRadius: 4,
          backgroundColor: "rgba(10, 25, 41, 0.65)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255, 255, 255, 0.06)",
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.4)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Progress Bar & Header */}
        <Box sx={{ p: 3, borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
            <Typography variant="caption" sx={{ color: "#10b981", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>
              Creating Your Carbon Twin
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700 }}>
              Step {step} of 4
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={(step / 4) * 100}
            sx={{
              height: 6,
              borderRadius: 3,
              backgroundColor: "rgba(255, 255, 255, 0.05)",
              "& .MuiLinearProgress-bar": {
                background: "linear-gradient(90deg, #10b981, #06b6d4)",
              },
            }}
          />
        </Box>

        <CardContent sx={{ p: 4, flexGrow: 1, minHeight: 380, display: "flex", flexDirection: "column" }}>
          {error && (
            <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
              {error}
            </Alert>
          )}

          <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25 }}
                >
                  <Typography variant="h5" sx={{ fontWeight: 800, color: "#f8fafc", mb: 1 }}>
                    How do you travel? 🚗
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
                    Your primary mode of transportation plays a major role in your daily greenhouse gas emissions.
                  </Typography>

                  <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
                    {travelOptions.map((opt) => {
                      const selected = travel === opt.id;
                      return (
                        <Box
                          key={opt.id}
                          onClick={() => {
                            setTravel(opt.id);
                            setError("");
                          }}
                          component={motion.div}
                          whileHover={{ scale: 1.015, translateY: -2 }}
                          whileTap={{ scale: 0.985 }}
                          sx={{
                            p: 2.5,
                            borderRadius: 2,
                            cursor: "pointer",
                            border: `1px solid ${selected ? "rgba(16, 185, 129, 0.5)" : "rgba(255, 255, 255, 0.06)"}`,
                            background: selected
                              ? "linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(6, 182, 212, 0.08) 100%)"
                              : "rgba(255, 255, 255, 0.01)",
                            boxShadow: selected ? "0 8px 24px rgba(16, 185, 129, 0.15)" : "none",
                            display: "flex",
                            alignItems: "center",
                            gap: 2.5,
                            transition: "border-color 0.2s ease, background-color 0.2s ease",
                            "&:hover": {
                              borderColor: selected ? "rgba(16, 185, 129, 0.6)" : "rgba(255, 255, 255, 0.12)",
                              backgroundColor: selected
                                ? "linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(6, 182, 212, 0.1) 100%)"
                                : "rgba(255, 255, 255, 0.03)",
                            },
                          }}
                        >
                          <Typography variant="h3" sx={{ userSelect: "none" }}>{opt.emoji}</Typography>
                          <Box sx={{ flexGrow: 1 }}>
                            <Typography variant="body1" sx={{ fontWeight: 700, color: selected ? "#10b981" : "#f8fafc" }}>
                              {opt.label}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                              {opt.desc}
                            </Typography>
                          </Box>
                          {selected && <CheckCircleRoundedIcon sx={{ color: "#10b981" }} />}
                        </Box>
                      );
                    })}
                  </Box>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25 }}
                >
                  <Typography variant="h5" sx={{ fontWeight: 800, color: "#f8fafc", mb: 1 }}>
                    What about your diet? 🥗
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
                    Different foods require vastly different amounts of resources, water, and land to produce.
                  </Typography>

                  <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {dietOptions.map((opt) => {
                      const selected = diet === opt.id;
                      return (
                        <Box
                          key={opt.id}
                          onClick={() => {
                            setDiet(opt.id);
                            setError("");
                          }}
                          component={motion.div}
                          whileHover={{ scale: 1.01, translateY: -2 }}
                          whileTap={{ scale: 0.99 }}
                          sx={{
                            p: 2.5,
                            borderRadius: 2,
                            cursor: "pointer",
                            border: `1px solid ${selected ? "rgba(16, 185, 129, 0.5)" : "rgba(255, 255, 255, 0.06)"}`,
                            background: selected
                              ? "linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(6, 182, 212, 0.08) 100%)"
                              : "rgba(255, 255, 255, 0.01)",
                            boxShadow: selected ? "0 8px 24px rgba(16, 185, 129, 0.15)" : "none",
                            display: "flex",
                            alignItems: "center",
                            gap: 3,
                            transition: "border-color 0.2s ease, background-color 0.2s ease",
                            "&:hover": {
                              borderColor: selected ? "rgba(16, 185, 129, 0.6)" : "rgba(255, 255, 255, 0.12)",
                              backgroundColor: selected
                                ? "linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(6, 182, 212, 0.1) 100%)"
                                : "rgba(255, 255, 255, 0.03)",
                            },
                          }}
                        >
                          <Typography variant="h3" sx={{ userSelect: "none" }}>{opt.emoji}</Typography>
                          <Box sx={{ flexGrow: 1 }}>
                            <Typography variant="body1" sx={{ fontWeight: 700, color: selected ? "#10b981" : "#f8fafc" }}>
                              {opt.label}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                              {opt.desc}
                            </Typography>
                          </Box>
                          {selected && <CheckCircleRoundedIcon sx={{ color: "#10b981" }} />}
                        </Box>
                      );
                    })}
                  </Box>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25 }}
                >
                  <Typography variant="h5" sx={{ fontWeight: 800, color: "#f8fafc", mb: 1 }}>
                    Monthly Electricity Usage ⚡
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 5 }}>
                    Adjust the slider to match your average monthly electrical consumption in kilowatt-hours (kWh).
                  </Typography>

                  <Box sx={{ px: 3, py: 4, borderRadius: 2, backgroundColor: "rgba(255, 255, 255, 0.015)", border: "1px solid rgba(255, 255, 255, 0.03)", mb: 2 }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", mb: 3 }}>
                      <Typography variant="subtitle1" sx={{ color: "text.secondary", fontWeight: 600 }}>
                        Estimated Consumption
                      </Typography>
                      <Typography variant="h4" sx={{ fontWeight: 800, color: "#10b981" }}>
                        {electricity} <Typography component="span" variant="body1" color="text.secondary">Units (kWh)</Typography>
                      </Typography>
                    </Box>

                    <Slider
                      value={electricity}
                      onChange={(e, val) => setElectricity(val)}
                      min={100}
                      max={1000}
                      step={50}
                      marks={[
                        { value: 100, label: "100 Units" },
                        { value: 500, label: "500 Units" },
                        { value: 1000, label: "1000 Units" },
                      ]}
                      sx={{
                        color: "#10b981",
                        height: 6,
                        "& .MuiSlider-track": { border: "none" },
                        "& .MuiSlider-thumb": {
                          height: 22,
                          width: 22,
                          backgroundColor: "#fff",
                          border: "3px solid #10b981",
                          boxShadow: "0 0 10px rgba(16, 185, 129, 0.3)",
                          "&:focus, &:hover, &.Mui-active, &.Mui-focusVisible": {
                            boxShadow: "0 0 0 8px rgba(16, 185, 129, 0.16)",
                          },
                        },
                        "& .MuiSlider-valueLabel": {
                          lineHeight: 1.2,
                          fontSize: 12,
                          background: "unset",
                          padding: 0,
                          width: 32,
                          height: 32,
                          borderRadius: "50% 50% 50% 0",
                          backgroundColor: "#10b981",
                          transformOrigin: "bottom left",
                          transform: "translate(50%, -100%) rotate(-45deg) scale(0)",
                          "&::before": { display: "none" },
                          "&.MuiSlider-valueLabelOpen": {
                            transform: "translate(50%, -100%) rotate(-45deg) scale(1)",
                          },
                          "& > *": {
                            transform: "rotate(45deg)",
                          },
                        },
                        "& .MuiSlider-markLabel": {
                          color: "text.secondary",
                          fontWeight: 600,
                          fontSize: "0.75rem",
                          mt: 1,
                        },
                      }}
                    />
                  </Box>
                </motion.div>
              )}

              {step === 4 && (
                <motion.div
                  key="step4"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25 }}
                >
                  <Typography variant="h5" sx={{ fontWeight: 800, color: "#f8fafc", mb: 1 }}>
                    Monthly Shopping Frequency 🛍️
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 5 }}>
                    How many new items of clothing, electronics, or personal goods do you buy per month on average?
                  </Typography>

                  <Box sx={{ px: 3, py: 4, borderRadius: 2, backgroundColor: "rgba(255, 255, 255, 0.015)", border: "1px solid rgba(255, 255, 255, 0.03)", mb: 2 }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", mb: 3 }}>
                      <Typography variant="subtitle1" sx={{ color: "text.secondary", fontWeight: 600 }}>
                        Purchases per Month
                      </Typography>
                      <Typography variant="h4" sx={{ fontWeight: 800, color: "#06b6d4" }}>
                        {shopping} <Typography component="span" variant="body1" color="text.secondary">{shopping === 1 ? "Item" : "Items"}</Typography>
                      </Typography>
                    </Box>

                    <Slider
                      value={shopping}
                      onChange={(e, val) => setShopping(val)}
                      min={0}
                      max={10}
                      step={1}
                      marks={[
                        { value: 0, label: "0 (Minimalist)" },
                        { value: 5, label: "5 Items" },
                        { value: 10, label: "10 (Heavy)" },
                      ]}
                      sx={{
                        color: "#06b6d4",
                        height: 6,
                        "& .MuiSlider-track": { border: "none" },
                        "& .MuiSlider-thumb": {
                          height: 22,
                          width: 22,
                          backgroundColor: "#fff",
                          border: "3px solid #06b6d4",
                          boxShadow: "0 0 10px rgba(6, 182, 212, 0.3)",
                          "&:focus, &:hover, &.Mui-active, &.Mui-focusVisible": {
                            boxShadow: "0 0 0 8px rgba(6, 182, 212, 0.16)",
                          },
                        },
                        "& .MuiSlider-markLabel": {
                          color: "text.secondary",
                          fontWeight: 600,
                          fontSize: "0.75rem",
                          mt: 1,
                        },
                      }}
                    />
                  </Box>
                </motion.div>
              )}
            </AnimatePresence>
          </Box>
        </CardContent>

        {/* Wizard Controls Footer */}
        <Box
          sx={{
            p: 3,
            borderTop: "1px solid rgba(255, 255, 255, 0.05)",
            backgroundColor: "rgba(2, 7, 14, 0.25)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Button
            variant="text"
            onClick={handleBack}
            disabled={step === 1 || loading}
            startIcon={<ArrowBackRoundedIcon />}
            sx={{
              color: "text.secondary",
              fontWeight: 700,
              textTransform: "none",
              "&:hover": {
                color: "#f8fafc",
                backgroundColor: "rgba(255, 255, 255, 0.02)",
              },
            }}
          >
            Back
          </Button>

          <Button
            variant="contained"
            onClick={handleNext}
            disabled={loading}
            endIcon={loading ? null : <ArrowForwardRoundedIcon />}
            sx={{
              px: 4,
              py: 1.2,
              borderRadius: 2.5,
              fontWeight: 700,
              textTransform: "none",
              background: "linear-gradient(135deg, #10b981, #06b6d4)",
              boxShadow: "0 4px 14px rgba(16, 185, 129, 0.25)",
              "&:hover": {
                background: "linear-gradient(135deg, #059669, #0891b2)",
                boxShadow: "0 6px 18px rgba(16, 185, 129, 0.35)",
              },
            }}
          >
            {loading ? (
              <CircularProgress size={20} sx={{ color: "#fff" }} />
            ) : step === 4 ? (
              "Complete Sync"
            ) : (
              "Next"
            )}
          </Button>
        </Box>
      </Card>
    </Box>
  );
}
