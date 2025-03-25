// NotificationContainer.tsx
import React, { useEffect, useState } from "react";
import Alert from "./Alert";
import notificationService, { AlertData } from "./NotificationService";

const NotificationContainer: React.FC = () => {
  const [alerts, setAlerts] = useState<AlertData[]>([]);

  useEffect(() => {
    const unsubscribe = notificationService.subscribe((alerts) => {
      setAlerts(alerts);
    });
    return unsubscribe;
  }, []);

  return (
    <div className="fixed bottom-10 left-10 z-[1000]">
      {alerts.map((alert, index) => (
        <div
          key={alert.id}
          style={{ position: "absolute", left: 0, bottom: `${index * 60}px` }}
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
