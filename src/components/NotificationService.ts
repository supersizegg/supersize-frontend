// notificationService.ts
export type AlertType = "success" | "error";

export interface AlertData {
  id: number;
  type: AlertType;
  message: string;
  // External code can set this flag to trigger the exit animation.
  shouldExit?: boolean;
}

type Listener = (alerts: AlertData[]) => void;

class NotificationService {
  private alerts: AlertData[] = [];
  private listeners: Listener[] = [];

  subscribe(listener: Listener) {
    this.listeners.push(listener);
    // Immediately notify the subscriber with the current alerts.
    listener(this.alerts);
    // Return an unsubscribe function.
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private emit() {
    for (const listener of this.listeners) {
      listener(this.alerts);
    }
  }

  addAlert(alert: Omit<AlertData, "id">): number {
    const id = Date.now(); // A simple unique ID generator.
    const newAlert: AlertData = { ...alert, id };
    this.alerts.push(newAlert);
    this.emit();
    return id;
  }

  updateAlert(id: number, data: Partial<AlertData>) {
    this.alerts = this.alerts.map((alert) =>
      alert.id === id ? { ...alert, ...data } : alert
    );
    this.emit();
  }

  removeAlert(id: number) {
    this.alerts = this.alerts.filter((alert) => alert.id !== id);
    this.emit();
  }

  getAlerts() {
    return this.alerts;
  }
}

export default new NotificationService();
