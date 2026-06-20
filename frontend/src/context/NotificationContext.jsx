import { createContext, useContext } from "react";

export const NotificationContext = createContext({
  showNotification: () => {}
});

export const useNotification = () => useContext(NotificationContext);
