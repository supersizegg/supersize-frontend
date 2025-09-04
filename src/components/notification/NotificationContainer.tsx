import React, { useEffect, useState } from "react";
import Alert from "./Alert";
import notificationService, { AlertData } from "./NotificationService";
import "./Notification.scss";

const NotificationContainer: React.FC = () => {
  const [alerts, setAlerts] = useState<AlertData[]>([]);

  useEffect(() => {
    const unsubscribe = notificationService.subscribe((next) => setAlerts(next));
    return unsubscribe;
  }, []);

  return (
    <div className="notification-container" aria-live="polite" aria-atomic="true">
      {alerts.map((alert) => (
        <Alert
          key={alert.id}
          type={alert.type}
          message={alert.message}
          shouldExit={alert.shouldExit}
          onClose={() => notificationService.removeAlert(alert.id)}
        />
      ))}
    </div>
  );
};

export default NotificationContainer;
