export type StreamQuality = "auto" | "720p" | "1080p" | "max";

interface QualityParams {
  scaleResolutionDownBy: number;
  maxBitrate: number | undefined;
}

// Applied per-viewer on the sharer's RTCRtpSender for that specific peer
// connection, since each viewer gets its own connection (mesh, no SFU) —
// this makes per-viewer quality a real, independent knob rather than a
// shared cap for the whole room.
export function qualityToParams(quality: StreamQuality): QualityParams {
  switch (quality) {
    case "720p":
      return { scaleResolutionDownBy: 1.5, maxBitrate: 2_500_000 };
    case "1080p":
      return { scaleResolutionDownBy: 1, maxBitrate: 4_500_000 };
    case "max":
      return { scaleResolutionDownBy: 1, maxBitrate: 10_000_000 };
    case "auto":
    default:
      return { scaleResolutionDownBy: 1, maxBitrate: undefined };
  }
}
