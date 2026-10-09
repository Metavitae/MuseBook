// "Kithe presents MuseBook": the approved 10 s opening (Chat, v4), played by the
// phone itself so it starts about half a second after the tap while the book
// page loads behind it. Same video and sound as before. Tap anywhere to skip.
// Sound off: plays silent. Calm or reduce-motion: the final emblem as a still
// for 2 s instead.
import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Image, Pressable, StyleSheet } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEventListener } from "expo";

const VIDEO = require("../www/intro/intro.mp4");
const STILL = require("../www/intro/still.webp");
const BLUE = "#0f1d5d";
const WHITE = "#f2f4f4";

export function Intro({ sound, calm, onEnd, onBars }: {
  sound: boolean;
  calm: boolean;
  onEnd: () => void; // starts fading out: the page can go on
  onBars: (bg: string, dark: boolean) => void;
}) {
  const [still, setStill] = useState(calm);
  const [gone, setGone] = useState(false);
  const fade = useRef(new Animated.Value(1)).current;
  const over = useRef(false);

  const player = useVideoPlayer(still ? null : VIDEO, (p) => {
    p.muted = !sound;
    p.play();
  });

  function finish() {
    if (over.current) return;
    over.current = true;
    try { player.pause(); } catch {}
    onEnd();
    Animated.timing(fade, { toValue: 0, duration: 400, useNativeDriver: true }).start(() => setGone(true));
  }

  useEventListener(player, "playToEnd", finish);
  useEventListener(player, "statusChange", ({ status }) => { if (status === "error") finish(); });

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((r) => { if (r && !over.current) setStill(true); }, () => {});
  }, []);

  useEffect(() => {
    if (still) {
      onBars(BLUE, true);
      const t = setTimeout(finish, 2000);
      return () => clearTimeout(t);
    }
    onBars(WHITE, false);
    // The backdrop turns deep blue at about 3.3-4.3 s; the bars follow.
    const blue = setTimeout(() => { if (!over.current) onBars(BLUE, true); }, 3800);
    // Never let a stuck video block writing.
    const stuck = setTimeout(finish, 12000);
    return () => { clearTimeout(blue); clearTimeout(stuck); };
  }, [still]);

  if (gone) return null;
  return (
    <Animated.View style={[StyleSheet.absoluteFill, { opacity: fade, backgroundColor: still ? BLUE : WHITE }]}>
      <StatusBar style={still ? "light" : "dark"} />
      <Pressable style={StyleSheet.absoluteFill} onPress={finish} accessibilityLabel="MuseBook">
        {still ? (
          <Image source={STILL} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <VideoView
            player={player}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            nativeControls={false}
            surfaceType="textureView" // so the fade-out works on Android
            pointerEvents="none"
          />
        )}
      </Pressable>
    </Animated.View>
  );
}
