export type AlertType = "success" | "error";

export interface AlertData {
  id: number;
  type: AlertType;
  message: string;
  shouldExit?: boolean;
  timeout?: number;
}

type Listener = (alerts: AlertData[]) => void;

class NotificationService {
  private alerts: AlertData[] = [];
  private listeners: Listener[] = [];

  subscribe(listener: Listener) {
    this.listeners.push(listener);
    listener([...this.alerts]);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private emit() {
    const alertsCopy = [...this.alerts];
    for (const listener of this.listeners) {
      listener(alertsCopy);
    }
  }

  addAlert(alert: Omit<AlertData, "id">): number {
    const id = Date.now();
    const newAlert: AlertData = { ...alert, id };
    this.alerts = [...this.alerts, newAlert];
    this.emit();
    return id;
  }

  updateAlert(id: number, data: Partial<AlertData>) {
    this.alerts = this.alerts.map((alert) => (alert.id === id ? { ...alert, ...data } : alert));
    this.emit();
  }

  removeAlert(id: number) {
    this.alerts = this.alerts.filter((alert) => alert.id !== id);
    this.emit();
  }

  getAlerts() {
    return [...this.alerts];
  }
}

export default new NotificationService();
