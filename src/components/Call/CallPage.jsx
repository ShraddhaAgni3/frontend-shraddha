// client/src/components/Call/CallPage.jsx
import React, { useEffect, useRef, useState, useCallback } from "react";
import useMedia from "../webrtc/useMedia";
import useWebRTC from "../webrtc/useWebRTC";

/**
 * CallPage — handles both outgoing and incoming WebRTC calls.
 *
 * Props
 * -----
 * socket         : socket.io instance (passed from parent, NOT imported directly)
 * currentUserId  : logged-in user's ID (string)
 * targetUserId   : the other user's ID (string)
 * incomingOffer  : RTCSessionDescription | null  (null = outgoing call)
 * callType       : "video" | "audio"
 * onClose        : () => void  — called when call ends
 */
export default function CallPage({
  socket,
  currentUserId,
  targetUserId,
  incomingOffer = null,
  callType = "video",
  onClose,
}) {
  // ── Media ────────────────────────────────────────────────────────────────
  const videoEnabled = callType === "video";
  const { stream: localStream, error: mediaError } = useMedia(videoEnabled, true);

  // ── Refs ─────────────────────────────────────────────────────────────────
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const roomIdRef = useRef(`call_${[currentUserId, targetUserId].sort().join("_")}`);

  // ── State ─────────────────────────────────────────────────────────────────
  const [remoteStream, setRemoteStream] = useState(null);
  const [callStatus, setCallStatus] = useState(
    incomingOffer ? "incoming" : "calling"
  );
  const [micMuted, setMicMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);

  // ── WebRTC ────────────────────────────────────────────────────────────────
  const { peer, createPeer, destroyPeer } = useWebRTC(
    socket,
    localStream,
    roomIdRef.current,
    (stream) => {
      setRemoteStream(stream);
      setCallStatus("connected");
    }
  );

  // ── Attach local stream to video element ─────────────────────────────────
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // ── Attach remote stream to video element ────────────────────────────────
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // ── Socket signalling ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!socket || !localStream) return;

    const roomId = roomIdRef.current;

    // ---- Handler: remote answered ----
    const handleAnswer = async (answer) => {
      try {
        if (peer.current?.signalingState !== "stable") {
          await peer.current.setRemoteDescription(
            new RTCSessionDescription(answer)
          );
          setCallStatus("connected");
        }
      } catch (err) {
        console.error("❌ setRemoteDescription (answer):", err);
      }
    };

    // ---- Handler: remote sent offer (shouldn't happen here but guard) ----
    const handleOffer = async (offer) => {
      try {
        const pc = createPeer();
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("answer", { roomId, answer });
      } catch (err) {
        console.error("❌ handling offer:", err);
      }
    };

    // ---- Handler: ICE candidate from remote ----
    const handleIceCandidate = async ({ candidate }) => {
      try {
        if (peer.current && candidate) {
          await peer.current.addIceCandidate(new RTCIceCandidate(candidate));
        }
      } catch (err) {
        console.error("❌ addIceCandidate:", err);
      }
    };

    // ---- Handler: remote user left ----
    const handleUserLeft = () => {
      console.log("🔴 Remote user left");
      setCallStatus("ended");
      handleEndCall();
    };

    // ---- Handler: ready signal (both users joined room) ----
    const handleReady = async () => {
      if (incomingOffer) return; // answerer doesn't initiate offer
      try {
        const pc = createPeer();
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit("offer", { roomId, offer });
        setCallStatus("ringing");
      } catch (err) {
        console.error("❌ createOffer:", err);
      }
    };

    socket.on("ready", handleReady);
    socket.on("offer", handleOffer);
    socket.on("answer", handleAnswer);
    socket.on("ice-candidate", handleIceCandidate);
    socket.on("user-left", handleUserLeft);

    // ---- Join room ----
    socket.emit("join-room", roomId);

    // ---- If incoming call: answer immediately ----
    if (incomingOffer) {
      (async () => {
        try {
          const pc = createPeer();
          await pc.setRemoteDescription(
            new RTCSessionDescription(incomingOffer)
          );
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit("answer", { roomId, answer });
          setCallStatus("connected");
        } catch (err) {
          console.error("❌ Answering incoming call:", err);
        }
      })();
    }

    return () => {
      socket.off("ready", handleReady);
      socket.off("offer", handleOffer);
      socket.off("answer", handleAnswer);
      socket.off("ice-candidate", handleIceCandidate);
      socket.off("user-left", handleUserLeft);
    };
  }, [socket, localStream, incomingOffer, createPeer, peer]);

  // ── End call ──────────────────────────────────────────────────────────────
  const handleEndCall = useCallback(() => {
    destroyPeer();
    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop());
    }
    setCallStatus("ended");
    if (onClose) onClose();
  }, [destroyPeer, localStream, onClose]);

  // ── Toggle mic ────────────────────────────────────────────────────────────
  const toggleMic = useCallback(() => {
    if (!localStream) return;
    localStream.getAudioTracks().forEach((t) => {
      t.enabled = !t.enabled;
    });
    setMicMuted((prev) => !prev);
  }, [localStream]);

  // ── Toggle camera ─────────────────────────────────────────────────────────
  const toggleCam = useCallback(() => {
    if (!localStream) return;
    localStream.getVideoTracks().forEach((t) => {
      t.enabled = !t.enabled;
    });
    setCamOff((prev) => !prev);
  }, [localStream]);

  // ── Status label ──────────────────────────────────────────────────────────
  const statusLabel = {
    incoming: "Incoming call…",
    calling: "Calling…",
    ringing: "Ringing…",
    connected: "Connected",
    ended: "Call ended",
  }[callStatus] ?? callStatus;

  // ── Render ────────────────────────────────────────────────────────────────
  if (mediaError) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8 text-center max-w-sm w-full shadow-2xl">
          <p className="text-red-600 font-semibold text-lg mb-2">
            Camera / Mic Error
          </p>
          <p className="text-gray-500 text-sm mb-6">{mediaError}</p>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-800 text-white rounded-full text-sm font-medium hover:bg-gray-700"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-gray-900 flex flex-col items-center justify-center select-none">
      {/* ── Status banner ─────────────────────────────────────── */}
      <p className="absolute top-6 text-white/70 text-sm tracking-wider uppercase">
        {statusLabel}
      </p>

      {/* ── Video grid ────────────────────────────────────────── */}
      <div className="relative w-full h-full">
        {/* Remote (large) */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />

        {/* Local (picture-in-picture) */}
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className="absolute bottom-24 right-4 w-32 h-24 sm:w-48 sm:h-36 rounded-xl object-cover border-2 border-white/30 shadow-xl"
        />
      </div>

      {/* ── Controls bar ──────────────────────────────────────── */}
      <div className="absolute bottom-6 flex items-center gap-4">
        {/* Mute mic */}
        <button
          onClick={toggleMic}
          className={`w-12 h-12 rounded-full flex items-center justify-center text-xl shadow-lg transition-colors ${
            micMuted ? "bg-red-500 text-white" : "bg-white/20 text-white hover:bg-white/30"
          }`}
          title={micMuted ? "Unmute" : "Mute"}
        >
          {micMuted ? "🔇" : "🎤"}
        </button>

        {/* Toggle camera (only in video call) */}
        {callType === "video" && (
          <button
            onClick={toggleCam}
            className={`w-12 h-12 rounded-full flex items-center justify-center text-xl shadow-lg transition-colors ${
              camOff ? "bg-red-500 text-white" : "bg-white/20 text-white hover:bg-white/30"
            }`}
            title={camOff ? "Turn on camera" : "Turn off camera"}
          >
            {camOff ? "🚫" : "📷"}
          </button>
        )}

        {/* End call */}
        <button
          onClick={handleEndCall}
          className="w-14 h-14 rounded-full bg-red-600 text-white flex items-center justify-center text-2xl shadow-xl hover:bg-red-500 transition-transform hover:scale-105"
          title="End call"
        >
          📵
        </button>
      </div>
    </div>
  );
}
