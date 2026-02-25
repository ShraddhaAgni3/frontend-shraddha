import { useEffect, useRef, useState } from "react";
import CallUI from "./CallUI";

export default function VideoCall({
  socket,
  currentUserId,
  targetUserId,
  incomingOffer,
  callType: initialCallType,
  autoStart = false,
  onClose
}) {

  const peerConnection = useRef(null);
  const otherUserRef = useRef(null);
  const pendingCandidates = useRef([]);
  const remoteStreamRef = useRef(null);
  const timerRef = useRef(null);

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
     {
        urls: "stun:stun.relay.metered.ca:80",
      },
      {
        urls: "turn:global.relay.metered.ca:80",
        username: "a276c28a894e22e6e9b400c1",
        credential: "QlDSTWza3xkHHWZe",
      },
      {
        urls: "turn:global.relay.metered.ca:80?transport=tcp",
        username: "a276c28a894e22e6e9b400c1",
        credential: "QlDSTWza3xkHHWZe",
      },
      {
        urls: "turn:global.relay.metered.ca:443",
        username: "a276c28a894e22e6e9b400c1",
        credential: "QlDSTWza3xkHHWZe",
      },
      {
        urls: "turns:global.relay.metered.ca:443?transport=tcp",
        username: "a276c28a894e22e6e9b400c1",
        credential: "QlDSTWza3xkHHWZe",
      },
    ],
  };

  /* ================= CREATE PEER ================= */

  const createPeerConnection = () => {
    if (peerConnection.current) return;

    peerConnection.current = new RTCPeerConnection(iceConfig);
    remoteStreamRef.current = new MediaStream();

    peerConnection.current.onicecandidate = (event) => {
      if (event.candidate && otherUserRef.current) {
        socket.emit("ice-candidate", {
          to: otherUserRef.current.toString(),
          candidate: event.candidate
        });
      }
    };

    peerConnection.current.ontrack = (event) => {
      event.streams[0].getTracks().forEach(track => {
        remoteStreamRef.current.addTrack(track);
      });

      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStreamRef.current;
      }
    };

    peerConnection.current.onconnectionstatechange = () => {
      const state = peerConnection.current.connectionState;
      console.log("Connection State:", state);

      if (state === "connected") {
        setCallStatus("connected");
        startTimer();
      }

      if (state === "failed" || state === "disconnected") {
        cleanupCall();
        onClose();
      }
    };
  };

  /* ================= TIMER ================= */

  const startTimer = () => {
    if (timerRef.current) return;

    timerRef.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
  };

  const stopTimer = () => {
    clearInterval(timerRef.current);
    timerRef.current = null;
  };

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

    } catch (err) {
      console.error("Start call error:", err);
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

      stream.getTracks().forEach(track =>
        peerConnection.current.addTrack(track, stream)
      );

      await peerConnection.current.setRemoteDescription(
        new RTCSessionDescription(incomingData.offer)
      );

      // Apply buffered ICE
      pendingCandidates.current.forEach(candidate => {
        peerConnection.current.addIceCandidate(
          new RTCIceCandidate(candidate)
        );
      });
      pendingCandidates.current = [];

      const answer = await peerConnection.current.createAnswer();
      await peerConnection.current.setLocalDescription(answer);

      socket.emit("answer-call", {
        to: incomingData.from,
        answer
      });

    } catch (err) {
      console.error("Accept call error:", err);
    }
  };

  /* ================= SOCKET LISTENERS ================= */

  useEffect(() => {
    if (!socket) return;

  const handleAnswer = async ({ answer }) => {
  if (!peerConnection.current) return;

  // Only caller should receive answer
  if (peerConnection.current.signalingState !== "have-local-offer") {
    console.log("Ignoring duplicate or invalid answer");
    return;
  }

  try {
    await peerConnection.current.setRemoteDescription(
      new RTCSessionDescription(answer)
    );

    // Apply buffered ICE
    pendingCandidates.current.forEach(candidate => {
      peerConnection.current.addIceCandidate(
        new RTCIceCandidate(candidate)
      );
    });
    pendingCandidates.current = [];

  } catch (err) {
    console.error("Answer set error:", err);
  }
};

    const handleIce = async ({ candidate }) => {
      if (!peerConnection.current) return;

      if (peerConnection.current.remoteDescription) {
        await peerConnection.current.addIceCandidate(
          new RTCIceCandidate(candidate)
        );
      } else {
        pendingCandidates.current.push(candidate);
      }
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

  /* ================= INCOMING ================= */

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

  /* ================= AUTOSTART ================= */

  useEffect(() => {
    if (autoStart) {
      startCall(initialCallType || "video");
    }
  }, [autoStart]);

  /* ================= CLEANUP ================= */

  const cleanupCall = () => {
    stopTimer();

    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }

    localStream?.getTracks().forEach(track => track.stop());

    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;

    remoteStreamRef.current = null;
    pendingCandidates.current = [];

    setLocalStream(null);
    setIncomingData(null);
    setCallStatus("idle");
    setCallDuration(0);
  };

  const endCall = () => {
    if (otherUserRef.current) {
      socket.emit("end-call", {
        to: otherUserRef.current.toString()
      });
    }
    cleanupCall();
    onClose();
  };

  const rejectCall = endCall;

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
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
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
