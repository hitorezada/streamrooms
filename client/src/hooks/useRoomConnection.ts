import { useCallback, useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import { api } from "../api/client";
import type { IceServerConfig, Participant } from "../types";
import { qualityToParams, type StreamQuality } from "./quality";
import { useSocket } from "./useSocket";

export interface UseRoomConnectionResult {
  connected: boolean;
  participants: Participant[];
  mySocketId: string | null;
  isSharing: boolean;
  localStream: MediaStream | null;
  startSharing: (opts: { withAudio: boolean; frameRate?: number }) => Promise<void>;
  stopSharing: () => void;
  watchedStreams: Map<string, MediaStream>;
  watch: (sharerSocketId: string) => void;
  stopWatching: (sharerSocketId: string) => void;
  setQuality: (sharerSocketId: string, quality: StreamQuality) => void;
  currentQuality: Map<string, StreamQuality>;
}

export function useRoomConnection(roomId: string | undefined): UseRoomConnectionResult {
  const enabled = Boolean(roomId);
  const { socket: socketRef, connected } = useSocket(enabled);

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [mySocketId, setMySocketId] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [watchedStreams, setWatchedStreams] = useState<Map<string, MediaStream>>(new Map());
  const [currentQuality, setCurrentQuality] = useState<Map<string, StreamQuality>>(new Map());

  const iceServersRef = useRef<IceServerConfig[]>([]);
  const localStreamRef = useRef<MediaStream | null>(null);
  // As sharer: one RTCPeerConnection per viewer watching me.
  const sharerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  // As viewer: one RTCPeerConnection per sharer I'm watching.
  const viewerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());

  useEffect(() => {
    api
      .get<{ iceServers: IceServerConfig[] }>("/webrtc/ice-servers")
      .then((res) => {
        iceServersRef.current = res.iceServers;
      })
      .catch(() => {
        iceServersRef.current = [{ urls: "stun:stun.l.google.com:19302" }];
      });
  }, []);

  const rtcConfig = useCallback((): RTCConfiguration => {
    return { iceServers: iceServersRef.current as RTCIceServer[] };
  }, []);

  // ---- join room / presence ----
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !roomId) return;

    function onConnect() {
      setMySocketId(socket!.id ?? null);
      socket!.emit("room:join", roomId, (res: { participants?: Participant[]; error?: string }) => {
        if (res?.participants) setParticipants(res.participants);
      });
    }

    if (socket.connected) onConnect();
    socket.on("connect", onConnect);
    socket.on("room:presence", (list: Participant[]) => setParticipants(list));

    socket.on("peer:left", ({ socketId }: { socketId: string }) => {
      closeSharerConnection(socketId);
      closeViewerConnection(socketId);
    });

    socket.on("stream:stopped", ({ socketId }: { socketId: string }) => {
      closeViewerConnection(socketId);
    });

    return () => {
      socket.off("connect", onConnect);
      socket.off("room:presence");
      socket.off("peer:left");
      socket.off("stream:stopped");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, connected]);

  function closeSharerConnection(viewerSocketId: string) {
    const pc = sharerConnectionsRef.current.get(viewerSocketId);
    pc?.close();
    sharerConnectionsRef.current.delete(viewerSocketId);
  }

  function closeViewerConnection(sharerSocketId: string) {
    const pc = viewerConnectionsRef.current.get(sharerSocketId);
    pc?.close();
    viewerConnectionsRef.current.delete(sharerSocketId);
    setWatchedStreams((prev) => {
      const next = new Map(prev);
      next.delete(sharerSocketId);
      return next;
    });
    setCurrentQuality((prev) => {
      const next = new Map(prev);
      next.delete(sharerSocketId);
      return next;
    });
  }

  // ---- sharer side: respond to watch requests ----
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    async function onWatchRequested({ viewerSocketId }: { viewerSocketId: string }) {
      const stream = localStreamRef.current;
      if (!stream) return;

      const pc = new RTCPeerConnection(rtcConfig());
      sharerConnectionsRef.current.set(viewerSocketId, pc);

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      preferEfficientVideoCodec(pc);

      // Cap encoding from the start ("auto" defaults) instead of leaving it
      // unbounded until the viewer touches the quality selector — an
      // untouched connection was previously encoding at whatever bitrate the
      // browser felt like, which is most of what was driving high GPU usage.
      const videoSender = pc.getSenders().find((s) => s.track?.kind === "video");
      if (videoSender) {
        await applyQualityToSender(videoSender, "auto");
      }

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          // Tagged "sharer" — see onIceCandidate below for why this matters
          // when two people mutually watch each other.
          socket!.emit("webrtc:ice-candidate", {
            targetSocketId: viewerSocketId,
            candidate: event.candidate,
            role: "sharer",
          });
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket!.emit("webrtc:offer", { targetSocketId: viewerSocketId, sdp: offer });
    }

    function onWatchStopped({ viewerSocketId }: { viewerSocketId: string }) {
      closeSharerConnection(viewerSocketId);
    }

    async function onAnswer({ fromSocketId, sdp }: { fromSocketId: string; sdp: RTCSessionDescriptionInit }) {
      const pc = sharerConnectionsRef.current.get(fromSocketId);
      if (pc) await pc.setRemoteDescription(sdp);
    }

    async function onQualityRequest({
      fromSocketId,
      quality,
    }: {
      fromSocketId: string;
      quality: StreamQuality;
    }) {
      const pc = sharerConnectionsRef.current.get(fromSocketId);
      const sender = pc?.getSenders().find((s) => s.track?.kind === "video");
      if (!sender) return;
      await applyQualityToSender(sender, quality);
    }

    // When two people mutually watch each other, both a sharerConnections
    // entry and a viewerConnections entry exist for the same peer socketId
    // at once. Candidates from that peer are ambiguous without knowing which
    // of *their* connections generated it: a candidate from their "sharer"
    // connection (them broadcasting to me) belongs on my viewer connection
    // to them, and vice versa — so route by the sender's declared role
    // instead of guessing with a map fallback.
    async function onIceCandidate({
      fromSocketId,
      candidate,
      role,
    }: {
      fromSocketId: string;
      candidate: RTCIceCandidateInit;
      role: "sharer" | "viewer";
    }) {
      const pc =
        role === "sharer"
          ? viewerConnectionsRef.current.get(fromSocketId)
          : sharerConnectionsRef.current.get(fromSocketId);
      if (pc) await pc.addIceCandidate(candidate).catch(() => {});
    }

    socket.on("watch:requested", onWatchRequested);
    socket.on("watch:stopped", onWatchStopped);
    socket.on("webrtc:answer", onAnswer);
    socket.on("quality:request", onQualityRequest);
    socket.on("webrtc:ice-candidate", onIceCandidate);

    return () => {
      socket.off("watch:requested", onWatchRequested);
      socket.off("watch:stopped", onWatchStopped);
      socket.off("webrtc:answer", onAnswer);
      socket.off("quality:request", onQualityRequest);
      socket.off("webrtc:ice-candidate", onIceCandidate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, rtcConfig]);

  // ---- viewer side: handle incoming offers for streams I'm watching ----
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    async function onOffer({ fromSocketId, sdp }: { fromSocketId: string; sdp: RTCSessionDescriptionInit }) {
      const pc = viewerConnectionsRef.current.get(fromSocketId);
      if (!pc) return;
      await pc.setRemoteDescription(sdp);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket!.emit("webrtc:answer", { targetSocketId: fromSocketId, sdp: answer });
    }

    socket.on("webrtc:offer", onOffer);
    return () => {
      socket.off("webrtc:offer", onOffer);
    };
  }, [connected]);

  // ---- actions ----
  const startSharing = useCallback(
    async (opts: { withAudio: boolean; frameRate?: number }) => {
      // Capturing at the monitor's native resolution (often 1440p/4K) forces
      // the encoder to process far more pixels than needed and burns GPU —
      // capping the capture itself at 1080p keeps quality good while cutting
      // that cost a lot. frameRate is similarly capped, not just "ideal", so
      // a 144Hz screen doesn't get captured at 144fps by default.
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1920, max: 1920 },
          height: { ideal: 1080, max: 1080 },
          frameRate: { ideal: opts.frameRate ?? 30, max: opts.frameRate ?? 30 },
        },
        audio: opts.withAudio,
      });

      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        // "motion" biases the encoder toward smooth framerate over per-frame
        // sharpness, which is both lighter on the GPU and the better trade-off
        // for game/video content than the "detail" default some browsers use.
        videoTrack.contentHint = "motion";
        videoTrack.addEventListener("ended", () => stopSharing());
      }

      localStreamRef.current = stream;
      setLocalStream(stream);
      setIsSharing(true);

      const hasAudio = stream.getAudioTracks().length > 0;
      socketRef.current?.emit("stream:start", { hasAudio });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const stopSharing = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    setLocalStream(null);
    setIsSharing(false);

    sharerConnectionsRef.current.forEach((pc) => pc.close());
    sharerConnectionsRef.current.clear();

    socketRef.current?.emit("stream:stop");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const watch = useCallback(
    (sharerSocketId: string) => {
      if (viewerConnectionsRef.current.has(sharerSocketId)) return;

      const socket = socketRef.current;
      if (!socket) return;

      const pc = new RTCPeerConnection(rtcConfig());
      viewerConnectionsRef.current.set(sharerSocketId, pc);

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("webrtc:ice-candidate", {
            targetSocketId: sharerSocketId,
            candidate: event.candidate,
            role: "viewer",
          });
        }
      };

      pc.ontrack = (event) => {
        setWatchedStreams((prev) => {
          const next = new Map(prev);
          next.set(sharerSocketId, event.streams[0]);
          return next;
        });
      };

      setCurrentQuality((prev) => new Map(prev).set(sharerSocketId, "auto"));
      socket.emit("watch:request", { targetSocketId: sharerSocketId });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rtcConfig]
  );

  const stopWatching = useCallback((sharerSocketId: string) => {
    socketRef.current?.emit("watch:stop", { targetSocketId: sharerSocketId });
    closeViewerConnection(sharerSocketId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setQuality = useCallback((sharerSocketId: string, quality: StreamQuality) => {
    socketRef.current?.emit("quality:request", { targetSocketId: sharerSocketId, quality });
    setCurrentQuality((prev) => new Map(prev).set(sharerSocketId, quality));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // cleanup all connections on unmount
  useEffect(() => {
    return () => {
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      sharerConnectionsRef.current.forEach((pc) => pc.close());
      viewerConnectionsRef.current.forEach((pc) => pc.close());
      sharerConnectionsRef.current.clear();
      viewerConnectionsRef.current.clear();
    };
  }, []);

  return {
    connected,
    participants,
    mySocketId,
    isSharing,
    localStream,
    startSharing,
    stopSharing,
    watchedStreams,
    watch,
    stopWatching,
    setQuality,
    currentQuality,
  };
}

// H264 has hardware encode/decode on basically every GPU that matters here
// (Windows/Chrome/Edge, per the spec's target platforms); VP8 — the codec
// Chrome otherwise tends to default to — is typically software-only, which
// is a meaningfully bigger CPU/GPU cost for the same stream. Falls back to
// whatever's available if H264 isn't offered (e.g. some Linux setups).
function preferEfficientVideoCodec(pc: RTCPeerConnection) {
  const transceiver = pc.getTransceivers().find((t) => t.sender.track?.kind === "video");
  if (!transceiver || typeof transceiver.setCodecPreferences !== "function") return;

  const capabilities = (window.RTCRtpSender as typeof RTCRtpSender | undefined)?.getCapabilities?.("video");
  if (!capabilities) return;

  const rank = (mimeType: string) => {
    const lower = mimeType.toLowerCase();
    if (lower.includes("h264")) return 3;
    if (lower.includes("vp9")) return 2;
    if (lower.includes("vp8")) return 1;
    return 0;
  };

  const sorted = [...capabilities.codecs].sort((a, b) => rank(b.mimeType) - rank(a.mimeType));
  try {
    transceiver.setCodecPreferences(sorted);
  } catch {
    // Non-fatal — worst case the browser's default codec negotiation applies.
  }
}

// Centralizes encoding + degradation behavior so both the initial "auto"
// setup and later quality-selector changes stay consistent. degradationPreference
// "maintain-framerate" tells the encoder that if it's under CPU/bandwidth
// pressure it should drop resolution before it drops frames — matches
// wanting a constant 30/60fps over a slightly softer image under load,
// rather than visible stutter.
async function applyQualityToSender(sender: RTCRtpSender, quality: StreamQuality) {
  const params = sender.getParameters();
  const { scaleResolutionDownBy, maxBitrate } = qualityToParams(quality);
  params.encodings = [{ scaleResolutionDownBy, ...(maxBitrate ? { maxBitrate } : {}) }];
  (params as RTCRtpSendParameters).degradationPreference = "maintain-framerate";
  await sender.setParameters(params).catch(() => {});
}
