import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { api, API_BASE_URL } from "../api/client";
import { useNotification } from "./NotificationContext";

export const UserContext = createContext(null);

export const useUser = () => useContext(UserContext);

export const UserProvider = ({ children, token, handleLogout }) => {
  const { showNotification } = useNotification();
  const [profile, setProfile] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    if (!token) return;
    try {
      const res = await api.get("/api/profile");
      setProfile(res.data);
    } catch (error) {
      console.error("Error loading profile", error);
      if (error.response?.status === 401) {
        handleLogout();
      }
    } finally {
      setLoading(false);
    }
  }, [token, handleLogout]);

  const fetchActivities = useCallback(async () => {
    if (!token) return;
    try {
      const res = await api.get("/api/activities");
      setActivities(res.data);
    } catch (error) {
      console.error("Error loading activities", error);
    }
  }, [token]);

  // Initial load
  useEffect(() => {
    if (!token) {
      setProfile(null);
      setActivities([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    Promise.all([fetchProfile(), fetchActivities()]).finally(() => {
      setLoading(false);
    });

    // Refetch when tab gains focus to keep stats fresh with ZERO continuous polling
    const handleFocus = () => {
      fetchProfile();
      fetchActivities();
    };
    window.addEventListener("focus", handleFocus);

    // Single central slow 30-second poll fallback
    const interval = setInterval(() => {
      fetchProfile();
      fetchActivities();
    }, 30000);

    return () => {
      window.removeEventListener("focus", handleFocus);
      clearInterval(interval);
    };
  }, [token, fetchProfile, fetchActivities]);

  // EventSource SSE stream listener centralized here
  useEffect(() => {
    if (!token) return undefined;
    if (!window.EventSource) return undefined;

    const streamUrl = `${API_BASE_URL.replace(/\/$/, "")}/api/events?token=${encodeURIComponent(token)}`;
    const stream = new EventSource(streamUrl);

    stream.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "connected") return;

        const currentUserId = localStorage.getItem("ecosyn_userId");
        if (data.payload?.userId && data.payload.userId !== currentUserId) {
          return;
        }

        if (data.payload?.profile) {
          setProfile(data.payload.profile);
        } else {
          fetchProfile();
        }

        if (data.payload?.activity) {
          // Instantly inject new activity log into local array to prevent visual lag
          setActivities((prev) => {
            const exists = prev.some(act => act.id === data.payload.activity.id);
            if (exists) return prev;
            return [data.payload.activity, ...prev].slice(0, 50);
          });
        } else {
          fetchActivities();
        }

        if (data.payload?.message) {
          const sev = data.type.includes("reset") ? "info" : "success";
          showNotification(data.payload.message, sev);
        }
      } catch (error) {
        console.error("Realtime event parsing failed", error);
      }
    };

    stream.onerror = () => {
      stream.close();
    };

    return () => stream.close();
  }, [token, fetchProfile, fetchActivities, showNotification]);

  return (
    <UserContext.Provider
      value={{
        profile,
        setProfile,
        activities,
        setActivities,
        loading,
        fetchProfile,
        fetchActivities,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};
