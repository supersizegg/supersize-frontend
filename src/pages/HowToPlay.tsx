import React, { useState, useEffect, useRef } from "react";
import { MenuBar } from "@components/menu/MenuBar";
import Footer from "@components/Footer";
import "./HowToPlay.scss";
import { Food } from "@utils/types";
import GameComponent from "@components/Game";
import BN from "bn.js";

type HowToPlayProps = {
  randomFood: Food[];
};

// Component for the animated eyes that follow the mouse across the screen
const EyeSvg: React.FC = () => {
  // Centers of the white parts (sclera) for each eye
  const leftEyeCenter = { x: 38.4, y: 51.2 };
  const rightEyeCenter = { x: 89.6, y: 51.2 };

  // Initial pupil positions (centered within the eyes)
  const [leftPupil, setLeftPupil] = useState({ cx: 46.08, cy: 51.2 });
  const [rightPupil, setRightPupil] = useState({ cx: 97.28, cy: 51.2 });

  // Maximum offset for pupil movement so they remain inside the white
  const maxOffset = 3;

  // Create a ref for the SVG element to calculate its bounding rectangle
  const svgRef = useRef<SVGSVGElement>(null);

  // Calculate new pupil position based on the mouse location and eye center
  const calculatePupilPosition = (
    eyeCenter: { x: number; y: number },
    mouseX: number,
    mouseY: number
  ) => {
    const dx = mouseX - eyeCenter.x;
    const dy = mouseY - eyeCenter.y;
    const angle = Math.atan2(dy, dx);
    return {
      cx: eyeCenter.x + Math.cos(angle) * maxOffset,
      cy: eyeCenter.y + Math.sin(angle) * maxOffset,
    };
  };

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      // Calculate mouse position relative to the svg's coordinate system
      const mouseX = event.clientX - rect.left;
      const mouseY = event.clientY - rect.top;
      setLeftPupil(calculatePupilPosition(leftEyeCenter, mouseX, mouseY));
      setRightPupil(calculatePupilPosition(rightEyeCenter, mouseX, mouseY));
    };

    // Attach the mousemove event listener on the window
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [leftEyeCenter, rightEyeCenter]);

  return (
    <svg
      ref={svgRef}
      width="160"
      height="160"
      viewBox="0 0 128 128"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="64" cy="64" r="64" fill="#1f67e0" />
      {/* Left eye */}
      <circle
        cx={leftEyeCenter.x}
        cy={leftEyeCenter.y}
        r="12.8"
        fill="white"
        stroke="black"
        strokeWidth="2"
      />
      <circle cx={leftPupil.cx} cy={leftPupil.cy} r="5.12" fill="black" />
      {/* Right eye */}
      <circle
        cx={rightEyeCenter.x}
        cy={rightEyeCenter.y}
        r="12.8"
        fill="white"
        stroke="black"
        strokeWidth="2"
      />
      <circle cx={rightPupil.cx} cy={rightPupil.cy} r="5.12" fill="black" />
      <path
        d="M 32 83.2 Q 64 89.6, 96 83.2"
        fill="none"
        stroke="black"
        strokeWidth="2"
      />
    </svg>
  );
};

const HowToPlay: React.FC<HowToPlayProps> = ({ randomFood }) => {
  return (
    <div className="main-container">
      <div
        className="game"
        style={{
          display: "block",
          position: "absolute",
          top: "0",
          left: "0",
          height: "100%",
          width: "100%",
          zIndex: "0",
        }}
      >
        <GameComponent
          players={[]}
          visibleFood={randomFood}
          currentPlayer={{
            name: "unnamed",
            authority: null,
            x: 2000,
            y: 2000,
            radius: 0,
            mass: 0,
            score: 0,
            speed: 0,
            removal: new BN(0),
            target_x: 0,
            target_y: 0,
          }}
          screenSize={{
            width: window.innerWidth,
            height: window.innerHeight,
          }}
          newTarget={{ x: 0, y: 0, boost: false }}
          gameSize={4000}
        />
      </div>
      <MenuBar />

      <div className="how-to-play-container" style={{ position: "relative", zIndex: 1 }}>
        <div className="top-blocks-row">
          <div className="block block1">
            <h2>Join a game</h2>
            <p>
              Every Supersize game has a token and a buy in. Pay to spawn as a blob.
            </p>
          </div>

          <div className="block block2">
            <h2>Boost</h2>
            <p>
              Your blob follows your mouse. You can spend tokens (gold food) to
              boost forward. Use the <b>left click to boost</b>.
            </p>
          </div>
        </div>

        <div className="top-blocks-row row-even">
          <div className="block block1">
            <h2>Eat food</h2>
            <p>
              Food = tokens. Eat food to grow in size and earn tokens. Purple food is 7x thegreen food.
            </p>
          </div>
          <div className="block block2">
            <h2>Eat players</h2>
            <p>Bigger players can eat smaller players to gain their mass and steal their tokens. Bigger players move slower.</p>
          </div>
        </div>
        <div className="top-blocks-row">
          <div className="block block2">
            <h2>Cash out</h2>
            <p>
              Exit the game anytime to cash out your tokens. There is a 5 second delay on exit and a 3% fee on cash out.
            </p>
          </div>
        </div>
      </div>
      <div
        style={{
          position: "fixed",
          bottom: "3em",
          left: "3em",
          display: "flex",
          flexDirection: "row",
        }}
      >
        <EyeSvg />
      </div>
      <Footer />
    </div>
  );
};

export default HowToPlay;
