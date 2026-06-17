import { useMemo, useState, useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  useLocation,
} from "react-router-dom";
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  Divider,
  Tooltip,
  Chip,
  LinearProgress,
  Button,
  Snackbar,
  Alert,
} from "@mui/material";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import SpaceDashboardRoundedIcon from "@mui/icons-material/SpaceDashboardRounded";
import DocumentScannerRoundedIcon from "@mui/icons-material/DocumentScannerRounded";
import PortraitRoundedIcon from "@mui/icons-material/PortraitRounded";
import ForumRoundedIcon from "@mui/icons-material/ForumRounded";
import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";

import Dashboard from "./components/Dashboard";
import SmartScanner from "./components/SmartScanner";
import CarbonTwin from "./components/CarbonTwin";
import AICoach from "./components/AICoach";
import EcoChallenges from "./components/EcoChallenges";
import ActivityLog from "./components/ActivityLog";
import { api, API_BASE_URL } from "./api/client";

const drawerWidth = 260;

const navItems = [
  { label: "Dashboard", path: "/", icon: <SpaceDashboardRoundedIcon /> },
  { label: "Smart Scanner", path: "/scan", icon: <DocumentScannerRoundedIcon /> },
  { label: "Carbon Twin", path: "/twin", icon: <PortraitRoundedIcon /> },
  { label: "AI Coach", path: "/coach", icon: <ForumRoundedIcon /> },
  { label: "Eco Challenges", path: "/challenges", icon: <EmojiEventsRoundedIcon /> },
  { label: "Activity Log", path: "/activities", icon: <HistoryRoundedIcon /> },
];

const SidebarContent = ({ onNavigate, profile, onReset }) => {
  const location = useLocation();
  
  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Toolbar sx={{ px: 3, py: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #10b981, #06b6d4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              color: "#fff",
              boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)",
            }}
          >
            ES
          </Box>
          <Typography variant="h6" component="div" sx={{ fontWeight: 800, letterSpacing: "-0.5px" }}>
            EcoSyn
          </Typography>
        </Box>
      </Toolbar>
      
      <Divider light sx={{ borderColor: "rgba(255,255,255,0.06)" }} />
      
      {/* User Stats Card in Sidebar */}
      {profile && (
        <Box sx={{ p: 2.5, mx: 2, my: 2, borderRadius: 1, backgroundColor: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
            <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 600 }}>
              {profile.studentName}
            </Typography>
            <Chip
              label={`Lv. ${profile.level}`}
              size="small"
              color="primary"
              sx={{ fontWeight: 700, height: 20, fontSize: "0.75rem" }}
            />
          </Box>
          <Box sx={{ mb: 1 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
              <Typography variant="caption" color="text.secondary">
                EcoPoints
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: 700, color: "primary.main" }}>
                {profile.ecoPoints} pts
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={profile.levelProgress}
              sx={{ height: 6, borderRadius: 1, backgroundColor: "rgba(255,255,255,0.08)" }}
            />
          </Box>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 1.5 }}>
            <Typography variant="caption" color="text.secondary">
              EcoScore
            </Typography>
            <Chip
              label={`${profile.sustainabilityScore}/100`}
              size="small"
              color={profile.sustainabilityScore >= 75 ? "success" : "warning"}
              sx={{ fontWeight: 800, height: 20, fontSize: "0.7rem" }}
            />
          </Box>
        </Box>
      )}

      <List sx={{ flexGrow: 1, px: 2 }}>
        {navItems.map((item) => {
          const active = location.pathname === item.path;
          return (
            <ListItemButton
              key={item.path}
              component={Link}
              to={item.path}
              onClick={onNavigate}
              sx={{
                my: 0.5,
                borderRadius: 2,
                backgroundColor: active ? "rgba(16, 185, 129, 0.08)" : "transparent",
                border: active ? "1px solid rgba(16, 185, 129, 0.15)" : "1px solid transparent",
                color: active ? "#10b981" : "text.secondary",
                "&:hover": {
                  backgroundColor: "rgba(16, 185, 129, 0.04)",
                  color: "text.primary",
                },
              }}
            >
              <ListItemIcon sx={{ color: active ? "#10b981" : "text.secondary", minWidth: 40 }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                primaryTypographyProps={{ fontWeight: active ? 700 : 500, fontSize: "0.95rem" }}
              />
            </ListItemButton>
          );
        })}
      </List>

      <Box sx={{ p: 2, mt: "auto" }}>
        <Button
          fullWidth
          variant="outlined"
          color="inherit"
          startIcon={<RefreshRoundedIcon />}
          onClick={onReset}
          sx={{
            borderColor: "rgba(255,255,255,0.08)",
            color: "text.secondary",
            fontSize: "0.8rem",
            py: 1,
            "&:hover": {
              borderColor: "primary.main",
              backgroundColor: "rgba(16, 185, 129, 0.05)",
              color: "primary.main",
            },
          }}
        >
          Reset Demo Flow
        </Button>
      </Box>
    </Box>
  );
};

const Shell = ({ profile, onReset }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const toggleDrawer = () => setMobileOpen((prev) => !prev);
  const closeDrawer = () => setMobileOpen(false);
  
  const location = useLocation();
  const pageTitle = useMemo(() => {
    const active = navItems.find((item) => item.path === location.pathname);
    return active?.label || "Dashboard";
  }, [location.pathname]);

  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "100vh",
        backgroundColor: "background.default",
      }}
    >
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          backdropFilter: "blur(20px)",
          backgroundColor: "rgba(2, 7, 14, 0.75)",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          zIndex: (theme) => theme.zIndex.drawer + 1,
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={toggleDrawer}
            sx={{ mr: 2, display: { md: "none" } }}
          >
            <MenuRoundedIcon />
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700, letterSpacing: "-0.5px" }}>
            {pageTitle}
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Tooltip title="EcoSyn Sustainability Platform">
              <Chip
                label="v1.0 - Active"
                color="success"
                size="small"
                variant="outlined"
                sx={{ fontWeight: 700, borderColor: "rgba(16, 185, 129, 0.3)", color: "#10b981" }}
              />
            </Tooltip>
          </Box>
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={toggleDrawer}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: "block", md: "none" },
            "& .MuiDrawer-paper": {
              width: drawerWidth,
              backgroundColor: "#02070e",
              color: "#f8fafc",
              borderRight: "1px solid rgba(255,255,255,0.06)",
            },
          }}
        >
          <SidebarContent onNavigate={closeDrawer} profile={profile} onReset={onReset} />
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: "none", md: "block" },
            "& .MuiDrawer-paper": {
              width: drawerWidth,
              boxSizing: "border-box",
              borderRight: "1px solid rgba(255,255,255,0.06)",
              backgroundColor: "#02070e",
              color: "#f8fafc",
            },
          }}
          open
        >
          <SidebarContent onNavigate={() => {}} profile={profile} onReset={onReset} />
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2.5, md: 4 },
          mt: 8,
          minHeight: "100vh",
          background:
            "radial-gradient(circle at 10% 20%, rgba(16, 185, 129, 0.06), transparent 35%), radial-gradient(circle at 90% 10%, rgba(6, 182, 212, 0.05), transparent 45%)",
        }}
      >
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/scan" element={<SmartScanner />} />
          <Route path="/twin" element={<CarbonTwin />} />
          <Route path="/coach" element={<AICoach />} />
          <Route path="/challenges" element={<EcoChallenges />} />
          <Route path="/activities" element={<ActivityLog />} />
        </Routes>
      </Box>
    </Box>
  );
};

export default function App() {
  const [profile, setProfile] = useState(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");

  const fetchProfile = async () => {
    try {
      const res = await api.get("/api/profile");
      setProfile(res.data);
    } catch (error) {
      console.error("Error loading profile", error);
    }
  };

  useEffect(() => {
    const initialLoad = setTimeout(fetchProfile, 0);
    // Poll profile every 3 seconds to keep UI in sync during complex actions
    const interval = setInterval(fetchProfile, 3000);
    return () => {
      clearTimeout(initialLoad);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!window.EventSource) return undefined;

    const streamUrl = `${API_BASE_URL.replace(/\/$/, "")}/api/events`;
    const stream = new EventSource(streamUrl);

    stream.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "connected") return;

        if (data.payload?.profile) {
          setProfile(data.payload.profile);
        } else {
          fetchProfile();
        }

        if (data.payload?.message) {
          setSnackbarSeverity(data.type.includes("reset") ? "info" : "success");
          setSnackbarMessage(data.payload.message);
          setSnackbarOpen(true);
        }
      } catch (error) {
        console.error("Realtime event parsing failed", error);
      }
    };

    stream.onerror = () => {
      stream.close();
    };

    return () => stream.close();
  }, []);

  const handleReset = async () => {
    try {
      await api.post("/api/profile/reset");
      setSnackbarSeverity("info");
      setSnackbarMessage("Demo flow successfully reset!");
      setSnackbarOpen(true);
      fetchProfile();
      // Redirect to home if needed
      window.location.href = "/";
    } catch (error) {
      console.error("Reset failed", error);
      setSnackbarSeverity("error");
      setSnackbarMessage("Failed to reset demo flow.");
      setSnackbarOpen(true);
    }
  };

  return (
    <BrowserRouter>
      <Shell profile={profile} onReset={handleReset} />
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert severity={snackbarSeverity} sx={{ width: "100%" }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </BrowserRouter>
  );
}
