// Alert.tsx
import React, { useEffect, useState } from "react";

type AlertProps = {
  type: "success" | "error";
  message: string;
  // Called when the alert should be removed.
  onClose: () => void;
  // When provided, this triggers an immediate exit.
  shouldExit?: boolean;
};

const Alert: React.FC<AlertProps> = ({ type, message, onClose, shouldExit }) => {
  // Start off-screen with an extra 3em offset.
  const [slideClass, setSlideClass] = useState("-translate-x-[calc(100%+3em)]");

  // Slide in on mount.
  useEffect(() => {
    setSlideClass("translate-x-0");
  }, []);

  // If an external exit condition is set, trigger the slide-out.
  useEffect(() => {
    if (shouldExit) {
      setSlideClass("-translate-x-[calc(100%+3em)]");
      const timer = setTimeout(() => onClose(), 350);
      return () => clearTimeout(timer);
    }
  }, [shouldExit, onClose]);

  // Otherwise, use an auto-timeout to slide out.
  useEffect(() => {
    if (shouldExit === undefined) {
      const slideOutTimer = setTimeout(
        () => setSlideClass("-translate-x-[calc(100%+3em)]"),
        3000
      );
      const removeTimer = setTimeout(() => onClose(), 3500);
      return () => {
        clearTimeout(slideOutTimer);
        clearTimeout(removeTimer);
      };
    }
  }, [shouldExit, onClose]);

  return (
    <div
      className={`p-5 rounded-lg text-center text-sm transition-transform duration-300 ease-in-out 
                  flex justify-center items-center w-[200px] break-words min-h-[50px] box-border z-[1000]
                  ${slideClass}`}
      style={{
        backgroundColor: type === "success" ? "lightgreen" : "pink",
        color: type === "success" ? "green" : "red",
      }}
    >
      {message}
    </div>
  );
};

export default Alert;
