import { useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Tabs,
  Tab,
  InputAdornment,
  IconButton,
  Alert,
  Fade,
  CircularProgress,
} from "@mui/material";
import EmailRoundedIcon from "@mui/icons-material/EmailRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import VisibilityOffRoundedIcon from "@mui/icons-material/VisibilityOffRounded";
import { api, extractErrorMessage } from "../api/client";

export default function Auth({ onAuthSuccess }) {
  const [tab, setTab] = useState(0); // 0: Login, 1: Signup
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleTabChange = (event, newValue) => {
    setTab(newValue);
    setError("");
    setSuccess("");
    setEmail("");
    setPassword("");
    setName("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in all required fields.");
      return;
    }
    if (tab === 1 && !name) {
      setError("Please enter your name.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      if (tab === 0) {
        // Login
        const res = await api.post("/api/auth/login", { email, password });
        setSuccess("Login successful! Redirecting...");
        setTimeout(() => {
          onAuthSuccess(res.data.token, res.data.user);
        }, 1000);
      } else {
        // Signup
        const res = await api.post("/api/auth/signup", {
          email,
          password,
          studentName: name,
        });
        setSuccess("Account created successfully! Logging in...");
        setTimeout(() => {
          onAuthSuccess(res.data.token, res.data.user);
        }, 1000);
      }
    } catch (err) {
      setError(extractErrorMessage(err));
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: (theme) => theme.palette.mode === 'dark' 
          ? "radial-gradient(circle at 50% 50%, #030d1a 0%, #010409 100%)"
          : "radial-gradient(circle at 50% 50%, #f8fafc 0%, #e2e8f0 100%)",
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
      <Fade in={true} timeout={800}>
        <Card
          sx={{
            width: "100%",
            maxWidth: 440,
            borderRadius: 1.5,
            backgroundColor: (theme) => theme.palette.mode === 'dark' ? "rgba(10, 25, 41, 0.6)" : "rgba(255, 255, 255, 0.75)",
            backdropFilter: "blur(20px)",
            border: (theme) => `1px solid ${theme.palette.mode === 'dark' ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.08)"}`,
            boxShadow: (theme) => theme.palette.mode === 'dark' ? "0 20px 40px rgba(0, 0, 0, 0.4)" : "0 20px 40px rgba(0, 0, 0, 0.08)",
            overflow: "hidden",
          }}
        >
          <Box
            sx={{
              p: 4,
              pb: 3,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              borderBottom: (theme) => `1px solid ${theme.palette.mode === 'dark' ? "rgba(255, 255, 255, 0.04)" : "rgba(0, 0, 0, 0.06)"}`,
              background: "linear-gradient(180deg, rgba(16, 185, 129, 0.03) 0%, transparent 100%)",
            }}
          >
            <Box
              sx={{
                width: 52,
                height: 52,
                borderRadius: "10px",
                background: "linear-gradient(135deg, #10b981, #06b6d4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 800,
                fontSize: "1.5rem",
                color: "#fff",
                boxShadow: "0 8px 24px rgba(16, 185, 129, 0.25)",
                mb: 2,
              }}
            >
              ES
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: "-0.5px", color: "text.primary", mb: 0.5 }}>
              Welcome to EcoSyn
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", fontWeight: 500 }}>
              AI-Powered Carbon Footprint Awareness & Reduction
            </Typography>
          </Box>

          <Tabs
            value={tab}
            onChange={handleTabChange}
            variant="fullWidth"
            textColor="primary"
            indicatorColor="primary"
            sx={{
              borderBottom: (theme) => `1px solid ${theme.palette.mode === 'dark' ? "rgba(255, 255, 255, 0.04)" : "rgba(0, 0, 0, 0.06)"}`,
              backgroundColor: (theme) => theme.palette.mode === 'dark' ? "rgba(2, 7, 14, 0.2)" : "rgba(0, 0, 0, 0.02)",
              "& .MuiTab-root": {
                fontWeight: 700,
                fontSize: "0.95rem",
                textTransform: "none",
                py: 2,
                color: "text.secondary",
                transition: "color 0.2s ease",
                "&.Mui-selected": {
                  color: "#10b981",
                },
              },
              "& .MuiTabs-indicator": {
                background: "linear-gradient(90deg, #10b981, #06b6d4)",
                height: 3,
                borderRadius: "3px 3px 0 0",
              },
            }}
          >
            <Tab label="Sign In" />
            <Tab label="Create Account" />
          </Tabs>

          <CardContent sx={{ p: 4 }}>
            <form onSubmit={handleSubmit}>
              {error && (
                <Alert severity="error" sx={{ mb: 3, borderRadius: 2, fontWeight: 500 }}>
                  {error}
                </Alert>
              )}
              {success && (
                <Alert severity="success" sx={{ mb: 3, borderRadius: 2, fontWeight: 500 }}>
                  {success}
                </Alert>
              )}

              {tab === 1 && (
                <Fade in={tab === 1}>
                  <Box sx={{ mb: 2.5 }}>
                    <TextField
                      fullWidth
                      label="Student Name"
                      placeholder="Eco Warrior"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      variant="outlined"
                      disabled={loading}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <PersonRoundedIcon sx={{ color: "text.secondary" }} />
                          </InputAdornment>
                        ),
                      }}
                      sx={{
                        "& .MuiOutlinedInput-root": {
                          borderRadius: 2.5,
                          backgroundColor: (theme) => theme.palette.mode === 'dark' ? "rgba(255, 255, 255, 0.02)" : "rgba(0, 0, 0, 0.015)",
                          "&:hover .MuiOutlinedInput-notchedOutline": {
                            borderColor: (theme) => theme.palette.mode === 'dark' ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)",
                          },
                          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                            borderColor: "#10b981",
                          },
                        },
                      }}
                    />
                  </Box>
                </Fade>
              )}

              <Box sx={{ mb: 2.5 }}>
                <TextField
                  fullWidth
                  label="Email Address"
                  type="email"
                  placeholder="name@university.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  variant="outlined"
                  required
                  disabled={loading}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <EmailRoundedIcon sx={{ color: "text.secondary" }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 2.5,
                      backgroundColor: (theme) => theme.palette.mode === 'dark' ? "rgba(255, 255, 255, 0.02)" : "rgba(0, 0, 0, 0.015)",
                      "&:hover .MuiOutlinedInput-notchedOutline": {
                        borderColor: (theme) => theme.palette.mode === 'dark' ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)",
                      },
                      "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                        borderColor: "#10b981",
                      },
                    },
                  }}
                />
              </Box>

              <Box sx={{ mb: 4 }}>
                <TextField
                  fullWidth
                  label="Password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  variant="outlined"
                  required
                  disabled={loading}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockRoundedIcon sx={{ color: "text.secondary" }} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label={showPassword ? "Hide password" : "Show password"}
                          aria-pressed={showPassword}
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                          sx={{ color: "text.secondary" }}
                        >
                          {showPassword ? <VisibilityOffRoundedIcon /> : <VisibilityRoundedIcon />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 2.5,
                      backgroundColor: (theme) => theme.palette.mode === 'dark' ? "rgba(255, 255, 255, 0.02)" : "rgba(0, 0, 0, 0.015)",
                      "&:hover .MuiOutlinedInput-notchedOutline": {
                        borderColor: (theme) => theme.palette.mode === 'dark' ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)",
                      },
                      "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                        borderColor: "#10b981",
                      },
                    },
                  }}
                />
              </Box>

              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={loading}
                sx={{
                  py: 1.6,
                  borderRadius: 2.5,
                  fontWeight: 700,
                  fontSize: "1rem",
                  textTransform: "none",
                  background: "linear-gradient(135deg, #10b981, #06b6d4)",
                  boxShadow: "0 4px 18px rgba(16, 185, 129, 0.25)",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  "&:hover": {
                    background: "linear-gradient(135deg, #059669, #0891b2)",
                    boxShadow: "0 6px 24px rgba(16, 185, 129, 0.35)",
                    transform: "translateY(-1px)",
                  },
                  "&:active": {
                    transform: "translateY(0)",
                  },
                }}
              >
                {loading ? (
                  <CircularProgress size={24} sx={{ color: "#fff" }} />
                ) : tab === 0 ? (
                  "Sign In"
                ) : (
                  "Create Account"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </Fade>
    </Box>
  );
}
