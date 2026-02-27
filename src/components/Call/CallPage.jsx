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
  callType = "video",
  onClose,
}) {
  const { stream: localStream, error: mediaError } = useMedia(
    callType === "video",
    true
  );

  const localVideoRef     = useRef(null);
  const remoteVideoRef    = useRef(null);
  const peerRef           = useRef(null);
  const iceCandidateQueue = useRef([]);   // queue candidates until remoteDesc is set
  const remoteDescSet     = useRef(false);

  // Deterministic roomId — same formula on both sides guarantees a match
  const roomIdRef = useRef(
    `call_${[String(currentUserId), String(targetUserId)].sort().join("_")}`
  );

  const [remoteStream, setRemoteStream] = useState(null);
  const [callStatus, setCallStatus]     = useState(
    incomingOffer ? "connecting" : "calling"
  );
  const [micMuted, setMicMuted] = useState(false);
  const [camOff, setCamOff]     = useState(false);

  // ── Attach local stream ──────────────────────────────────────────────────
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // ── Attach remote stream (callback ref = no timing issues) ──────────────
  const remoteVideoCallbackRef = useCallback(
    (node) => {
      remoteVideoRef.current = node;
      if (node && remoteStream) node.srcObject = remoteStream;
    },
    [remoteStream]
  );
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // ── Flush queued ICE candidates ──────────────────────────────────────────
  const flushIceCandidates = useCallback(async () => {
    console.log(`🧊 Flushing ${iceCandidateQueue.current.length} queued ICE candidates`);
    while (iceCandidateQueue.current.length > 0) {
      const c = iceCandidateQueue.current.shift();
      try {
        await peerRef.current?.addIceCandidate(new RTCIceCandidate(c));
      } catch (e) {
        console.error("❌ Flushed ICE failed:", e);
      }
    }
  }, []);

  // ── End call ─────────────────────────────────────────────────────────────
  const handleEndCall = useCallback(() => {
    socket?.emit("call-ended", { to: String(targetUserId) });
    if (peerRef.current) { peerRef.current.close(); peerRef.current = null; }
    localStream?.getTracks().forEach((t) => t.stop());
    setCallStatus("ended");
    onClose?.();
  }, [socket, targetUserId, localStream, onClose]);

  // ── Create RTCPeerConnection ──────────────────────────────────────────────
  const createPeer = useCallback(
    (stream) => {
      if (peerRef.current) {
        peerRef.current.ontrack = null;
        peerRef.current.onicecandidate = null;
        peerRef.current.close();
        peerRef.current = null;
      }
      remoteDescSet.current     = false;
      iceCandidateQueue.current = [];

      const pc = new RTCPeerConnection(ICE_SERVERS);

      if (stream) {
        stream.getTracks().forEach((track) => {
          console.log("➕ Track added:", track.kind, "enabled:", track.enabled);
          pc.addTrack(track, stream);
        });
      } else {
        console.error("🚨 createPeer: stream is null!");
      }

      // FIX ROOT CAUSE 3 & 4:
      // ICE candidates must carry targetUserId so the server can route
      // them directly via onlineUsers map — NOT via socket.to(roomId)
      pc.onicecandidate = (e) => {
        if (e.candidate) {
          socket.emit("ice-candidate", {
            targetUserId: String(targetUserId), // ← CRITICAL: userId-based routing
            candidate: e.candidate,
          });
        }
      };

      pc.oniceconnectionstatechange = () => {
        console.log("🧊 ICE state:", pc.iceConnectionState);
        if (["failed", "disconnected", "closed"].includes(pc.iceConnectionState)) {
          handleEndCall();
        }
      };

      pc.onconnectionstatechange = () => {
        console.log("🔗 Connection state:", pc.connectionState);
      };

      pc.ontrack = (e) => {
        console.log("📡 Remote track:", e.track.kind, "streams:", e.streams?.length);
        const ms = (e.streams && e.streams[0])
          ? e.streams[0]
          : new MediaStream([e.track]); // fallback for Firefox
        setRemoteStream(ms);
        setCallStatus("connected");
      };

      peerRef.current = pc;
      return pc;
    },
    [socket, targetUserId, handleEndCall]
  );

  // ── Main signalling effect — only runs once localStream is ready ─────────
  useEffect(() => {
    if (!socket || !localStream) {
      console.log("⏳ Waiting for socket + stream…", { socket: !!socket, localStream: !!localStream });
      return;
    }

    console.log("✅ Stream ready, starting WebRTC signalling");

    // ── OUTGOING CALL ──────────────────────────────────────────────────────
    if (!incomingOffer) {
      (async () => {
        try {
          const pc = createPeer(localStream);
          const offer = await pc.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: callType === "video",
          });
          await pc.setLocalDescription(offer);
          socket.emit("call-user", {
            targetUserId: String(targetUserId),
            offer,
            callType,
            from: String(currentUserId),
          });
          setCallStatus("ringing");
          console.log("📤 Offer sent to", targetUserId);
        } catch (err) {
          console.error("❌ createOffer failed:", err);
        }
      })();
    }

    // ── INCOMING CALL ──────────────────────────────────────────────────────
    if (incomingOffer) {
      (async () => {
        try {
          const pc = createPeer(localStream);
          await pc.setRemoteDescription(new RTCSessionDescription(incomingOffer));
          remoteDescSet.current = true;
          await flushIceCandidates();

          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit("call-accepted", {
            answer,
            to: String(targetUserId),
          });
          console.log("📤 Answer sent to", targetUserId);
        } catch (err) {
          console.error("❌ Answering failed:", err);
        }
      })();
    }

    // ── Socket event handlers ──────────────────────────────────────────────
    const handleCallAccepted = async ({ answer }) => {
      console.log("📥 Answer received");
      try {
        if (!peerRef.current || peerRef.current.signalingState === "stable") return;
        await peerRef.current.setRemoteDescription(new RTCSessionDescription(answer));
        remoteDescSet.current = true;
        await flushIceCandidates();
        setCallStatus("connected");
      } catch (err) {
        console.error("❌ setRemoteDescription (answer):", err);
      }
    };

    const handleIceCandidate = async ({ candidate }) => {
      if (!candidate) return;
      if (!remoteDescSet.current) {
        console.log("📦 Queueing ICE candidate");
        iceCandidateQueue.current.push(candidate);
        return;
      }
      try {
        await peerRef.current?.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error("❌ addIceCandidate:", err);
      }
    };

    const handleCallRejected = () => {
      setCallStatus("rejected");
      setTimeout(() => onClose?.(), 1500);
    };

    const handleCallEnded = () => {
      if (peerRef.current) { peerRef.current.close(); peerRef.current = null; }
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
  }, [socket, localStream]); // re-runs when stream becomes available

  // ── Unmount cleanup ───────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (peerRef.current) { peerRef.current.close(); peerRef.current = null; }
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
    connected:  "Connected ✅",
    rejected:   "Call Rejected",
    failed:     "User is Offline",
    ended:      "Call Ended",
  }[callStatus] ?? callStatus;

  // ── Media error ───────────────────────────────────────────────────────────
  if (mediaError) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8 text-center max-w-sm w-full shadow-2xl">
          <p className="text-5xl mb-4">🎥</p>
          <p className="text-red-600 font-semibold text-lg mb-2">Camera / Mic Error</p>
          <p className="text-gray-500 text-sm mb-6">{mediaError}</p>
          <button onClick={onClose} className="px-6 py-2 bg-gray-800 text-white rounded-full text-sm">Close</button>
        </div>
      </div>
    );
  }

  // ── Waiting for camera ────────────────────────────────────────────────────
  if (!localStream) {
    return (
      <div className="fixed inset-0 bg-gray-900 flex items-center justify-center z-50">
        <div className="text-center text-white">
          <div className="text-6xl mb-4 animate-pulse">📷</div>
          <p className="text-xl font-medium">Requesting camera access…</p>
          <p className="text-sm text-white/50 mt-2">Please allow camera and microphone</p>
        </div>
      </div>
    );
  }

  // ── Call UI ───────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 bg-gray-900 flex flex-col">
      <div className="absolute top-0 left-0 right-0 z-10 flex justify-center pt-5">
        <span className="bg-black/50 backdrop-blur text-white text-sm px-5 py-1.5 rounded-full">
          {statusLabel}
        </span>
      </div>

      <div className="relative flex-1 overflow-hidden">
        {/* Remote video — full screen */}
        <video
          ref={remoteVideoCallbackRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover bg-gray-800"
        />

        {!remoteStream && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
            <div className="text-center text-white/50">
              <div className="text-7xl mb-4">👤</div>
              <p>Waiting for other person…</p>
            </div>
          </div>
        )}

        {/* Local video — PiP */}
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className="absolute bottom-24 right-3 w-32 h-24 sm:w-44 sm:h-32 rounded-2xl object-cover border-2 border-white/20 shadow-2xl bg-gray-700"
        />
      </div>

      {/* Controls */}
      <div className="absolute bottom-6 left-0 right-0 flex justify-center items-center gap-5">
        <button
          onClick={toggleMic}
          className={`w-12 h-12 rounded-full text-xl shadow-lg flex items-center justify-center transition-all ${
            micMuted ? "bg-red-500 text-white" : "bg-white/20 text-white hover:bg-white/30"
          }`}
        >
          {micMuted ? "🔇" : "🎤"}
        </button>

        {callType === "video" && (
          <button
            onClick={toggleCam}
            className={`w-12 h-12 rounded-full text-xl shadow-lg flex items-center justify-center transition-all ${
              camOff ? "bg-red-500 text-white" : "bg-white/20 text-white hover:bg-white/30"
            }`}
          >
            {camOff ? "🚫" : "📷"}
          </button>
        )}

        <button
          onClick={handleEndCall}
          className="w-16 h-16 rounded-full bg-red-600 text-white text-2xl shadow-2xl flex items-center justify-center hover:bg-red-500 transition-transform hover:scale-105"
        >
          📵
        </button>
      </div>
    </div>
  );
}