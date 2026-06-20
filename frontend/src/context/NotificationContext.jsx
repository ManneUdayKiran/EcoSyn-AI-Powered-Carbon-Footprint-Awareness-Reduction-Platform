import { createContext, useContext } from "react";

export const NotificationContext = createContext({
  showNotification: (message, severity = "success") => {}
});

export const useNotification = () => useContext(NotificationContext);
