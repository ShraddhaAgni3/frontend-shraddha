import { useEffect, useRef, useState } from "react";
import CallUI from "./CallUI";

export default function VideoCall({
  socket,
  currentUserId,
  targetUserId,
  incomingOffer,
  callType: initialCallType,
  onClose,
}) {
  const peerConnection = useRef(null);
  const otherUserRef = useRef(null);
  const pendingCandidates = useRef([]);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  const [localStream, setLocalStream] = useState(null);
  const [callStatus, setCallStatus] = useState("idle");
  const [callType, setCallType] = useState(initialCallType || "video");
  const [incomingData, setIncomingData] = useState(null);
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);

  /* ================= TURN ================= */

  const refreshTurnServers = async () => {
    const res = await fetch(
      `${import.meta.env.VITE_API_BASE_URL}/api/turn-credentials`
    );
    const data = await res.json();
    return { iceServers: data.iceServers };
  };

  /* ================= PEER ================= */

  const createPeerConnection = (config) => {
    if (peerConnection.current) {
      peerConnection.current.ontrack = null;
      peerConnection.current.onicecandidate = null;
      peerConnection.current.close();
    }

    peerConnection.current = new RTCPeerConnection(config);

    peerConnection.current.onicecandidate = (event) => {
      if (!event.candidate || !otherUserRef.current) return;

      socket.emit("ice-candidate", {
        to: otherUserRef.current.toString(),
        candidate: event.candidate,
      });
    };

    peerConnection.current.ontrack = (event) => {
      if (!remoteVideoRef.current.srcObject) {
        remoteVideoRef.current.srcObject = new MediaStream();
      }
      remoteVideoRef.current.srcObject.addTrack(event.track);
    };
  };

  /* ================= CLEANUP ================= */

  const cleanupCall = () => {
    if (peerConnection.current) {
      peerConnection.current.ontrack = null;
      peerConnection.current.onicecandidate = null;
      peerConnection.current.close();
      peerConnection.current = null;
    }

    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop());
    }

    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;

    pendingCandidates.current = [];
    otherUserRef.current = null;

    setLocalStream(null);
    setIncomingData(null);
    setCallStatus("idle");
    setCallDuration(0);
    setIsMuted(false);
    setIsCameraOff(false);
  };

  /* ================= START CALL (CALLER) ================= */

  const startCall = async (type = "video") => {
    if (!socket?.connected) {
      console.warn("Socket not ready");
      return;
    }

    if (!targetUserId || callStatus !== "idle") return;

    const config = await refreshTurnServers();
    createPeerConnection(config);

    otherUserRef.current = targetUserId;
    setCallType(type);
    setCallStatus("calling");

    const stream = await navigator.mediaDevices.getUserMedia({
      video: type === "video",
      audio: true,
    });

    setLocalStream(stream);
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }

    stream.getTracks().forEach((track) =>
      peerConnection.current.addTrack(track, stream)
    );

    const offer = await peerConnection.current.createOffer();
    await peerConnection.current.setLocalDescription(offer);

    socket.emit("call-user", {
      to: targetUserId.toString(),
      from: currentUserId.toString(),
      offer,
      callType: type,
    });
  };

  /* ================= ACCEPT CALL (RECEIVER) ================= */

  const acceptCall = async () => {
    if (!incomingData || callStatus !== "incoming") return;

    const config = await refreshTurnServers();
    createPeerConnection(config);

    otherUserRef.current = incomingData.from;
    setCallStatus("connecting");

    const stream = await navigator.mediaDevices.getUserMedia({
      video: callType === "video",
      audio: true,
    });

    setLocalStream(stream);
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }

    stream.getTracks().forEach((track) =>
      peerConnection.current.addTrack(track, stream)
    );

    await peerConnection.current.setRemoteDescription(
      new RTCSessionDescription(incomingData.offer)
    );

    for (const c of pendingCandidates.current) {
      await peerConnection.current.addIceCandidate(
        new RTCIceCandidate(c)
      );
    }
    pendingCandidates.current = [];

    const answer = await peerConnection.current.createAnswer();
    await peerConnection.current.setLocalDescription(answer);

    socket.emit("answer-call", {
      to: incomingData.from,
       answer: answer  
    });

    setCallStatus("connected");
  };

  /* ================= SOCKET LISTENERS ================= */

  useEffect(() => {
    if (!socket) return;

    const handleAnswer = async ({ answer }) => {
      if (!peerConnection.current) return;
      if (peerConnection.current.signalingState !== "have-local-offer") return;

      await peerConnection.current.setRemoteDescription(
        new RTCSessionDescription(answer)
      );

      for (const c of pendingCandidates.current) {
        await peerConnection.current.addIceCandidate(
          new RTCIceCandidate(c)
        );
      }
      pendingCandidates.current = [];

      setCallStatus("connected");
    };

    const handleIce = async ({ candidate }) => {
      if (!peerConnection.current) return;

      if (!peerConnection.current.remoteDescription) {
        pendingCandidates.current.push(candidate);
        return;
      }

      await peerConnection.current.addIceCandidate(
        new RTCIceCandidate(candidate)
      );
    };

    const handleEnd = () => {
      cleanupCall();
      onClose();
    };

    socket.off("call-answered");
    socket.off("ice-candidate");
    socket.off("call-ended");

    socket.on("call-answered", handleAnswer);
    socket.on("ice-candidate", handleIce);
    socket.on("call-ended", handleEnd);

    return () => {
      socket.off("call-answered", handleAnswer);
      socket.off("ice-candidate", handleIce);
      socket.off("call-ended", handleEnd);
    };
  }, [socket]);

  /* ================= INCOMING OFFER ================= */

  useEffect(() => {
    if (!incomingOffer) return;

    otherUserRef.current = incomingOffer.from;

    setIncomingData({
      offer: incomingOffer.offer,
      from: incomingOffer.from,
    });

    setCallType(incomingOffer.callType || "video");
    setCallStatus("incoming");
  }, [incomingOffer]);

  /* ================= TIMER ================= */

  useEffect(() => {
    let interval;
    if (callStatus === "connected") {
      interval = setInterval(() => {
        setCallDuration((p) => p + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [callStatus]);

  /* ================= END / REJECT ================= */

  const endCall = () => {
    if (otherUserRef.current) {
      socket.emit("end-call", { to: otherUserRef.current });
    }
    cleanupCall();
    onClose();
  };

  const rejectCall = endCall;

  const toggleMute = () => {
    localStream?.getAudioTracks().forEach((t) => (t.enabled = !t.enabled));
    setIsMuted((p) => !p);
  };

  const toggleCamera = () => {
    localStream?.getVideoTracks().forEach((t) => (t.enabled = !t.enabled));
    setIsCameraOff((p) => !p);
  };

  const formatTime = (sec) =>
    `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(
      sec % 60
    ).padStart(2, "0")}`;

  return (
    <CallUI
      localVideoRef={localVideoRef}
      remoteVideoRef={remoteVideoRef}
      startVideoCall={() => startCall("video")}
      startAudioCall={() => startCall("audio")}
      acceptCall={acceptCall}
      rejectCall={rejectCall}
      endCall={endCall}
      callStatus={callStatus}
      callType={callType}
      toggleMute={toggleMute}
      toggleCamera={toggleCamera}
      isMuted={isMuted}
      isCameraOff={isCameraOff}
      callDuration={callDuration}
      formatTime={formatTime}
    />
  );
}
