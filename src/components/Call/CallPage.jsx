// client/src/components/Call/CallPage.jsx
import React, { useEffect, useRef, useState, useCallback } from "react";
import useMedia from "../webrtc/useMedia";

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export default function CallPage({
  socket,
  currentUserId,
  targetUserId,
  incomingOffer = null,
  incomingRoomId = null,
  callType = "video",
  onClose,
}) {
  const { stream: localStream, error: mediaError } = useMedia(
    callType === "video",
    true
  );

  const localVideoRef  = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerRef        = useRef(null);
  const roomIdRef      = useRef(
    incomingRoomId ||
    `call_${[String(currentUserId), String(targetUserId)].sort().join("_")}`
  );

  const [remoteStream, setRemoteStream] = useState(null);
  const [callStatus, setCallStatus]     = useState(
    incomingOffer ? "connecting" : "calling"
  );
  const [micMuted, setMicMuted] = useState(false);
  const [camOff, setCamOff]     = useState(false);

  // ── Attach local stream to video ──────────────────────────────────────
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // ── Attach remote stream to video ─────────────────────────────────────
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // ── Create peer ────────────────────────────────────────────────────────
  // IMPORTANT: localStream is passed explicitly — never rely on closure timing
  const createPeer = useCallback(
    (stream) => {
      // Destroy any existing peer first
      if (peerRef.current) {
        peerRef.current.close();
        peerRef.current = null;
      }

      const pc = new RTCPeerConnection(ICE_SERVERS);

      // ✅ Add tracks BEFORE creating offer/answer
      if (stream) {
        stream.getTracks().forEach((track) => {
          console.log("➕ Adding track:", track.kind);
          pc.addTrack(track, stream);
        });
      } else {
        console.warn("⚠️ createPeer called with no stream — video/audio will be missing");
      }

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          socket.emit("ice-candidate", {
            roomId: roomIdRef.current,
            candidate: e.candidate,
          });
        }
      };

      pc.ontrack = (e) => {
        console.log("📡 Remote track received:", e.track.kind);
        if (e.streams?.[0]) {
          setRemoteStream(e.streams[0]);
          setCallStatus("connected");
        }
      };

      pc.oniceconnectionstatechange = () => {
        console.log("ICE:", pc.iceConnectionState);
        if (["failed", "disconnected", "closed"].includes(pc.iceConnectionState)) {
          handleEndCall();
        }
      };

      peerRef.current = pc;
      return pc;
    },
    [socket]
  );

  // ── End call ───────────────────────────────────────────────────────────
  const handleEndCall = useCallback(() => {
    socket?.emit("call-ended", { to: targetUserId });
    if (peerRef.current) {
      peerRef.current.close();
      peerRef.current = null;
    }
    localStream?.getTracks().forEach((t) => t.stop());
    setCallStatus("ended");
    onClose?.();
  }, [socket, targetUserId, localStream, onClose]);

  // ── Signalling — only runs when localStream is ready ──────────────────
  useEffect(() => {
    // ✅ CRITICAL: Do NOT proceed until localStream is available
    if (!socket || !localStream) return;

    const roomId = roomIdRef.current;

    // ── OUTGOING: create offer ─────────────────────────────────────────
    if (!incomingOffer) {
      (async () => {
        try {
          const pc = createPeer(localStream); // ✅ pass stream explicitly
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);

          socket.emit("call-user", {
            targetUserId,
            offer,
            callType,
            from: currentUserId,
          });
          setCallStatus("ringing");
        } catch (err) {
          console.error("❌ createOffer:", err);
        }
      })();
    }

    // ── INCOMING: answer ───────────────────────────────────────────────
    if (incomingOffer) {
      (async () => {
        try {
          const pc = createPeer(localStream); // ✅ pass stream explicitly
          await pc.setRemoteDescription(
            new RTCSessionDescription(incomingOffer)
          );
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          socket.emit("call-accepted", {
            roomId,
            answer,
            to: targetUserId,
          });
          setCallStatus("connected");
        } catch (err) {
          console.error("❌ answering call:", err);
        }
      })();
    }

    // ── Handlers ───────────────────────────────────────────────────────
    const handleCallAccepted = async ({ answer }) => {
      try {
        if (peerRef.current?.signalingState !== "stable") {
          await peerRef.current.setRemoteDescription(
            new RTCSessionDescription(answer)
          );
          setCallStatus("connected");
        }
      } catch (err) {
        console.error("❌ setRemoteDescription:", err);
      }
    };

    const handleIceCandidate = async ({ candidate }) => {
      try {
        if (peerRef.current && candidate) {
          await peerRef.current.addIceCandidate(
            new RTCIceCandidate(candidate)
          );
        }
      } catch (err) {
        console.error("❌ addIceCandidate:", err);
      }
    };

    const handleCallRejected = () => {
      setCallStatus("rejected");
      setTimeout(() => onClose?.(), 1500);
    };

    const handleCallEnded = () => {
      if (peerRef.current) {
        peerRef.current.close();
        peerRef.current = null;
      }
      setCallStatus("ended");
      onClose?.();
    };

    const handleCallFailed = ({ reason }) => {
      console.warn("Call failed:", reason);
      setCallStatus("failed");
      setTimeout(() => onClose?.(), 2000);
    };

    socket.on("call-accepted",  handleCallAccepted);
    socket.on("ice-candidate",  handleIceCandidate);
    socket.on("call-rejected",  handleCallRejected);
    socket.on("call-ended",     handleCallEnded);
    socket.on("call-failed",    handleCallFailed);

    return () => {
      socket.off("call-accepted",  handleCallAccepted);
      socket.off("ice-candidate",  handleIceCandidate);
      socket.off("call-rejected",  handleCallRejected);
      socket.off("call-ended",     handleCallEnded);
      socket.off("call-failed",    handleCallFailed);
    };
  }, [socket, localStream]); // ✅ localStream in deps — re-runs when camera is ready

  // ── Cleanup on unmount ─────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (peerRef.current) {
        peerRef.current.close();
        peerRef.current = null;
      }
    };
  }, []);

  const toggleMic = () => {
    localStream?.getAudioTracks().forEach((t) => (t.enabled = !t.enabled));
    setMicMuted((p) => !p);
  };

  const toggleCam = () => {
    localStream?.getVideoTracks().forEach((t) => (t.enabled = !t.enabled));
    setCamOff((p) => !p);
  };

  const statusLabel = {
    calling:    "Calling…",
    ringing:    "Ringing…",
    connecting: "Connecting…",
    connected:  "Connected",
    rejected:   "Call rejected",
    failed:     "User is offline",
    ended:      "Call ended",
  }[callStatus] ?? callStatus;

  if (mediaError) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8 text-center max-w-sm w-full">
          <p className="text-red-600 font-semibold mb-2">Camera / Mic Error</p>
          <p className="text-gray-500 text-sm mb-6">{mediaError}</p>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-800 text-white rounded-full text-sm"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-gray-900 flex flex-col items-center justify-center">
      <p className="absolute top-6 text-white/70 text-sm tracking-wider uppercase">
        {statusLabel}
      </p>

      <div className="relative w-full h-full">
        {/* Remote video */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover bg-gray-800"
        />

        {/* Local video PiP */}
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className="absolute bottom-24 right-4 w-32 h-24 sm:w-48 sm:h-36 rounded-xl object-cover border-2 border-white/30 shadow-xl bg-gray-700"
        />
      </div>

      {/* Controls */}
      <div className="absolute bottom-6 flex items-center gap-4">
        <button
          onClick={toggleMic}
          className={`w-12 h-12 rounded-full flex items-center justify-center text-xl shadow-lg transition-colors ${
            micMuted ? "bg-red-500 text-white" : "bg-white/20 text-white hover:bg-white/30"
          }`}
        >
          {micMuted ? "🔇" : "🎤"}
        </button>

        {callType === "video" && (
          <button
            onClick={toggleCam}
            className={`w-12 h-12 rounded-full flex items-center justify-center text-xl shadow-lg transition-colors ${
              camOff ? "bg-red-500 text-white" : "bg-white/20 text-white hover:bg-white/30"
            }`}
          >
            {camOff ? "🚫" : "📷"}
          </button>
        )}

        <button
          onClick={handleEndCall}
          className="w-14 h-14 rounded-full bg-red-600 text-white flex items-center justify-center text-2xl shadow-xl hover:bg-red-500"
        >
          📵
        </button>
      </div>
    </div>
  );
}