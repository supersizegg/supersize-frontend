import React, { useEffect, useState } from "react";

type AlertProps = {
  type: "success" | "error";
  message: string;
  onClose: () => void;
  shouldExit?: boolean;
};

const Alert: React.FC<AlertProps> = ({ type, message, onClose, shouldExit }) => {
  console.log("Alert component rendering:", { type, message, shouldExit });
  const [slideClass, setSlideClass] = useState(
    "translate-x-[calc(100%+3em)]"
  );

  useEffect(() => {
    // Add a small delay to ensure the component is mounted before animating
    const timer = setTimeout(() => {
      setSlideClass("translate-x-0");
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (shouldExit) {
      setSlideClass("translate-x-[calc(100%+3em)]");
      const timer = setTimeout(() => onClose(), 350);
      return () => clearTimeout(timer);
    }
  }, [shouldExit, onClose]);

  useEffect(() => {
    if (shouldExit === undefined) {
      const slideOutTimer = setTimeout(
        () => setSlideClass("translate-x-[calc(100%+3em)]"),
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
                  flex justify-center items-center w-[200px] break-words min-h-[50px] box-border z-[9999]
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
