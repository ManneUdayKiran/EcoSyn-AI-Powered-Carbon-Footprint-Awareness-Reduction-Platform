import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  LinearProgress,
  Button,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Chip,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import WorkspacePremiumRoundedIcon from "@mui/icons-material/WorkspacePremiumRounded";
import HowToRegRoundedIcon from "@mui/icons-material/HowToRegRounded";
import StarsRoundedIcon from "@mui/icons-material/StarsRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import { api } from "../api/client";

export default function EcoChallenges() {
  const [profile, setProfile] = useState(null);
  const [challenges, setChallenges] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [alert, setAlert] = useState(null);
  const [levelupOpen, setLevelupOpen] = useState(false);
  const [levelupMsg, setLevelupMsg] = useState("");

  const fetchData = async () => {
    try {
      const profRes = await api.get("/api/profile");
      const chalRes = await api.get("/api/challenges");
      const leadRes = await api.get("/api/leaderboard");
      setProfile(profRes.data);
      setChallenges(chalRes.data);
      setLeaderboard(leadRes.data);
    } catch (e) {
      console.error("Error fetching challenges data", e);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleCheckIn = async (challengeId) => {
    try {
      const oldLevel = profile.level;
      const res = await api.post("/api/challenges/complete", { challengeId });
      
      const newProfile = res.data.profile;
      setProfile(newProfile);
      
      // Re-fetch challenges
      const chalRes = await api.get("/api/challenges");
      setChallenges(chalRes.data);

      if (res.data.completedNow) {
        setAlert({
          severity: "success",
          message: `🎉 Challenge Completed! Unlocked new achievement points.`,
        });
        // If level up occurred
        if (newProfile.level > oldLevel) {
          setLevelupMsg(`Congratulations! You have advanced to Level ${newProfile.level}! Unlocked badge: "Level ${newProfile.level} Hero".`);
          setLevelupOpen(true);
        }
      } else {
        setAlert({
          severity: "info",
          message: `Checked in! Incremental progress logged. +5 EcoPoints.`,
        });
      }
      fetchData();
    } catch (e) {
      setAlert({ severity: "error", message: "Error registering progress check-in." });
    }
  };

  const getDifficultyColor = (diff) => {
    switch (diff) {
      case "Easy":
        return "success";
      case "Medium":
        return "warning";
      default:
        return "error";
    }
  };

  const getAvatarEmoji = (index) => {
    switch (index) {
      case 0:
        return "🥇";
      case 1:
        return "🥈";
      case 2:
        return "🥉";
      default:
        return "👤";
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 1, color: "#f8fafc" }}>
          Eco Missions & Leaderboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Gamify sustainable lifestyle choices. Participate in weekly environmental challenges, level up your profile, and earn badges to climb the leaderboard.
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Left Column: Weekly challenges */}
        <Grid item xs={12} md={7}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2.5 }}>
            Active Weekly Missions
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {challenges.map((chal) => (
              <Paper
                key={chal.id}
                sx={{
                  p: 3,
                  borderRadius: 2,
                  backgroundColor: "rgba(9, 18, 29, 0.65)",
                  backdropFilter: "blur(10px)",
                  border: chal.completed ? "1px solid rgba(16, 185, 129, 0.25)" : "1px solid rgba(255,255,255,0.06)",
                  boxShadow: chal.completed ? "0 4px 20px rgba(16, 185, 129, 0.08)" : "none",
                }}
              >
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1.5 }}>
                  <Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                      <Typography variant="body1" sx={{ fontWeight: 800, color: chal.completed ? "#10b981" : "#f8fafc" }}>
                        {chal.title}
                      </Typography>
                      {chal.completed && <CheckCircleRoundedIcon color="success" sx={{ fontSize: 18 }} />}
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      {chal.description}
                    </Typography>
                  </Box>
                  <Chip
                    label={chal.difficulty}
                    size="small"
                    color={getDifficultyColor(chal.difficulty)}
                    sx={{ height: 18, fontSize: "0.65rem", fontWeight: 700 }}
                  />
                </Box>

                {/* Progress bar */}
                <Box sx={{ my: 2 }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                    <Typography variant="caption" color="text.secondary">
                      Progress: {chal.progress} / {chal.target} {chal.unit}
                    </Typography>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: "primary.main" }}>
                      {Math.round((chal.progress / chal.target) * 100)}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={Math.round((chal.progress / chal.target) * 100)}
                    color={chal.completed ? "success" : "primary"}
                    sx={{ height: 6, borderRadius: 1 }}
                  />
                </Box>

                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 2.5 }}>
                  <Chip
                    icon={<StarsRoundedIcon sx={{ color: "warning.main" }} />}
                    label={`+${chal.points} pts`}
                    size="small"
                    variant="outlined"
                    sx={{ borderColor: "rgba(245, 158, 11, 0.3)", color: "#f59e0b", fontWeight: 700 }}
                  />
                  {chal.completed ? (
                    <Chip label="Claimed" color="success" size="small" sx={{ fontWeight: 700 }} />
                  ) : (
                    <Button
                      variant="contained"
                      color="primary"
                      size="small"
                      onClick={() => handleCheckIn(chal.id)}
                      startIcon={<HowToRegRoundedIcon />}
                      sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2 }}
                    >
                      Check In
                    </Button>
                  )}
                </Box>
              </Paper>
            ))}
          </Box>
        </Grid>

        {/* Right Column: Leaderboard */}
        <Grid item xs={12} md={5}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2.5 }}>
            Eco Warrior Standings
          </Typography>
          <Paper sx={{ p: 3, borderRadius: 2, background: "rgba(9, 18, 29, 0.65)", backdropFilter: "blur(10px)" }}>
            <List>
              {leaderboard.map((user, idx) => (
                <ListItem
                  key={idx}
                  secondaryAction={
                    <Box sx={{ textAlign: "right" }}>
                      <Typography variant="body2" sx={{ fontWeight: 800, color: user.isCurrentUser ? "#10b981" : "#f8fafc" }}>
                        {user.points} pts
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Level {user.level}
                      </Typography>
                    </Box>
                  }
                  sx={{
                    my: 1,
                    borderRadius: 1,
                    backgroundColor: user.isCurrentUser ? "rgba(16, 185, 129, 0.06)" : "rgba(255,255,255,0.01)",
                    border: user.isCurrentUser ? "1px solid rgba(16, 185, 129, 0.2)" : "1px solid rgba(255,255,255,0.03)",
                    px: 2,
                    py: 1.5,
                  }}
                >
                  <ListItemAvatar sx={{ minWidth: 40 }}>
                    <Avatar sx={{ bgcolor: "rgba(255,255,255,0.03)", fontSize: "0.95rem" }}>
                      {getAvatarEmoji(idx)}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={user.name}
                    primaryTypographyProps={{
                      fontSize: "0.95rem",
                      fontWeight: user.isCurrentUser ? 800 : 600,
                      color: user.isCurrentUser ? "#10b981" : "#f8fafc",
                    }}
                    secondary={user.isCurrentUser ? "You are here" : "Eco-Citizen"}
                    secondaryTypographyProps={{ fontSize: "0.75rem" }}
                  />
                </ListItem>
              ))}
            </List>

            <Box sx={{ p: 2, mt: 3, borderRadius: 1, backgroundColor: "rgba(245, 158, 11, 0.04)", border: "1px solid rgba(245, 158, 11, 0.12)", textAlign: "center" }}>
              <WorkspacePremiumRoundedIcon sx={{ color: "#f59e0b", fontSize: 32, mb: 0.5 }} />
              <Typography variant="body2" sx={{ fontWeight: 700, color: "#f59e0b", mb: 0.5 }}>
                Climb the ranks!
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                Complete more weekly tasks or scan utility bills to claim the top spot.
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Level-Up Dialog */}
      <Dialog open={levelupOpen} onClose={() => setLevelupOpen(false)} PaperProps={{ sx: { borderRadius: 2, p: 2, bgcolor: "#09121d" } }}>
        <DialogTitle sx={{ textAlign: "center", fontWeight: 900, fontSize: "1.5rem", color: "#10b981" }}>
          🎉 Level Up! 🎉
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", justifyContent: "center", my: 2 }}>
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: "50%",
                backgroundColor: "rgba(16, 185, 129, 0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "2px solid #10b981",
                boxShadow: "0 0 20px rgba(16,185,129,0.3)",
              }}
            >
              <EmojiEventsRoundedIcon sx={{ color: "#10b981", fontSize: 40 }} />
            </Box>
          </Box>
          <Typography variant="body1" align="center" sx={{ color: "#fff", fontWeight: 600 }}>
            {levelupMsg}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ justifyContent: "center" }}>
          <Button variant="contained" color="primary" onClick={() => setLevelupOpen(false)} sx={{ px: 4 }}>
            Awesome!
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={Boolean(alert)}
        autoHideDuration={3500}
        onClose={() => setAlert(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        {alert && (
          <Alert severity={alert.severity} onClose={() => setAlert(null)} sx={{ width: "100%" }}>
            {alert.message}
          </Alert>
        )}
      </Snackbar>
    </Box>
  );
}
