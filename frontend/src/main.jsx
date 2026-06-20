import { StrictMode, createContext, useMemo, useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";
import App from "./App.jsx";
import "./index.css";

// Create context for light/dark mode toggler
export const ColorModeContext = createContext({ toggleColorMode: () => {} });

function Main() {
  const [mode, setMode] = useState(() => {
    return localStorage.getItem("ecosyn_theme_mode") || "dark";
  });

  useEffect(() => {
    document.body.setAttribute("data-theme", mode);
  }, [mode]);

  const colorMode = useMemo(
    () => ({
      toggleColorMode: () => {
        setMode((prevMode) => {
          const nextMode = prevMode === "light" ? "dark" : "light";
          localStorage.setItem("ecosyn_theme_mode", nextMode);
          return nextMode;
        });
      },
    }),
    []
  );

  const theme = useMemo(() => {
    const isDark = mode === "dark";
    return createTheme({
      palette: {
        mode,
        primary: { main: "#10b981" }, // Emerald Green
        secondary: { main: "#06b6d4" }, // Cyan/Teal
        warning: { main: "#f59e0b" }, // Amber
        error: { main: "#ef4444" }, // Rose Red
        background: {
          default: isDark ? "#02070e" : "#f8fafc", // obsidian vs soft light grey
          paper: isDark ? "#09121d" : "#ffffff", // slate-900 vs white
        },
        text: {
          primary: isDark ? "#f8fafc" : "#0f172a", // slate-50 vs slate-900
          secondary: isDark ? "#94a3b8" : "#475569", // slate-400 vs slate-600
        },
      },
      typography: {
        fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
        h4: { fontWeight: 700 },
        h6: { fontWeight: 600 },
      },
      shape: {
        borderRadius: 8,
      },
      components: {
        MuiButton: {
          styleOverrides: {
            root: {
              borderRadius: 2,
              textTransform: "none",
              fontWeight: 600,
            },
          },
        },
        MuiPaper: {
          styleOverrides: {
            root: {
              backgroundImage: "none",
              border: isDark ? "1px solid rgba(255, 255, 255, 0.05)" : "1px solid rgba(0, 0, 0, 0.06)",
              boxShadow: isDark ? "none" : "0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.05)",
            },
          },
        },
      },
    });
  }, [mode]);

  return (
    <ColorModeContext.Provider value={colorMode}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <App />
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Main />
  </StrictMode>
);
