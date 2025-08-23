import React from "react";
import "./AnimatedBackground.scss";

const random = (min: number, max: number) => Math.random() * (max - min) + min;

const AnimatedBackground: React.FC = () => {
  const bubbles = Array.from({ length: 15 });

  return (
    <div className="animated-background">
      {bubbles.map((_, index) => {
        const size = random(20, 120);
        const style = {
          top: `${random(0, 100)}%`,
          left: `${random(0, 100)}%`,
          width: `${size}px`,
          height: `${size}px`,
          animationDuration: `${random(15, 30)}s`,
          animationDelay: `${random(0, 10)}s`,
        };
        return <div key={index} className="bubble" style={style} />;
      })}
    </div>
  );
};

export default AnimatedBackground;
