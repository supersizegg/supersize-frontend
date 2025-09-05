import { useEffect, useRef } from "react";

const TRACKS = ["/sounds/bg01.mp3", "/sounds/bg02.mp3", "/sounds/bg03.mp3"];
const VOLUME = 0.15;

export const useSoundManager = (soundEnabled: boolean) => {
  const currentTrackRef = useRef<HTMLAudioElement | null>(null);
  const boostSoundRef = useRef<HTMLAudioElement | null>(null);
  const trackIndexRef = useRef(0);

  useEffect(() => {
    if (!boostSoundRef.current) {
      boostSoundRef.current = new Audio("/sounds/boost.mp3");
    }
  }, []);

  useEffect(() => {
    if (!soundEnabled) {
      currentTrackRef.current?.pause();
      return;
    }

    const track = new Audio(TRACKS[trackIndexRef.current]);
    track.loop = false;
    track.volume = VOLUME;

    track.onended = () => {
      trackIndexRef.current = (trackIndexRef.current + 1) % TRACKS.length;
      const nextTrack = new Audio(TRACKS[trackIndexRef.current]);
      nextTrack.loop = false;
      nextTrack.volume = VOLUME;
      currentTrackRef.current = nextTrack;
      nextTrack.play().catch((err) => console.error("Next track play failed:", err));
      nextTrack.onended = track.onended;
    };

    currentTrackRef.current = track;
    track.play().catch((err) => console.error("Background music play failed:", err));

    return () => {
      track.pause();
      track.onended = null;
    };
  }, [soundEnabled]);

  const playBoostSound = () => {
    if (soundEnabled && boostSoundRef.current) {
      boostSoundRef.current.currentTime = 0;
      boostSoundRef.current.play().catch((err) => console.error("Boost sound play failed:", err));
    }
  };

  return { playBoostSound };
};
