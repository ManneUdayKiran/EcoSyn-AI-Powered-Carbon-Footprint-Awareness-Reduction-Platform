import { useEffect, useRef, useState } from "react";
import {
  Box,
  TextField,
  Button,
  Paper,
  Typography,
  Stack,
  CircularProgress,
  IconButton,
  Tooltip,
  Alert,
  Chip,
  Grid,
  Card,
  CardContent,
  Divider,
} from "@mui/material";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import GraphicEqRoundedIcon from "@mui/icons-material/GraphicEqRounded";
import VolumeUpRoundedIcon from "@mui/icons-material/VolumeUpRounded";
import DoneAllRoundedIcon from "@mui/icons-material/DoneAllRounded";
import ElectricBoltRoundedIcon from "@mui/icons-material/ElectricBoltRounded";
import DirectionsCarRoundedIcon from "@mui/icons-material/DirectionsCarRounded";
import { useNotification } from "../context/NotificationContext";
import RestaurantRoundedIcon from "@mui/icons-material/RestaurantRounded";
import ShoppingBagRoundedIcon from "@mui/icons-material/ShoppingBagRounded";
import Co2RoundedIcon from "@mui/icons-material/Co2Rounded";
import AttachMoneyRoundedIcon from "@mui/icons-material/AttachMoneyRounded";
import { api, extractErrorMessage } from "../api/client";

const initialMessage = {
  role: "assistant",
  content:
    "Hi there! I am your AI Sustainability Coach. Ask me how to reduce your energy bill, find green meal alternatives, or plan sustainable commutes!",
};

const QUICK_PROMPTS = [
  "How can I reduce my electric bill?",
  "Suggest a meatless lunch recipe",
  "How much carbon does a short flight produce?",
  "Tips for zero-waste grocery shopping",
];

const COLORS = {
  Electricity: "#10b981",
  Transport: "#06b6d4",
  Food: "#f59e0b",
  Shopping: "#ec4899",
  Lifestyle: "#6366f1",
};

export default function AICoach() {
  const { showNotification } = useNotification();
  const [messages, setMessages] = useState([initialMessage]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  
  const [recommendations, setRecommendations] = useState([]);
  const [acceptedIds, setAcceptedIds] = useState([]);
  const bottomRef = useRef(null);
  const recognitionRef = useRef(null);

  const fetchCoachData = async () => {
    try {
      const recsRes = await api.get("/api/recommendations");
      setRecommendations(recsRes.data);
      const profRes = await api.get("/api/profile");
      setAcceptedIds(profRes.data.acceptedRecommendations || []);
    } catch (e) {
      console.error("Error loading coach state", e);
    }
  };

  useEffect(() => {
    fetchCoachData();
    const interval = setInterval(fetchCoachData, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput((prev) => `${prev ? `${prev} ` : ""}${transcript}`);
      setListening(false);
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sanitizedHistory = messages
    .filter((item) => item.role !== "system")
    .map(({ role, content }) => ({ role, content }));

  const handleSend = async (messageText = input) => {
    const textToSend = messageText.trim();
    if (!textToSend || loading) return;

    const newMessages = [...messages, { role: "user", content: textToSend }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const { data } = await api.post("/api/coach/chat", {
        message: textToSend,
        history: sanitizedHistory,
      });
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply },
      ]);
    } catch (error) {
      showNotification(extractErrorMessage(error), "error");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickPrompt = (promptText) => {
    handleSend(promptText);
  };

  const handleAcceptRecommendation = async (recId) => {
    try {
      const res = await api.post("/api/profile/accept-recommendation", {
        recommendationId: recId,
      });
      setAcceptedIds(res.data.profile.acceptedRecommendations || []);
      showNotification("Recommendation Accepted! Footprint updated & EcoPoints awarded.", "success");
    } catch (error) {
      console.error("Failed to accept recommendation", error);
      showNotification("Failed to accept recommendation.", "error");
    }
  };

  const toggleListening = () => {
    if (!recognitionRef.current) {
      showNotification("Speech recognition not supported in this browser.", "info");
      return;
    }
    if (listening) {
      recognitionRef.current.stop();
      setListening(false);
    } else {
      recognitionRef.current.start();
      setListening(true);
    }
  };

  const speak = (text) => {
    if (!window.speechSynthesis) {
      showNotification("Text-to-speech not supported.", "info");
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
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
      <Grid container spacing={3} >
        {/* Left Column: Chat Assistant */}
        <Grid item xs={12} md={7}>
          <Paper
            sx={{
              p: 3,
              height: "calc(100vh - 180px)",
              minHeight: "580px",
              display: "flex",
              flexDirection: "column",
              borderRadius: 2,
              backgroundColor: (theme) => theme.palette.mode === 'dark' ? "rgba(9, 18, 29, 0.65)" : "rgba(255, 255, 255, 0.65)",
              backdropFilter: "blur(10px)",
              border: (theme) => `1px solid ${theme.palette.mode === 'dark' ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
              width:"78vw",
              minWidth: "400px",
            }}
          >
            <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
              <Typography variant="h5" sx={{ fontWeight: 800 }}>
                Green Coach Console
              </Typography>
              <Chip
                label="AI Advisor"
                size="small"
                color="primary"
                variant="outlined"
                sx={{ fontWeight: 700 }}
              />
            </Stack>

            {/* Quick Prompts List */}
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 2 }}>
              {QUICK_PROMPTS.map((prompt) => (
                <Chip
                  key={prompt}
                  label={prompt}
                  onClick={() => handleQuickPrompt(prompt)}
                  size="small"
                  variant="outlined"
                  sx={{
                    fontSize: "0.75rem",
                    borderColor: (theme) => theme.palette.mode === 'dark' ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.08)",
                    color: "text.secondary",
                    "&:hover": {
                      borderColor: "primary.main",
                      color: "primary.main",
                      backgroundColor: "rgba(16, 185, 129, 0.03)",
                    },
                  }}
                  clickable
                />
              ))}
            </Box>

            {/* Message Pane */}
            <Box
              sx={{
                flexGrow: 1,
                overflowY: "auto",
                pr: 1,
                mb: 2,
              }}
            >
              {messages.map((msg, idx) => (
                <Stack
                  key={`${msg.role}-${idx}`}
                  alignItems={msg.role === "user" ? "flex-end" : "flex-start"}
                  sx={{ mb: 2 }}
                >
                  <Box
                    sx={{
                      px: 2,
                      py: 1.5,
                      borderRadius: 1,
                      maxWidth: "80%",
                      backgroundColor: (theme) =>
                        msg.role === "user"
                          ? "rgba(16, 185, 129, 0.15)"
                          : (theme.palette.mode === 'dark' ? "rgba(255, 255, 255, 0.025)" : "rgba(0, 0, 0, 0.02)"),
                      border: (theme) =>
                        msg.role === "user"
                          ? "1px solid rgba(16, 185, 129, 0.25)"
                          : (theme.palette.mode === 'dark' ? "1px solid rgba(255, 255, 255, 0.05)" : "1px solid rgba(0, 0, 0, 0.06)"),
                    }}
                  >
                    <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", color: "text.primary" }}>
                      {msg.content}
                    </Typography>
                  </Box>
                  {msg.role === "assistant" && (
                    <Box sx={{ display: "flex", gap: 1, mt: 0.5 }}>
                      <Tooltip title="Listen voice speech">
                        <IconButton size="small" onClick={() => speak(msg.content)} sx={{ color: "text.secondary" }}>
                          <VolumeUpRoundedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  )}
                </Stack>
              ))}
              <div ref={bottomRef} />
            </Box>

            {/* Chat Input */}
            <Stack direction="row" spacing={1.5} alignItems="center">
              <TextField
                fullWidth
                variant="outlined"
                placeholder="Ask about green habits..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 1,
                    backgroundColor: (theme) => theme.palette.mode === 'dark' ? "rgba(255,255,255,0.01)" : "rgba(0,0,0,0.015)",
                  },
                }}
              />
              <Stack direction="row" spacing={1}>
                <Tooltip title={listening ? "Stop microphone" : "Voice speech input"}>
                  <Button
                    variant={listening ? "contained" : "outlined"}
                    color="secondary"
                    onClick={toggleListening}
                    sx={{ minWidth: 48, width: 48, height: 48, borderRadius: 1, p: 0 }}
                  >
                    <GraphicEqRoundedIcon />
                  </Button>
                </Tooltip>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => handleSend()}
                  disabled={loading}
                  sx={{ height: 48, borderRadius: 1, px: 3 }}
                >
                  {loading ? <CircularProgress size={20} color="inherit" /> : <SendRoundedIcon />}
                </Button>
              </Stack>
            </Stack>
          </Paper>
        </Grid>

        {/* Right Column: Recommendations List */}
        <Grid item xs={12} md={5}>
          <Paper
            sx={{
              p: 3,
              height: "calc(100vh - 180px)",
              minHeight: "580px",
              display: "flex",
              flexDirection: "column",
              borderRadius: 2,
              backgroundColor: (theme) => theme.palette.mode === 'dark' ? "rgba(9, 18, 29, 0.65)" : "rgba(255, 255, 255, 0.65)",
              backdropFilter: "blur(10px)",
              border: (theme) => `1px solid ${theme.palette.mode === 'dark' ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5 }}>
              AI Recommendations
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 2.5, display: "block" }}>
              Tailored green tips based on your logged carbon footprint
            </Typography>

            <Box sx={{ flexGrow: 1, overflowY: "auto", pr: 1 }}>
              <Stack spacing={2}>
                {recommendations.map((rec) => {
                  const isAccepted = acceptedIds.includes(rec.id);
                  return (
                    <Card
                      key={rec.id}
                      sx={{
                        backgroundColor: (theme) => isAccepted ? "rgba(16, 185, 129, 0.03)" : (theme.palette.mode === 'dark' ? "rgba(255, 255, 255, 0.01)" : "rgba(0, 0, 0, 0.01)"),
                        border: (theme) => isAccepted
                          ? "1px solid rgba(16, 185, 129, 0.2)"
                          : (theme.palette.mode === 'dark' ? "1px solid rgba(255, 255, 255, 0.04)" : "1px solid rgba(0, 0, 0, 0.05)"),
                        borderRadius: 1,
                        transition: "all 0.2s ease-in-out",
                        "&:hover": {
                          borderColor: (theme) => isAccepted ? "rgba(16, 185, 129, 0.3)" : "rgba(16, 185, 129, 0.15)",
                        },
                      }}
                    >
                      <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1.5 }}>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            {getCategoryIcon(rec.category)}
                            <Typography variant="body2" sx={{ fontWeight: 800, color: "text.primary" }}>
                              {rec.title}
                            </Typography>
                          </Box>
                          <Chip
                            label={rec.difficulty}
                            size="small"
                            color={rec.difficulty === "Easy" ? "success" : "warning"}
                            sx={{ height: 18, fontSize: "0.65rem", fontWeight: 700 }}
                          />
                        </Box>

                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
                          {rec.description}
                        </Typography>

                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <Box sx={{ display: "flex", gap: 1 }}>
                            <Chip
                              icon={<Co2RoundedIcon sx={{ fontSize: "14px !important" }} />}
                              label={`-${rec.co2Reduction} kg`}
                              size="small"
                              color="primary"
                              variant="outlined"
                              sx={{ height: 20, fontSize: "0.7rem", fontWeight: 700 }}
                            />
                            <Chip
                              icon={<AttachMoneyRoundedIcon sx={{ fontSize: "14px !important" }} />}
                              label={`$${rec.costSavings}`}
                              size="small"
                              color="warning"
                              variant="outlined"
                              sx={{ height: 20, fontSize: "0.7rem", fontWeight: 700 }}
                            />
                          </Box>

                          {isAccepted ? (
                            <Chip
                              icon={<DoneAllRoundedIcon sx={{ fontSize: "14px !important" }} />}
                              label="Accepted"
                              size="small"
                              color="success"
                              sx={{ height: 24, fontWeight: 700 }}
                            />
                          ) : (
                            <Button
                              variant="outlined"
                              color="primary"
                              size="small"
                              onClick={() => handleAcceptRecommendation(rec.id)}
                              sx={{ py: 0.25, fontSize: "0.75rem", borderRadius: 2 }}
                            >
                              Accept (+{rec.points} pts)
                            </Button>
                          )}
                        </Box>
                      </CardContent>
                    </Card>
                  );
                })}
                {recommendations.length === 0 && (
                  <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 3 }}>
                    AI Recommendations appear after scan operations.
                  </Typography>
                )}
              </Stack>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
