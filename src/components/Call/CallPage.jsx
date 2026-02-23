import { useEffect, useRef, useState } from "react";
import CallUI from "./CallUI";

export default function VideoCall({
  socket,
  currentUserId,
  targetUserId,
  incomingOffer,
  callType: initialCallType,
  onClose
}) {

  const otherUserRef = useRef(null);
  const peerConnection = useRef(null);
  const pendingCandidates = useRef([]);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  const [localStream, setLocalStream] = useState(null);
  const [callStatus, setCallStatus] = useState("idle");
  const [callType, setCallType] = useState("video");
  const [incomingData, setIncomingData] = useState(null);
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);

  /* ================= TURN REFRESH ================= */

  const refreshTurnServers = async () => {
    const res = await fetch(
      `${import.meta.env.VITE_API_BASE_URL}/api/turn-credentials`
    );
    const data = await res.json();

    return {
      iceServers: data.iceServers
    };
  };

  /* ================= PEER CONNECTION ================= */

  const createPeerConnection = (config) => {

    peerConnection.current = new RTCPeerConnection({
      ...config,
      iceTransportPolicy: "relay"
    });

    peerConnection.current.oniceconnectionstatechange = () => {
      console.log("ICE STATE:", peerConnection.current.iceConnectionState);
    };

    peerConnection.current.onconnectionstatechange = () => {
      console.log("CONNECTION STATE:", peerConnection.current.connectionState);
    };

    peerConnection.current.onicecandidate = (event) => {
      if (!event.candidate || !socket || !otherUserRef.current) return;

      socket.emit("ice-candidate", {
        to: otherUserRef.current.toString(),
        candidate: event.candidate
      });
    };

    const remoteStream = new MediaStream();

    peerConnection.current.ontrack = (event) => {
      remoteStream.addTrack(event.track);
      remoteVideoRef.current.srcObject = remoteStream;
    };
  };

  /* ================= START CALL ================= */

  const startCall = async (type = "video") => {

    const iceConfig = await refreshTurnServers();

    setCallType(type);
    setCallStatus("calling");
    otherUserRef.current = targetUserId;

    createPeerConnection(iceConfig);

    const stream = await navigator.mediaDevices.getUserMedia({
      video: type === "video",
      audio: true
    });

    setLocalStream(stream);
    localVideoRef.current.srcObject = stream;

    stream.getTracks().forEach(track =>
      peerConnection.current.addTrack(track, stream)
    );

    const offer = await peerConnection.current.createOffer();
    await peerConnection.current.setLocalDescription(offer);

    socket.emit("call-user", {
      to: targetUserId.toString(),
      from: currentUserId.toString(),
      offer,
      callType: type
    });
  };

  /* ================= ACCEPT CALL ================= */

  const acceptCall = async () => {

    const iceConfig = await refreshTurnServers();
    createPeerConnection(iceConfig);

    const stream = await navigator.mediaDevices.getUserMedia({
      video: callType === "video",
      audio: true
    });

    setLocalStream(stream);
    localVideoRef.current.srcObject = stream;

    stream.getTracks().forEach(track =>
      peerConnection.current.addTrack(track, stream)
    );

    await peerConnection.current.setRemoteDescription(
      new RTCSessionDescription(incomingData.offer)
    );

    pendingCandidates.current.forEach(async (c) => {
      await peerConnection.current.addIceCandidate(
        new RTCIceCandidate(c)
      );
    });
    pendingCandidates.current = [];

    const answer = await peerConnection.current.createAnswer();
    await peerConnection.current.setLocalDescription(answer);

    socket.emit("answer-call", {
      to: incomingData.from,
      answer
    });

    setCallStatus("connected");
  };

  /* ================= SOCKET LISTENERS ================= */

  useEffect(() => {
    if (!socket) return;

    const handleAnswer = async ({ answer }) => {
      await peerConnection.current.setRemoteDescription(
        new RTCSessionDescription(answer)
      );
      setCallStatus("connected");
    };

    const handleIce = async (candidate) => {
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

    socket.on("call-answered", handleAnswer);
    socket.on("ice-candidate", handleIce);
    socket.on("call-ended", handleEnd);

    return () => {
      socket.off("call-answered", handleAnswer);
      socket.off("ice-candidate", handleIce);
      socket.off("call-ended", handleEnd);
    };

  }, [socket]);

  /* ================= INCOMING CALL ================= */

  useEffect(() => {
    if (incomingOffer) {
      setIncomingData({
        offer: incomingOffer,
        from: targetUserId.toString()
      });

      otherUserRef.current = targetUserId;
      setCallType(initialCallType || "video");
      setCallStatus("incoming");
    }
  }, [incomingOffer]);

  /* ================= TIMER ================= */

  useEffect(() => {
    let interval;
    if (callStatus === "connected") {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [callStatus]);

  /* ================= CLEANUP ================= */

  const cleanupCall = () => {
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }

    if (localVideoRef.current?.srcObject) {
      localVideoRef.current.srcObject.getTracks().forEach(track => track.stop());
      localVideoRef.current.srcObject = null;
    }

    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }

    setCallDuration(0);
    setCallStatus("idle");
  };

  const endCall = () => {
    socket.emit("end-call", { to: targetUserId.toString() });
    cleanupCall();
    onClose();
  };

  const rejectCall = () => {
    socket.emit("end-call", { to: otherUserRef.current.toString() });
    cleanupCall();
    onClose();
  };

  /* ================= CONTROLS ================= */

  const toggleMute = () => {
    localStream?.getAudioTracks().forEach(track => {
      track.enabled = !track.enabled;
    });
    setIsMuted(prev => !prev);
  };

  const toggleCamera = () => {
    localStream?.getVideoTracks().forEach(track => {
      track.enabled = !track.enabled;
    });
    setIsCameraOff(prev => !prev);
  };

  /* ================= UI ================= */

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2,"0")}:${secs.toString().padStart(2,"0")}`;
  };

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
