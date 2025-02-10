import { useEffect, useRef } from "react";

export const useSoundManager = (soundEnabled: boolean) => {
  const backgroundMusicRef = useRef<HTMLAudioElement | null>(null);
  const boostSoundRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!backgroundMusicRef.current) {
      backgroundMusicRef.current = new Audio("/sounds/background-music.wav");
      backgroundMusicRef.current.loop = true;
      backgroundMusicRef.current.volume = 0.5;
    }
    if (soundEnabled) {
      backgroundMusicRef.current.play().catch((err) => console.error("Background music play failed:", err));
    } else {
      backgroundMusicRef.current.pause();
    }
  }, [soundEnabled]);

  useEffect(() => {
    boostSoundRef.current = new Audio("/sounds/boost.mp3");
  }, []);

  const playBoostSound = () => {
    if (soundEnabled && boostSoundRef.current) {
      boostSoundRef.current.currentTime = 0;
      boostSoundRef.current.play().catch((err) => console.error("Boost sound play failed:", err));
    }
  };

  return { playBoostSound };
};
