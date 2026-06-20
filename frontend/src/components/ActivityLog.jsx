import { useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Avatar,
  IconButton,
  Grid,
  Alert,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import ElectricBoltRoundedIcon from "@mui/icons-material/ElectricBoltRounded";
import DirectionsCarRoundedIcon from "@mui/icons-material/DirectionsCarRounded";
import RestaurantRoundedIcon from "@mui/icons-material/RestaurantRounded";
import ShoppingBagRoundedIcon from "@mui/icons-material/ShoppingBagRounded";
import Co2RoundedIcon from "@mui/icons-material/Co2Rounded";
import AttachMoneyRoundedIcon from "@mui/icons-material/AttachMoneyRounded";
import { api } from "../api/client";
import { useNotification } from "../context/NotificationContext";

const CATEGORIES = [
  { value: "Electricity", label: "Electricity Usage" },
  { value: "Transport", label: "Transportation" },
  { value: "Food", label: "Food Consumption" },
  { value: "Shopping", label: "Shopping Habits" },
  { value: "Lifestyle", label: "Lifestyle Activities" },
];

const COLORS = {
  Electricity: "#10b981", // Emerald
  Transport: "#06b6d4", // Cyan
  Food: "#f59e0b", // Amber
  Shopping: "#ec4899", // Pink
  Lifestyle: "#6366f1", // Indigo
};

import { useUser } from "../context/UserContext";

export default function ActivityLog() {
  const { showNotification } = useNotification();
  const { activities, fetchActivities } = useUser();
  const [openDialog, setOpenDialog] = useState(false);

  // Form State
  const [category, setCategory] = useState("Transport");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [cost, setCost] = useState("");
  const [carbon, setCarbon] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  const handleOpenDialog = () => {
    setCategory("Transport");
    setDescription("");
    setAmount("");
    setCost("");
    setCarbon("");
    setDate(new Date().toISOString().split("T")[0]);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  // Auto-estimate carbon footprint based on common rules for quick demo entries
  const handleCategoryChange = (e) => {
    const cat = e.target.value;
    setCategory(cat);
    
    // Autofill estimation helpers
    if (cat === "Transport") {
      setDescription("Solo Car Commute");
      setAmount("25 km");
      setCarbon("6.5");
      setCost("8");
    } else if (cat === "Food") {
      setDescription("Beef Burger Dinner");
      setAmount("1 meal");
      setCarbon("5.8");
      setCost("15");
    } else if (cat === "Electricity") {
      setDescription("Smart Home Power Use");
      setAmount("50 kWh");
      setCarbon("18.5");
      setCost("12");
    } else if (cat === "Shopping") {
      setDescription("New Jeans Shopping");
      setAmount("1 item");
      setCarbon("7.2");
      setCost("35");
    } else {
      setDescription("Extended Hot Shower");
      setAmount("30 mins");
      setCarbon("4.5");
      setCost("3");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim() || !category) {
      showNotification("Please enter a description.", "warning");
      return;
    }

    try {
      await api.post("/api/activities/log", {
        category,
        description,
        amount,
        cost: Number(cost) || 0,
        carbon: Number(carbon) || 2.5,
        date,
      });

      showNotification("Activity successfully logged to Carbon Twin! +15 EcoPoints.", "success");
      fetchActivities();
      handleCloseDialog();
    } catch (error) {
      console.error("Failed to log activity", error);
      showNotification("Failed to log activity.", "error");
    }
  };

  const getCategoryIcon = (cat) => {
    switch (cat) {
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
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 1, color: "text.primary" }}>
          Carbon Activity Logs
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Keep track of historical emissions. Add travel, meals, utilities, or clothes shopping records to balance your profile.
        </Typography>
      </Box>

      <Box sx={{ mb: 3, display: "flex", justifyContent: "flex-end" }}>
        <Button
          variant="contained"
          color="primary"
          onClick={handleOpenDialog}
          startIcon={<AddRoundedIcon />}
          sx={{ py: 1.5, px: 2.5 }}
        >
          Log Activity
        </Button>
      </Box>

      {/* Activities Table */}
      <TableContainer
        component={Paper}
        sx={{
          backgroundColor: (theme) => theme.palette.mode === 'dark' ? "rgba(9, 18, 29, 0.65)" : "rgba(255, 255, 255, 0.65)",
          backdropFilter: "blur(10px)",
          borderRadius: 2,
          border: (theme) => `1px solid ${theme.palette.mode === 'dark' ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.06)"}`,
          overflow: "hidden",
        }}
      >
        <Table>
          <TableHead sx={{ backgroundColor: (theme) => theme.palette.mode === 'dark' ? "rgba(255, 255, 255, 0.015)" : "rgba(0, 0, 0, 0.015)" }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, color: "text.secondary" }}>Category</TableCell>
              <TableCell sx={{ fontWeight: 700, color: "text.secondary" }}>Description</TableCell>
              <TableCell sx={{ fontWeight: 700, color: "text.secondary" }}>Quantity / Amount</TableCell>
              <TableCell sx={{ fontWeight: 700, color: "text.secondary" }}>Carbon Footprint</TableCell>
              <TableCell sx={{ fontWeight: 700, color: "text.secondary" }}>Cost</TableCell>
              <TableCell sx={{ fontWeight: 700, color: "text.secondary" }}>Date</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {activities.map((act, index) => (
              <TableRow
                key={act.id || index}
                sx={{
                  "&:hover": { backgroundColor: (theme) => theme.palette.mode === 'dark' ? "rgba(255, 255, 255, 0.01)" : "rgba(0, 0, 0, 0.01)" },
                  borderBottom: (theme) => `1px solid ${theme.palette.mode === 'dark' ? "rgba(255, 255, 255, 0.03)" : "rgba(0, 0, 0, 0.05)"}`,
                }}
              >
                <TableCell sx={{ py: 2 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <Avatar sx={{ bgcolor: (theme) => theme.palette.mode === 'dark' ? "rgba(255, 255, 255, 0.02)" : "rgba(0, 0, 0, 0.03)", width: 36, height: 36 }}>
                      {getCategoryIcon(act.category)}
                    </Avatar>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {act.category}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell sx={{ color: "text.primary", fontWeight: 600 }}>{act.description}</TableCell>
                <TableCell sx={{ color: "text.secondary" }}>{act.amount}</TableCell>
                <TableCell sx={{ color: "error.main", fontWeight: 800 }}>+{act.carbon} kg CO₂</TableCell>
                <TableCell sx={{ color: "warning.main", fontWeight: 700 }}>
                  {act.cost > 0 ? `$${act.cost.toFixed(2)}` : "—"}
                </TableCell>
                <TableCell sx={{ color: "text.secondary" }}>{act.date}</TableCell>
              </TableRow>
            ))}
            {activities.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4, color: "text.secondary" }}>
                  No activities found. Log some custom records to begin.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Manual Entry Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} PaperProps={{ sx: { borderRadius: 2, backgroundColor: "background.paper", maxWidth: 500, width: "100%" } }}>
        <DialogTitle sx={{ fontWeight: 800, color: "text.primary" }}>
          Log Carbon Activity
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent sx={{ py: 1 }}>
            <Grid container spacing={2.5}>
              <Grid item xs={12}>
                <TextField
                  select
                  fullWidth
                  label="Activity Category"
                  value={category}
                  onChange={handleCategoryChange}
                  required
                >
                  {CATEGORIES.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Solo Car Commute, Plant Meal, Utility Bill"
                  required
                />
              </Grid>

              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Quantity / Unit"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 20 km, 1 meal"
                />
              </Grid>

              <Grid item xs={6}>
                <TextField
                  fullWidth
                  type="date"
                  label="Date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  required
                />
              </Grid>

              <Grid item xs={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Estimated Cost ($)"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  placeholder="e.g. 15"
                />
              </Grid>

              <Grid item xs={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Carbon Output (kg CO₂)"
                  value={carbon}
                  onChange={(e) => setCarbon(e.target.value)}
                  placeholder="e.g. 6.5"
                  helperText="Autofilled based on typical indices"
                  required
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button onClick={handleCloseDialog} color="inherit">
              Cancel
            </Button>
            <Button type="submit" variant="contained" color="primary">
              Log Activity
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
