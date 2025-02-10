import { useEffect, useRef } from "react";

export const useSoundManager = () => {
  const backgroundMusicRef = useRef<HTMLAudioElement | null>(null);
  const coinSoundRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    backgroundMusicRef.current = new Audio("/sounds/background-music.wav");
    backgroundMusicRef.current.loop = true;
    backgroundMusicRef.current.volume = 0.5;

    backgroundMusicRef.current.play().catch((err) => console.error("Background music play failed:", err));

    coinSoundRef.current = new Audio("/sounds/retro-coin.mp3");

    return () => {
      if (backgroundMusicRef.current) {
        backgroundMusicRef.current.pause();
        backgroundMusicRef.current.currentTime = 0;
      }
    };
  }, []);

  const playCoinSound = () => {
    if (coinSoundRef.current) {
      coinSoundRef.current.currentTime = 0;
      coinSoundRef.current.play().catch((err) => console.error("Coin sound play failed:", err));
    }
  };

  return { playCoinSound };
};
