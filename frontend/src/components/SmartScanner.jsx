import { useState, useRef } from "react";
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Button,
  Grid,
  CircularProgress,
  Card,
  CardContent,
  Chip,
  List,
  ListItem,
  ListItemText,
  Divider,
  Alert,
  IconButton,
} from "@mui/material";
import CloudUploadRoundedIcon from "@mui/icons-material/CloudUploadRounded";
import DocumentScannerRoundedIcon from "@mui/icons-material/DocumentScannerRounded";
import CameraAltRoundedIcon from "@mui/icons-material/CameraAltRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import HelpOutlineRoundedIcon from "@mui/icons-material/HelpOutlineRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import { api } from "../api/client";
import { useNotification } from "../context/NotificationContext";

export default function SmartScanner() {
  const { showNotification } = useNotification();
  const [activeTab, setActiveTab] = useState(0);
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [visionResult, setVisionResult] = useState(null);
  const fileInputRef = useRef(null);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    resetScanner();
  };

  const resetScanner = () => {
    setFile(null);
    setPreviewUrl(null);
    setScanResult(null);
    setVisionResult(null);
    setScanning(false);
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      // Create preview
      if (selectedFile.type.startsWith("image/")) {
        setPreviewUrl(URL.createObjectURL(selectedFile));
      } else {
        setPreviewUrl(null); // PDF or other
      }
      setScanResult(null);
      setVisionResult(null);
    }
  };

  // Helper to trigger mock files for easy judging
  const triggerMockFile = (name, type) => {
    setFile({ name, size: 45000, type });
    if (type.startsWith("image/")) {
      // Use placeholder green icons or mock representations
      setPreviewUrl("mock-preview");
    } else {
      setPreviewUrl(null);
    }
    setScanResult(null);
    setVisionResult(null);
  };

  const startScan = async () => {
    if (!file) return;

    setScanning(true);
    setScanResult(null);
    setVisionResult(null);

    // Simulated laser sweeping timer (2.5 seconds)
    await new Promise((resolve) => setTimeout(resolve, 2500));

    try {
      const formData = new FormData();
      // In web app, we mock or append the file.
      // Since it's a File object or mock file, append it:
      if (file.name === "electricity_bill.pdf" || file.name === "grocery_receipt.png") {
        // Mock API parameter or append blob
        formData.append("file", new Blob(["mock"], { type: file.type }), file.name);
      } else {
        formData.append("file", file);
      }

      if (activeTab === 0) {
        // Bill / Receipt Scanner
        const res = await api.post("/api/scan", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        setScanResult(res.data);
        showNotification("Receipt successfully categorized & logged to profile! +25 EcoPoints.", "success");
      } else {
        // Vision Assessor
        formData.append("description", "Vision assessed object");
        const res = await api.post("/api/vision", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        setVisionResult(res.data);
        showNotification("Object identified successfully! Added to profile +20 EcoPoints.", "success");
      }
    } catch (error) {
      console.error("Scan error", error);
      showNotification("Scanning failed. Please check the backend connection.", "error");
    } finally {
      setScanning(false);
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 1, color: "text.primary" }}>
          AI Intelligent Scanner
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Upload energy bills, food receipts, or pictures of items. Our carbon engine extracts item-level data, computes offsets, and logs them in real time.
        </Typography>
      </Box>

      <Paper
        sx={{
          background: (theme) => theme.palette.mode === "dark" ? "rgba(9, 18, 29, 0.65)" : "rgba(255, 255, 255, 0.65)",
          backdropFilter: "blur(10px)",
          borderRadius: 2,
          mb: 4,
          overflow: "hidden",
        }}
      >
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
          sx={{ borderBottom: (theme) => `1px solid ${theme.palette.mode === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}` }}
        >
          <Tab
            icon={<DocumentScannerRoundedIcon />}
            iconPosition="start"
            label="Bill & Receipt OCR Scanner"
            sx={{ py: 2, fontWeight: 700 }}
          />
          <Tab
            icon={<CameraAltRoundedIcon />}
            iconPosition="start"
            label="AI Vision Object Assessor"
            sx={{ py: 2, fontWeight: 700 }}
          />
        </Tabs>

        <Box sx={{ p: 4 }}>
          <Grid container spacing={2}>
            {/* Left Upload Column */}
            <Grid item xs={12} md={12} sx={{ display: "flex", flexDirection: "column" }}>
              <Paper
                sx={{
                  backgroundColor: (theme) => theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.015)" : "rgba(0, 0, 0, 0.015)",
                  border: (theme) => `1px solid ${theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.04)" : "rgba(0, 0, 0, 0.05)"}`,
                  borderRadius: 1,
                  p: 3,
                  height: "100%",
                  minHeight: 320,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <Box
                  onClick={() => fileInputRef.current.click()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      fileInputRef.current.click();
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label="Upload file receipt or bill"
                  sx={{
                    border: "2px dashed rgba(16, 185, 129, 0.25)",
                    borderRadius: 1,
                    p: 4,
                    textAlign: "center",
                    cursor: "pointer",
                    backgroundColor: (theme) => theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.01)" : "rgba(0, 0, 0, 0.01)",
                    position: "relative",
                    overflow: "hidden",
                    flexGrow: 1,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                    minHeight: 180,
                    transition: "all 0.2s ease-in-out",
                    "&:hover": {
                      borderColor: "primary.main",
                      backgroundColor: "rgba(16, 185, 129, 0.02)",
                    },
                    "&:focus-visible": {
                      borderColor: "primary.main",
                      outline: "2px solid #10b981",
                      outlineOffset: "2px",
                    },
                  }}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    id="smart-scanner-file-input"
                    aria-label="Choose bill or receipt file to scan"
                    style={{ display: "none" }}
                    onChange={handleFileChange}
                    accept={activeTab === 0 ? "application/pdf,image/*" : "image/*"}
                  />

                  {/* Vertical Laser Scan Animation */}
                  {scanning && (
                    <Box
                      sx={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: 4,
                        backgroundColor: "#10b981",
                        boxShadow: "0 0 12px #10b981, 0 0 24px #10b981",
                        animation: "scanLine 2.5s infinite ease-in-out",
                        zIndex: 2,
                      }}
                    />
                  )}

                  {previewUrl ? (
                    <Box sx={{ position: "relative", height: 180, width: "100%", display: "flex", justifyContent: "center" }}>
                      {previewUrl === "mock-preview" ? (
                        <Box sx={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", width: "100%", height: "100%", bgcolor: "rgba(16, 185, 129, 0.05)", borderRadius: 2 }}>
                          <Typography variant="body2" sx={{ color: "primary.main", fontWeight: 700 }}>
                            [Simulated: {file.name}]
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Ready for AI Extraction
                          </Typography>
                        </Box>
                      ) : (
                        <img
                          src={previewUrl}
                          alt="Preview"
                          style={{ height: "100%", borderRadius: 8, objectFit: "contain" }}
                        />
                      )}
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          resetScanner();
                        }}
                        sx={{ position: "absolute", top: -8, right: -8, backgroundColor: "rgba(0,0,0,0.6)", color: "#fff" }}
                      >
                        <CloseRoundedIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  ) : file ? (
                    <Box sx={{ py: 3 }}>
                      <DocumentScannerRoundedIcon sx={{ fontSize: 48, color: "primary.main", mb: 1 }} />
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {file.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {(file.size / 1024).toFixed(1)} KB • Click to change
                      </Typography>
                    </Box>
                  ) : (
                    <Box sx={{ py: 2 }}>
                      <CloudUploadRoundedIcon sx={{ fontSize: 48, color: "text.secondary", mb: 1 }} />
                      <Typography variant="body1" sx={{ fontWeight: 700, color: "text.primary", mb: 0.5 }}>
                        Drag and drop your file here
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {activeTab === 0 ? "Supports Bills (PDF) or Receipts (PNG/JPG)" : "Supports photos of vehicles, meals, appliances"}
                      </Typography>
                    </Box>
                  )}
                </Box>

                <Box sx={{ mt: 2.5, display: "flex", gap: 2 }}>
                  <Button
                    fullWidth
                    variant="contained"
                    color="primary"
                    onClick={startScan}
                    disabled={!file || scanning}
                    sx={{ py: 1.5 }}
                  >
                    {scanning ? (
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <CircularProgress size={20} color="inherit" />
                        <Typography variant="button">Analyzing via AI...</Typography>
                      </Box>
                    ) : (
                      "Initiate AI Carbon Scan"
                    )}
                  </Button>
                  {file && (
                    <Button variant="outlined" color="inherit" onClick={resetScanner}>
                      Reset
                    </Button>
                  )}
                </Box>

                {/* Hackathon Fast-Track Seeds */}
                <Box sx={{ mt: 3.5 }}>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: "text.secondary", mb: 1 }}>
                    💡 Sample Files for Testing:
                  </Typography>
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                    {activeTab === 0 ? (
                      <>
                        <Chip
                           label="📄 electric_utility_bill.pdf"
                          onClick={() => triggerMockFile("electricity_bill.pdf", "application/pdf")}
                          variant="outlined"
                          color="success"
                          clickable
                        />
                        <Chip
                          label="🛒 grocery_receipt_organic.png"
                          onClick={() => triggerMockFile("grocery_receipt.png", "image/png")}
                          variant="outlined"
                          color="success"
                          clickable
                        />
                      </>
                    ) : (
                      <>
                        <Chip
                          label="🚗 gasoline_suv_vehicle.jpg"
                          onClick={() => triggerMockFile("suv_vehicle.jpg", "image/jpeg")}
                          variant="outlined"
                          color="secondary"
                          clickable
                        />
                        <Chip
                          label="🍔 fast_food_meal.jpg"
                          onClick={() => triggerMockFile("meal.jpg", "image/jpeg")}
                          variant="outlined"
                          color="secondary"
                          clickable
                        />
                        <Chip
                          label="🔌 vintage_refrigerator.jpg"
                          onClick={() => triggerMockFile("refrigerator.jpg", "image/jpeg")}
                          variant="outlined"
                          color="secondary"
                          clickable
                        />
                      </>
                    )}
                  </Box>
                </Box>
              </Paper>
            </Grid>

            {/* Right Result Column */}
            <Grid item xs={12} md={12} sx={{ display: "flex", flexDirection: "column" }}>
              <Paper
                sx={{
                  backgroundColor: (theme) => theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.015)" : "rgba(0, 0, 0, 0.015)",
                  border: (theme) => `1px solid ${theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.04)" : "rgba(0, 0, 0, 0.05)"}`,
                  borderRadius: 1,
                  p: 3,
                  height: "100%",
                  minHeight: 320,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                }}
              >
                {scanning && (
                  <Box sx={{ textAlign: "center", py: 4 }}>
                    <CircularProgress size={40} sx={{ mb: 2 }} />
                    <Typography variant="body2" color="primary.main" sx={{ fontWeight: 700 }}>
                      EcoSyn AI is categorizing items...
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Calculating emissions based on lifecycle carbon databases
                    </Typography>
                  </Box>
                )}

                {!scanning && !scanResult && !visionResult && (
                  <Box sx={{ textAlign: "center", py: 4, color: "text.secondary" }}>
                    <HelpOutlineRoundedIcon sx={{ fontSize: 40, mb: 1, opacity: 0.4 }} />
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      No active scan results.
                    </Typography>
                    <Typography variant="caption">
                      Upload a document or choose a quick-select file to trigger AI footprint analysis.
                    </Typography>
                  </Box>
                )}

                {/* 1. OCR SCAN RESULT */}
                {!scanning && scanResult && (
                  <Box>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                      <Typography variant="h6" sx={{ fontWeight: 800, color: "#10b981" }}>
                        {scanResult.title}
                      </Typography>
                      <Chip label={scanResult.category} size="small" color="primary" sx={{ fontWeight: 700 }} />
                    </Box>

                    <Divider sx={{ my: 1.5, borderColor: (theme) => theme.palette.mode === 'dark' ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }} />

                    <Typography variant="body2" sx={{ fontWeight: 700, mb: 1 }}>
                      Itemized Breakdown
                    </Typography>
                    <List disablePadding sx={{ mb: 2 }}>
                      {scanResult.items.map((item, idx) => (
                        <ListItem key={idx} sx={{ px: 0, py: 0.5 }}>
                          <ListItemText
                            primary={item.name}
                            primaryTypographyProps={{ fontSize: "0.85rem", fontWeight: 600 }}
                            secondary={`Qty: ${item.qty}`}
                            secondaryTypographyProps={{ fontSize: "0.75rem" }}
                          />
                          <Box sx={{ textAlign: "right" }}>
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>
                              ${item.cost.toFixed(2)}
                            </Typography>
                            <Typography variant="caption" color="error.main" sx={{ fontWeight: 700 }}>
                              {item.carbon} kg CO₂
                            </Typography>
                          </Box>
                        </ListItem>
                      ))}
                    </List>

                    <Divider sx={{ my: 1.5, borderColor: (theme) => theme.palette.mode === 'dark' ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }} />

                    <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Total Expense:
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 800 }}>
                          ${scanResult.totalCost.toFixed(2)}
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: "right" }}>
                        <Typography variant="caption" color="text.secondary">
                          Total Footprint:
                        </Typography>
                        <Typography variant="body1" color="error.main" sx={{ fontWeight: 800 }}>
                          {scanResult.totalCarbon} kg CO₂
                        </Typography>
                      </Box>
                    </Box>

                    {scanResult.recommendation && (
                      <Box
                        sx={{
                          p: 2,
                          borderRadius: 2.5,
                          backgroundColor: "rgba(16, 185, 129, 0.05)",
                          border: "1px solid rgba(16, 185, 129, 0.15)",
                        }}
                      >
                        <Typography variant="body2" sx={{ fontWeight: 800, color: "primary.main", mb: 0.5 }}>
                          🌱 Coach Recommendation Generated:
                        </Typography>
                        <Typography variant="caption" sx={{ fontWeight: 700, display: "block", color: "text.primary", mb: 0.5 }}>
                          {scanResult.recommendation.title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
                          {scanResult.recommendation.description}
                        </Typography>
                        <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                          <Chip label={`-${scanResult.recommendation.co2Reduction}kg CO2`} size="small" color="primary" sx={{ height: 18, fontSize: "0.65rem", fontWeight: 700 }} />
                          <Chip label={`+$${scanResult.recommendation.costSavings}`} size="small" color="warning" sx={{ height: 18, fontSize: "0.65rem", fontWeight: 700 }} />
                          <Chip label={`+${scanResult.recommendation.points} Pts`} size="small" color="secondary" sx={{ height: 18, fontSize: "0.65rem", fontWeight: 700 }} />
                        </Box>
                      </Box>
                    )}
                  </Box>
                )}

                {/* 2. VISION ASSESS RESULT */}
                {!scanning && visionResult && (
                  <Box>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0 }}>
                      <Typography variant="h4" sx={{ fontWeight: 800, color: "primary.main" }}>
                        {visionResult.objectName}
                      </Typography>
                      <Chip label={visionResult.category} size="small" color="primary" sx={{ fontWeight: 700 }} />
                    </Box>

                    <Divider sx={{ my: 1.5, borderColor: (theme) => theme.palette.mode === 'dark' ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }} />

                    <Grid container spacing={2} sx={{ mb: 2.5 }}>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                          Lifecycle Emissions:
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 800, color: "error.main" }}>
                          {visionResult.carbonFootprint.value} {visionResult.carbonFootprint.unit}
                        </Typography>
                        <Chip
                          label={`${visionResult.carbonFootprint.rating} Carbon`}
                          size="small"
                          color={visionResult.carbonFootprint.rating === "High" ? "error" : "success"}
                          sx={{ height: 18, fontSize: "0.65rem", mt: 0.5, fontWeight: 700 }}
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                          Energy Efficiency:
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          Rating: {visionResult.energyEfficiency.rating}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {visionResult.energyEfficiency.details}
                        </Typography>
                      </Grid>
                    </Grid>

                    <Typography variant="body2" sx={{ fontWeight: 700, mb: 1 }}>
                      Sustainable Alternatives Identified:
                    </Typography>
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                      {visionResult.alternatives.map((alt, idx) => (
                        <Box
                          key={idx}
                          sx={{
                            p: 2,
                            borderRadius: 2.5,
                            backgroundColor: (theme) => theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.015)" : "rgba(0, 0, 0, 0.015)",
                            border: (theme) => `1px solid ${theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.04)" : "rgba(0, 0, 0, 0.05)"}`,
                          }}
                        >
                          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                            <Typography variant="caption" sx={{ fontWeight: 800, color: "primary.main" }}>
                              {alt.name}
                            </Typography>
                            <Typography variant="caption" color="success.main" sx={{ fontWeight: 800 }}>
                              Save: {alt.carbonSavings}kg / ${alt.costSavings}
                            </Typography>
                          </Box>
                          <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                            {alt.description}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                )}
              </Paper>
            </Grid>
          </Grid>
        </Box>
      </Paper>

      {/* Embedded CSS Animations for Scanner Sweep */}
      <style>{`
        @keyframes scanLine {
          0% {
            top: 0%;
          }
          50% {
            top: 100%;
          }
          100% {
            top: 0%;
          }
        }
      `}</style>

    </Box>
  );
}
