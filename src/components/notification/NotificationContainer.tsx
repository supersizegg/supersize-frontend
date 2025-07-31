// NotificationContainer.tsx
import React, { useEffect, useState } from "react";
import Alert from "./Alert";
import notificationService, { AlertData } from "./NotificationService";

const NotificationContainer: React.FC = () => {
  const [alerts, setAlerts] = useState<AlertData[]>([]);

  useEffect(() => {
    const unsubscribe = notificationService.subscribe((alerts) => {
      console.log("NotificationContainer: Received alerts", alerts);
      setAlerts(alerts);
    });
    return unsubscribe;
  }, []);

  console.log("NotificationContainer: Rendering with alerts:", alerts.length);
  return (
    <div className="fixed bottom-10 right-10 z-[9999]">
      {alerts.map((alert, index) => (
        <div
          key={alert.id}
          style={{ position: "absolute", right: 0, bottom: `${index * 60}px` }}
        >
          <Alert
            type={alert.type}
            message={alert.message}
            shouldExit={alert.shouldExit}
            onClose={() => notificationService.removeAlert(alert.id)}
          />
        </div>
      ))}
    </div>
  );
};

export default NotificationContainer;
