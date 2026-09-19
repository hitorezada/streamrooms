export type StreamQuality = "auto" | "720p" | "1080p" | "max";

interface QualityParams {
  scaleResolutionDownBy: number;
  maxBitrate: number | undefined;
}

// Applied per-viewer on the sharer's RTCRtpSender for that specific peer
// connection, since each viewer gets its own connection (mesh, no SFU) —
// this makes per-viewer quality a real, independent knob rather than a
// shared cap for the whole room. Capture is already hard-capped at 1080p
// (see useRoomConnection's getDisplayMedia constraints), so these bitrates
// only need to cover up to 1080p60 — 4Mbps was starving 60fps motion content
// and showing up as visible compression/stutter, these are tuned higher.
export function qualityToParams(quality: StreamQuality): QualityParams {
  switch (quality) {
    case "720p":
      return { scaleResolutionDownBy: 1.5, maxBitrate: 3_500_000 };
    case "1080p":
      return { scaleResolutionDownBy: 1, maxBitrate: 8_000_000 };
    case "max":
      return { scaleResolutionDownBy: 1, maxBitrate: 15_000_000 };
    case "auto":
    default:
      return { scaleResolutionDownBy: 1, maxBitrate: 6_000_000 };
  }
}
