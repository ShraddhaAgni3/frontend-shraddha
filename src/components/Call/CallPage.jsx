// client/src/components/Call/CallPage.jsx
import React, { useEffect, useRef, useState, useCallback } from "react";
import useMedia from "../webrtc/useMedia"

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
  // ── BUG FIX 1: useMedia now returns { stream, error } ───────────────────
  const { stream: localStream, error: mediaError } = useMedia(
    callType === "video",
    true
  );

  const localVideoRef  = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerRef        = useRef(null);

  // ── BUG FIX 2: ICE candidate queue ──────────────────────────────────────
  // Candidates arriving before setRemoteDescription completes are silently
  // dropped by the browser. We queue them and flush after remoteDesc is set.
  const iceCandidateQueue = useRef([]);
  const remoteDescSet     = useRef(false);

  const roomIdRef = useRef(
    incomingRoomId ||
      `call_${[String(currentUserId), String(targetUserId)].sort().join("_")}`
  );

  const [remoteStream, setRemoteStream] = useState(null);
  const [callStatus, setCallStatus]     = useState(
    incomingOffer ? "connecting" : "calling"
  );
  const [micMuted, setMicMuted] = useState(false);
  const [camOff, setCamOff]     = useState(false);

  // ── Attach local stream to video element ────────────────────────────────
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // ── BUG FIX 3: callback ref for remote video ────────────────────────────
  // Using a callback ref ensures we never miss the stream arriving before
  // the DOM element mounts (plain useRef can silently fail here)
  const remoteVideoCallbackRef = useCallback(
    (node) => {
      remoteVideoRef.current = node;
      if (node && remoteStream) {
        node.srcObject = remoteStream;
      }
    },
    [remoteStream]
  );

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // ── Flush queued ICE candidates after remote desc is ready ───────────────
  const flushIceCandidates = useCallback(async () => {
    const queue = iceCandidateQueue.current;
    console.log(`🧊 Flushing ${queue.length} queued ICE candidates`);
    while (queue.length > 0) {
      const candidate = queue.shift();
      try {
        await peerRef.current?.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error("❌ Queued ICE candidate failed:", err);
      }
    }
  }, []);

  // ── Create RTCPeerConnection ─────────────────────────────────────────────
  const createPeer = useCallback(
    (stream) => {
      // Destroy existing peer cleanly
      if (peerRef.current) {
        peerRef.current.ontrack = null;
        peerRef.current.onicecandidate = null;
        peerRef.current.close();
        peerRef.current = null;
      }
      remoteDescSet.current     = false;
      iceCandidateQueue.current = [];

      const pc = new RTCPeerConnection(ICE_SERVERS);

      // ✅ Tracks MUST be added before createOffer/createAnswer
      if (stream) {
        stream.getTracks().forEach((track) => {
          console.log("➕ Adding track:", track.kind, "| enabled:", track.enabled);
          pc.addTrack(track, stream);
        });
      } else {
        console.error("🚨 createPeer called with null stream — no tracks added!");
      }

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          socket.emit("ice-candidate", {
            roomId: roomIdRef.current,
            candidate: e.candidate,
          });
        }
      };

      pc.oniceconnectionstatechange = () => {
        console.log("🧊 ICE:", pc.iceConnectionState);
        if (["failed", "disconnected", "closed"].includes(pc.iceConnectionState)) {
          handleEndCall();
        }
      };

      pc.onconnectionstatechange = () => {
        console.log("🔗 Peer connection:", pc.connectionState);
      };

      // ── BUG FIX 4: fallback stream construction if e.streams is empty ───
      pc.ontrack = (e) => {
        console.log("📡 Remote track:", e.track.kind, "| streams:", e.streams?.length);
        let ms;
        if (e.streams && e.streams[0]) {
          ms = e.streams[0];
        } else {
          // Some browsers don't populate e.streams — build manually
          ms = new MediaStream([e.track]);
        }
        setRemoteStream(ms);
        setCallStatus("connected");
      };

      peerRef.current = pc;
      return pc;
    },
    [socket] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // ── End call ─────────────────────────────────────────────────────────────
  const handleEndCall = useCallback(() => {
    socket?.emit("call-ended", { to: String(targetUserId) });
    if (peerRef.current) {
      peerRef.current.close();
      peerRef.current = null;
    }
    localStream?.getTracks().forEach((t) => t.stop());
    setCallStatus("ended");
    onClose?.();
  }, [socket, targetUserId, localStream, onClose]);

  // ── Signalling effect — waits for localStream ────────────────────────────
  useEffect(() => {
    if (!socket || !localStream) {
      console.log("⏳ Waiting for stream...", { hasSocket: !!socket, hasStream: !!localStream });
      return;
    }

    console.log("✅ Stream ready — initialising WebRTC");
    const roomId = roomIdRef.current;

    // ── OUTGOING: create and send offer ───────────────────────────────────
    if (!incomingOffer) {
      (async () => {
        try {
          const pc = createPeer(localStream);
          const offer = await pc.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: callType === "video",
          });
          await pc.setLocalDescription(offer);
          console.log("📤 Offer sent to user", targetUserId);
          socket.emit("call-user", {
            targetUserId: String(targetUserId),
            offer,
            callType,
            from: String(currentUserId),
          });
          setCallStatus("ringing");
        } catch (err) {
          console.error("❌ createOffer:", err);
        }
      })();
    }

    // ── INCOMING: set remote desc and send answer ─────────────────────────
    if (incomingOffer) {
      (async () => {
        try {
          const pc = createPeer(localStream);
          await pc.setRemoteDescription(new RTCSessionDescription(incomingOffer));
          remoteDescSet.current = true;
          await flushIceCandidates();

          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          console.log("📤 Answer sent to user", targetUserId);
          socket.emit("call-accepted", {
            roomId,
            answer,
            to: String(targetUserId),
          });
        } catch (err) {
          console.error("❌ answering call:", err);
        }
      })();
    }

    // ── Socket handlers ───────────────────────────────────────────────────
    const handleCallAccepted = async ({ answer }) => {
      console.log("📥 Answer received");
      try {
        if (!peerRef.current) return;
        if (peerRef.current.signalingState === "stable") {
          console.warn("Already stable — skipping setRemoteDescription");
          return;
        }
        await peerRef.current.setRemoteDescription(
          new RTCSessionDescription(answer)
        );
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
        console.log("📦 Queueing ICE candidate (remote desc not ready)");
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
      if (peerRef.current) {
        peerRef.current.close();
        peerRef.current = null;
      }
      setCallStatus("ended");
      onClose?.();
    };

    socket.on("call-accepted", handleCallAccepted);
    socket.on("ice-candidate", handleIceCandidate);
    socket.on("call-rejected", handleCallRejected);
    socket.on("call-ended",    handleCallEnded);
    socket.on("call-failed",   ({ reason }) => {
      console.warn("Call failed:", reason);
      setCallStatus("failed");
      setTimeout(() => onClose?.(), 2000);
    });

    return () => {
      socket.off("call-accepted", handleCallAccepted);
      socket.off("ice-candidate", handleIceCandidate);
      socket.off("call-rejected", handleCallRejected);
      socket.off("call-ended",    handleCallEnded);
      socket.off("call-failed");
    };
  }, [socket, localStream]); // ✅ only re-runs when stream becomes available

  // ── Cleanup peer on unmount ───────────────────────────────────────────────
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
    connected:  "Connected ✅",
    rejected:   "Call Rejected",
    failed:     "User is Offline",
    ended:      "Call Ended",
  }[callStatus] ?? callStatus;

  // ── Media permission error ────────────────────────────────────────────────
  if (mediaError) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8 text-center max-w-sm w-full shadow-2xl">
          <p className="text-5xl mb-4">🎥</p>
          <p className="text-red-600 font-semibold text-lg mb-2">Camera / Mic Error</p>
          <p className="text-gray-500 text-sm mb-6">{mediaError}</p>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-800 text-white rounded-full text-sm font-medium"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  // ── Waiting for camera permission ─────────────────────────────────────────
  if (!localStream) {
    return (
      <div className="fixed inset-0 bg-gray-900 flex items-center justify-center z-50">
        <div className="text-center text-white">
          <div className="text-6xl mb-4 animate-pulse">📷</div>
          <p className="text-xl font-medium">Requesting camera access…</p>
          <p className="text-sm text-white/50 mt-2">
            Please allow camera and microphone in your browser
          </p>
        </div>
      </div>
    );
  }

  // ── Call UI ───────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 bg-gray-900 flex flex-col">
      {/* Status pill */}
      <div className="absolute top-0 left-0 right-0 z-10 flex justify-center pt-5">
        <span className="bg-black/50 backdrop-blur text-white text-sm px-5 py-1.5 rounded-full">
          {statusLabel}
        </span>
      </div>

      {/* Video area */}
      <div className="relative flex-1 overflow-hidden">
        {/* Remote — full screen */}
        <video
          ref={remoteVideoCallbackRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover bg-gray-800"
        />

        {/* No remote stream placeholder */}
        {!remoteStream && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
            <div className="text-center text-white/50">
              <div className="text-7xl mb-4">👤</div>
              <p>Waiting for other person…</p>
            </div>
          </div>
        )}

        {/* Local — picture-in-picture */}
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
