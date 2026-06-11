import { useEffect, useState } from "react";
import {
  GestureResponderEvent,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { IconButton, Text, useTheme } from "react-native-paper";

const BUCKETS = 200;

type WaveformData = {
  peaks: number[];
  duration: number;
};

/** Decodes the audio on web via the Web Audio API; returns null elsewhere. */
async function loadWaveform(url: string): Promise<WaveformData | null> {
  if (Platform.OS !== "web" || typeof AudioContext === "undefined") {
    return null;
  }
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const ctx = new AudioContext();
  try {
    const audio = await ctx.decodeAudioData(arrayBuffer);
    const data = audio.getChannelData(0);
    const perBucket = Math.max(1, Math.floor(data.length / BUCKETS));
    const stride = Math.max(1, Math.floor(perBucket / 64));
    const peaks: number[] = [];
    for (let b = 0; b < BUCKETS; b++) {
      let max = 0;
      const start = b * perBucket;
      for (
        let i = start;
        i < start + perBucket && i < data.length;
        i += stride
      ) {
        const v = Math.abs(data[i]);
        if (v > max) max = v;
      }
      peaks.push(max);
    }
    return { peaks, duration: audio.duration };
  } finally {
    void ctx.close();
  }
}

type WaveformCutEditorProps = {
  /** Playable URL of the full clip. */
  url: string;
  cutPoints: number[];
  onChange: (cutPoints: number[]) => void;
};

/**
 * Waveform with draggable-by-tap cut markers: tapping the waveform moves the
 * nearest cut point to the tapped position. Fine-tuning nudge buttons are
 * rendered per cut point below the waveform.
 */
export function WaveformCutEditor({
  url,
  cutPoints,
  onChange,
}: WaveformCutEditorProps) {
  const theme = useTheme();
  const [waveform, setWaveform] = useState<WaveformData | null>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setWaveform(null);
    loadWaveform(url)
      .then((data) => {
        if (!cancelled) setWaveform(data);
      })
      .catch(() => {
        if (!cancelled) setWaveform(null);
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

  const duration = waveform?.duration ?? null;

  const handlePress = (e: GestureResponderEvent) => {
    if (!duration || width === 0 || cutPoints.length === 0) return;
    const x = e.nativeEvent.locationX;
    const time = Math.min(duration, Math.max(0, (x / width) * duration));
    let nearest = 0;
    for (let i = 1; i < cutPoints.length; i++) {
      if (Math.abs(cutPoints[i] - time) < Math.abs(cutPoints[nearest] - time)) {
        nearest = i;
      }
    }
    moveCut(nearest, time);
  };

  const moveCut = (index: number, time: number) => {
    const next = [...cutPoints];
    const min = index > 0 ? next[index - 1] + 0.05 : 0.05;
    const max =
      index < next.length - 1
        ? next[index + 1] - 0.05
        : (duration ?? Number.MAX_SAFE_INTEGER) - 0.05;
    next[index] = Math.round(Math.min(max, Math.max(min, time)) * 100) / 100;
    onChange(next);
  };

  return (
    <View>
      {waveform ? (
        <Pressable
          onPress={handlePress}
          onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
          style={[
            styles.waveform,
            { backgroundColor: theme.colors.surfaceVariant },
          ]}
        >
          <View style={styles.bars}>
            {waveform.peaks.map((peak, i) => (
              <View
                key={i}
                style={{
                  flex: 1,
                  height: Math.max(2, peak * 72),
                  backgroundColor: theme.colors.primary,
                  opacity: 0.7,
                }}
              />
            ))}
          </View>
          {duration != null &&
            width > 0 &&
            cutPoints.map((t, i) => (
              <View
                key={i}
                pointerEvents="none"
                style={[
                  styles.marker,
                  {
                    left: (t / duration) * width - 1,
                    backgroundColor: theme.colors.error,
                  },
                ]}
              />
            ))}
        </Pressable>
      ) : (
        <Text
          variant="bodySmall"
          style={{ color: theme.colors.onSurfaceVariant }}
        >
          Waveform preview is unavailable here — adjust the cut points with the
          buttons below.
        </Text>
      )}
      {waveform && (
        <Text
          variant="labelSmall"
          style={{ color: theme.colors.onSurfaceVariant }}
        >
          Tap the waveform to move the nearest cut point. Total{" "}
          {waveform.duration.toFixed(1)}s.
        </Text>
      )}

      <View style={styles.cutList}>
        {cutPoints.map((t, i) => (
          <View key={i} style={styles.cutRow}>
            <Text variant="bodySmall" style={styles.cutLabel}>
              Cut {i + 1}: {t.toFixed(2)}s
            </Text>
            <IconButton
              icon="rewind"
              size={16}
              onPress={() => moveCut(i, t - 0.5)}
              accessibilityLabel={`Cut ${i + 1} back 0.5s`}
            />
            <IconButton
              icon="step-backward"
              size={16}
              onPress={() => moveCut(i, t - 0.1)}
              accessibilityLabel={`Cut ${i + 1} back 0.1s`}
            />
            <IconButton
              icon="step-forward"
              size={16}
              onPress={() => moveCut(i, t + 0.1)}
              accessibilityLabel={`Cut ${i + 1} forward 0.1s`}
            />
            <IconButton
              icon="fast-forward"
              size={16}
              onPress={() => moveCut(i, t + 0.5)}
              accessibilityLabel={`Cut ${i + 1} forward 0.5s`}
            />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  waveform: {
    height: 80,
    borderRadius: 8,
    overflow: "hidden",
    justifyContent: "center",
    marginBottom: 4,
  },
  bars: {
    flexDirection: "row",
    alignItems: "center",
    height: "100%",
    gap: 1,
    paddingHorizontal: 2,
  },
  marker: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 2,
  },
  cutList: {
    marginTop: 8,
  },
  cutRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  cutLabel: {
    width: 110,
  },
});
