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
  const remoteStreamRef = useRef(new MediaStream());

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  const [localStream, setLocalStream] = useState(null);
  const [callStatus, setCallStatus] = useState("idle");
  const [callType, setCallType] = useState("video");
  const [incomingData, setIncomingData] = useState(null);
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);

  /* ================= ICE CONFIG ================= */

  const iceConfig = {
    iceServers: [
      { urls: "stun:stun.relay.metered.ca:80" },
      {
        urls: "turn:global.relay.metered.ca:80",
        username: "a276c28a894e22e6e9b400c1",
        credential: "QlDSTWza3xkHHWZe",
      },
      {
        urls: "turn:global.relay.metered.ca:443",
        username: "a276c28a894e22e6e9b400c1",
        credential: "QlDSTWza3xkHHWZe",
      },
    ],
  };

  /* ================= CREATE PEER ================= */

  const createPeerConnection = () => {

    peerConnection.current = new RTCPeerConnection(iceConfig);

    peerConnection.current.onicecandidate = (event) => {
      if (event.candidate && socket && otherUserRef.current) {
        socket.emit("ice-candidate", {
          to: otherUserRef.current.toString(),
          candidate: event.candidate
        });
      }
    };

   peerConnection.current.ontrack = (event) => {
  console.log("Remote track received:", event.streams);

  if (!remoteVideoRef.current) return;

  remoteVideoRef.current.srcObject = event.streams[0];
};

      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStreamRef.current;
      }
    };

    peerConnection.current.onconnectionstatechange = () => {
      const state = peerConnection.current.connectionState;
      console.log("Connection State:", state);

      if (state === "failed" || state === "disconnected") {
        cleanupCall();
      }
    };
  };

  /* ================= ATTACH LOCAL STREAM SAFELY ================= */

  useEffect(() => {
    if (!localStream) return;

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  /* ================= START CALL ================= */

  const startCall = async (type = "video") => {
    try {
      createPeerConnection();

      setCallType(type);
      setCallStatus("calling");
      otherUserRef.current = targetUserId;

      const stream = await navigator.mediaDevices.getUserMedia({
        video: type === "video",
        audio: true
      });

      setLocalStream(stream);

      stream.getTracks().forEach(track => {
        peerConnection.current.addTrack(track, stream);
      });

      const offer = await peerConnection.current.createOffer();
      await peerConnection.current.setLocalDescription(offer);

      socket.emit("call-user", {
        to: targetUserId.toString(),
        from: currentUserId.toString(),
        offer,
        callType: type
      });

    } catch (error) {
      console.error("Start call error:", error);
    }
  };

  /* ================= ACCEPT CALL ================= */

  const acceptCall = async () => {
    try {
      createPeerConnection();
      otherUserRef.current = incomingData.from;

      const stream = await navigator.mediaDevices.getUserMedia({
        video: callType === "video",
        audio: true
      });

      setLocalStream(stream);

      stream.getTracks().forEach(track => {
        peerConnection.current.addTrack(track, stream);
      });

      await peerConnection.current.setRemoteDescription(
        new RTCSessionDescription(incomingData.offer)
      );

      for (const c of pendingCandidates.current) {
        await peerConnection.current.addIceCandidate(new RTCIceCandidate(c));
      }

      pendingCandidates.current = [];

      const answer = await peerConnection.current.createAnswer();
      await peerConnection.current.setLocalDescription(answer);

      socket.emit("answer-call", {
        to: incomingData.from,
        answer
      });

      setCallStatus("connected");

    } catch (error) {
      console.error("Accept call error:", error);
    }
  };

  /* ================= SOCKET LISTENERS ================= */

  useEffect(() => {
    if (!socket) return;

    const handleAnswer = async ({ answer }) => {
      if (!peerConnection.current) return;

      await peerConnection.current.setRemoteDescription(
        new RTCSessionDescription(answer)
      );

      for (const c of pendingCandidates.current) {
        await peerConnection.current.addIceCandidate(new RTCIceCandidate(c));
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

    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }

    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }

    remoteStreamRef.current = new MediaStream();

    pendingCandidates.current = [];
    otherUserRef.current = null;
    setLocalStream(null);
    setIncomingData(null);
    setCallDuration(0);
    setCallStatus("idle");
  };

  const endCall = () => {
    socket.emit("end-call", { to: otherUserRef.current });
    cleanupCall();
    onClose();
  };

  const rejectCall = () => {
    socket.emit("end-call", { to: otherUserRef.current });
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
