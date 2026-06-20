import { lazy, Suspense, useMemo, useState, useContext } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  useLocation,
} from "react-router-dom";
import {
  AppBar,
  Avatar,
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
  CircularProgress,
  Button,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  useTheme,
} from "@mui/material";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import SpaceDashboardRoundedIcon from "@mui/icons-material/SpaceDashboardRounded";
import DocumentScannerRoundedIcon from "@mui/icons-material/DocumentScannerRounded";
import PortraitRoundedIcon from "@mui/icons-material/PortraitRounded";
import ForumRoundedIcon from "@mui/icons-material/ForumRounded";
import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import LightModeRoundedIcon from "@mui/icons-material/LightModeRounded";
import DarkModeRoundedIcon from "@mui/icons-material/DarkModeRounded";

import Auth from "./components/Auth";
import Onboarding from "./components/Onboarding";
import { api } from "./api/client";
import { motion, AnimatePresence } from "framer-motion";
import { NotificationContext } from "./context/NotificationContext";
import { ColorModeContext } from "./main";
import { UserProvider, useUser, UserContext } from "./context/UserContext";

const drawerWidth = 260;

const Dashboard = lazy(() => import("./components/Dashboard"));
const SmartScanner = lazy(() => import("./components/SmartScanner"));
const CarbonTwin = lazy(() => import("./components/CarbonTwin"));
const AICoach = lazy(() => import("./components/AICoach"));
const EcoChallenges = lazy(() => import("./components/EcoChallenges"));
const ActivityLog = lazy(() => import("./components/ActivityLog"));

const navItems = [
  { label: "Dashboard", path: "/", icon: <SpaceDashboardRoundedIcon /> },
  { label: "Smart Scanner", path: "/scan", icon: <DocumentScannerRoundedIcon /> },
  { label: "Carbon Twin", path: "/twin", icon: <PortraitRoundedIcon /> },
  { label: "AI Coach", path: "/coach", icon: <ForumRoundedIcon /> },
  { label: "Eco Challenges", path: "/challenges", icon: <EmojiEventsRoundedIcon /> },
  { label: "Activity Log", path: "/activities", icon: <HistoryRoundedIcon /> },
];

const SidebarContent = ({ onNavigate, profile, onLogout, onEditProfile }) => {
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
      
      <Divider light sx={{ borderColor: (theme) => theme.palette.mode === 'dark' ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }} />
      
      {/* User Stats Card in Sidebar */}
      {profile && (
        <Box sx={{ p: 2, mx: 2, my: 2, borderRadius: 2, backgroundColor: (theme) => theme.palette.mode === 'dark' ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)", border: (theme) => `1px solid ${theme.palette.mode === 'dark' ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.05)"}` }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
            <Avatar
              src={profile.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(profile.studentName || 'ecosyn')}`}
              alt="User Profile Avatar"
              sx={{
                width: 48,
                height: 48,
                border: "2px solid #10b981",
                boxShadow: "0 0 10px rgba(16, 185, 129, 0.2)",
                backgroundColor: (theme) => theme.palette.mode === 'dark' ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)"
              }}
            >
              {profile.studentName ? profile.studentName[0].toUpperCase() : "U"}
            </Avatar>
            <Box sx={{ overflow: "hidden", flexGrow: 1 }}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 0.5 }}>
                <Typography variant="body1" sx={{ color: "text.primary", fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flexGrow: 1 }}>
                  {profile.studentName}
                </Typography>
                <IconButton aria-label="Edit profile" size="small" onClick={onEditProfile} sx={{ color: "text.secondary", p: 0.5, "&:hover": { color: "#10b981" } }}>
                  <EditRoundedIcon sx={{ fontSize: "1.05rem" }} />
                </IconButton>
              </Box>
              <Chip
                label={`Lv. ${profile.level}`}
                size="small"
                color="primary"
                sx={{ fontWeight: 700, height: 18, fontSize: "0.7rem", mt: 0.5 }}
              />
            </Box>
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
              sx={{ height: 6, borderRadius: 1, backgroundColor: (theme) => theme.palette.mode === 'dark' ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)" }}
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

      <Box sx={{ p: 2, mt: "auto", display: "flex", flexDirection: "column", gap: 1 }}>
        <Button
          fullWidth
          variant="contained"
          color="error"
          startIcon={<LogoutRoundedIcon />}
          onClick={onLogout}
          sx={{
            background: "linear-gradient(135deg, #ef4444, #b91c1c)",
            color: "#fff",
            fontWeight: 700,
            fontSize: "0.8rem",
            py: 1,
            boxShadow: "0 4px 12px rgba(239, 68, 68, 0.15)",
            "&:hover": {
              background: "linear-gradient(135deg, #dc2626, #991b1b)",
              boxShadow: "0 6px 16px rgba(239, 68, 68, 0.25)",
            },
          }}
        >
          Log Out
        </Button>
      </Box>
    </Box>
  );
};

const Shell = ({ profile, onLogout, onEditProfile }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const toggleDrawer = () => setMobileOpen((prev) => !prev);
  const closeDrawer = () => setMobileOpen(false);
  
  const location = useLocation();
  const pageTitle = useMemo(() => {
    const active = navItems.find((item) => item.path === location.pathname);
    return active?.label || "Dashboard";
  }, [location.pathname]);

  const theme = useTheme();
  const colorMode = useContext(ColorModeContext);

  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "100vh",
        width: "100%",
        backgroundColor: "background.default",
      }}
    >
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          backdropFilter: "blur(20px)",
          backgroundColor: theme.palette.mode === "dark" ? "rgba(2, 7, 14, 0.75)" : "rgba(255, 255, 255, 0.8)",
          borderBottom: `1px solid ${theme.palette.mode === "dark" ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)"}`,
          zIndex: (theme) => theme.zIndex.drawer + 1,
        }}
      >
        <Toolbar>
          <IconButton
            aria-label="Open navigation menu"
            color="inherit"
            edge="start"
            onClick={toggleDrawer}
            sx={{ mr: 2, display: { md: "none" } }}
          >
            <MenuRoundedIcon />
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700, letterSpacing: "-0.5px", color: "text.primary" }}>
            {pageTitle}
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Tooltip title={`Switch to ${theme.palette.mode === "dark" ? "Light" : "Dark"} Mode`}>
              <IconButton aria-label={`Switch to ${theme.palette.mode === "dark" ? "light" : "dark"} mode`} onClick={colorMode.toggleColorMode} color="inherit" sx={{ color: "text.primary" }}>
                {theme.palette.mode === "dark" ? <LightModeRoundedIcon /> : <DarkModeRoundedIcon />}
              </IconButton>
            </Tooltip>
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
              backgroundColor: "background.default",
              color: "text.primary",
              borderRight: `1px solid ${theme.palette.mode === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
            },
          }}
        >
          <SidebarContent onNavigate={closeDrawer} profile={profile} onLogout={onLogout} onEditProfile={onEditProfile} />
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: "none", md: "block" },
            "& .MuiDrawer-paper": {
              width: drawerWidth,
              boxSizing: "border-box",
              borderRight: `1px solid ${theme.palette.mode === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
              backgroundColor: "background.default",
              color: "text.primary",
            },
          }}
          open
        >
          <SidebarContent onNavigate={() => {}} profile={profile} onLogout={onLogout} onEditProfile={onEditProfile} />
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { xs: "100%", md: `calc(100% - ${drawerWidth}px)` },
          minWidth: 0,
          p: { xs: 2.5, md: 4 },
          mt: 8,
          minHeight: "100vh",
          background:
            "radial-gradient(circle at 10% 20%, rgba(16, 185, 129, 0.06), transparent 35%), radial-gradient(circle at 90% 10%, rgba(6, 182, 212, 0.05), transparent 45%)",
        }}
      >
        <Suspense fallback={<Box role="status" aria-label="Loading page" sx={{ display: "flex", justifyContent: "center", py: 8 }}><CircularProgress /></Box>}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/scan" element={<SmartScanner />} />
            <Route path="/twin" element={<CarbonTwin />} />
            <Route path="/coach" element={<AICoach />} />
            <Route path="/challenges" element={<EcoChallenges />} />
            <Route path="/activities" element={<ActivityLog />} />
          </Routes>
        </Suspense>
      </Box>
    </Box>
  );
};

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("ecosyn_token") || null);
  const [notifications, setNotifications] = useState([]);

  const showNotification = (message, severity = "success") => {
    const id = Date.now() + Math.random();
    setNotifications((prev) => [...prev, { id, message, severity }]);
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 4500);
  };

  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editSeed, setEditSeed] = useState("");

  const getAvatarSeed = (url) => {
    if (!url) return "";
    try {
      const parsedUrl = new URL(url);
      return parsedUrl.searchParams.get("seed") || "";
    } catch {
      const match = url.match(/[?&]seed=([^&#]*)/);
      return match ? decodeURIComponent(match[1]) : "";
    }
  };

  const handleOpenEditProfile = (currentProfile) => {
    if (currentProfile) {
      setEditName(currentProfile.studentName || "");
      setEditSeed(getAvatarSeed(currentProfile.avatar) || currentProfile.studentName || "");
      setEditProfileOpen(true);
    }
  };

  const handleAuthSuccess = (newToken, user) => {
    localStorage.setItem("ecosyn_token", newToken);
    localStorage.setItem("ecosyn_userId", user.id);
    setToken(newToken);
  };

  const handleLogout = () => {
    localStorage.removeItem("ecosyn_token");
    localStorage.removeItem("ecosyn_userId");
    setToken(null);
  };

  const renderNotifications = () => (
    <Box
      sx={{
        position: "fixed",
        bottom: 24,
        right: 24,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: 1.5,
        pointerEvents: "none",
        width: "100%",
        maxWidth: 360,
      }}
    >
      <AnimatePresence>
        {notifications.map((notif) => (
          <Box
            key={notif.id}
            component={motion.div}
            layout
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
            sx={{
              pointerEvents: "auto",
              boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
              borderRadius: 2.5,
              overflow: "hidden",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <Alert
              severity={notif.severity}
              variant="filled"
              onClose={() => {
                setNotifications((prev) => prev.filter((n) => n.id !== notif.id));
              }}
              sx={{
                width: "100%",
                backdropFilter: "blur(10px)",
                fontWeight: 650,
                fontSize: "0.9rem",
                borderRadius: 2.5,
                boxShadow: "none",
                "& .MuiAlert-message": { width: "100%", pr: 2 },
                "&.MuiAlert-filledSuccess": {
                  background: "linear-gradient(135deg, rgba(16, 185, 129, 0.95), rgba(5, 150, 105, 0.95))",
                  color: "#fff",
                },
                "&.MuiAlert-filledError": {
                  background: "linear-gradient(135deg, rgba(239, 68, 68, 0.95), rgba(220, 38, 38, 0.95))",
                  color: "#fff",
                },
                "&.MuiAlert-filledWarning": {
                  background: "linear-gradient(135deg, rgba(245, 158, 11, 0.95), rgba(217, 119, 6, 0.95))",
                  color: "#fff",
                },
                "&.MuiAlert-filledInfo": {
                  background: "linear-gradient(135deg, rgba(6, 182, 212, 0.95), rgba(8, 145, 178, 0.95))",
                  color: "#fff",
                },
              }}
            >
              {notif.message}
            </Alert>
          </Box>
        ))}
      </AnimatePresence>
    </Box>
  );

  if (!token) {
    return (
      <NotificationContext.Provider value={{ showNotification }}>
        <Auth onAuthSuccess={handleAuthSuccess} />
        {renderNotifications()}
      </NotificationContext.Provider>
    );
  }

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      <UserProvider token={token} handleLogout={handleLogout}>
        <UserContextConsumer
          handleLogout={handleLogout}
          editProfileOpen={editProfileOpen}
          setEditProfileOpen={setEditProfileOpen}
          editName={editName}
          setEditName={setEditName}
          editSeed={editSeed}
          setEditSeed={setEditSeed}
          handleOpenEditProfile={handleOpenEditProfile}
          renderNotifications={renderNotifications}
        />
      </UserProvider>
    </NotificationContext.Provider>
  );
}

function UserContextConsumer({
  handleLogout,
  editProfileOpen,
  setEditProfileOpen,
  editName,
  setEditName,
  editSeed,
  setEditSeed,
  handleOpenEditProfile,
  renderNotifications
}) {
  const { profile, setProfile, loading } = useUser();
  const { showNotification } = useContext(NotificationContext);

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      showNotification("Name cannot be empty.", "warning");
      return;
    }

    try {
      const finalAvatar = `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(editSeed.trim() || editName.trim())}`;
      const res = await api.put("/api/profile", {
        studentName: editName.trim(),
        avatar: finalAvatar
      });
      if (res.data.status === "success") {
        setProfile(res.data.profile);
        showNotification("Profile updated successfully!", "success");
        setEditProfileOpen(false);
      }
    } catch (err) {
      console.error("Profile update failed", err);
      showNotification("Failed to update profile info.", "error");
    }
  };

  if (loading && !profile) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", backgroundColor: "background.default" }}>
        <CircularProgress color="primary" />
      </Box>
    );
  }

  if (!profile) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", backgroundColor: "background.default" }}>
        <CircularProgress color="primary" />
      </Box>
    );
  }

  if (profile.isOnboarded === false) {
    return <Onboarding onOnboardComplete={() => window.location.reload()} />;
  }

  return (
    <BrowserRouter>
      <Shell profile={profile} onLogout={handleLogout} onEditProfile={() => handleOpenEditProfile(profile)} />

      {/* Edit Profile Dialog */}
      <Dialog
        open={editProfileOpen}
        onClose={() => setEditProfileOpen(false)}
        PaperProps={{
          sx: {
            backgroundColor: "background.paper",
            backdropFilter: "blur(20px)",
            border: (theme) => `1px solid ${theme.palette.mode === 'dark' ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.08)"}`,
            borderRadius: 3,
            p: 1.5,
            width: "100%",
            maxWidth: 420
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: "text.primary", pb: 1 }}>
          Edit Profile Info
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1.5, mt: 1, mb: 3 }}>
            <Avatar
              src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(editSeed.trim() || editName.trim() || 'ecosyn')}`}
              alt="Avatar Preview"
              sx={{
                width: 76,
                height: 76,
                border: "3px solid #10b981",
                boxShadow: "0 0 15px rgba(16, 185, 129, 0.25)",
                backgroundColor: (theme) => theme.palette.mode === 'dark' ? "rgba(255,255,255,0.05)" : "rgba(0, 0, 0, 0.04)"
              }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
              Live Avatar Preview
            </Typography>
          </Box>
          <TextField
            fullWidth
            label="Student Name"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            variant="outlined"
            sx={{
              mb: 2.5,
              "& .MuiOutlinedInput-root": {
                borderRadius: 2,
                backgroundColor: (theme) => theme.palette.mode === 'dark' ? "rgba(255,255,255,0.02)" : "rgba(0, 0, 0, 0.015)",
                "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: (theme) => theme.palette.mode === 'dark' ? "rgba(255,255,255,0.2)" : "rgba(0, 0, 0, 0.2)" },
                "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "#10b981" }
              }
            }}
          />
          <TextField
            fullWidth
            label="Avatar Seed"
            placeholder="e.g. eco-warrior"
            value={editSeed}
            onChange={(e) => setEditSeed(e.target.value)}
            variant="outlined"
            helperText="Change the seed to customize your character avatar!"
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: 2,
                backgroundColor: (theme) => theme.palette.mode === 'dark' ? "rgba(255,255,255,0.02)" : "rgba(0, 0, 0, 0.015)",
                "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: (theme) => theme.palette.mode === 'dark' ? "rgba(255,255,255,0.2)" : "rgba(0, 0, 0, 0.2)" },
                "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "#10b981" }
              },
              "& .MuiFormHelperText-root": { color: "text.secondary" }
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setEditProfileOpen(false)}
            sx={{ color: "text.secondary", fontWeight: 700, textTransform: "none" }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSaveProfile}
            variant="contained"
            color="primary"
            sx={{
              px: 3,
              borderRadius: 2,
              fontWeight: 700,
              textTransform: "none",
              background: "linear-gradient(135deg, #10b981, #06b6d4)",
              boxShadow: "0 4px 12px rgba(16, 185, 129, 0.2)"
            }}
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {renderNotifications()}
    </BrowserRouter>
  );
}
