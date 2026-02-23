import { useEffect, useRef, useState } from "react";

import CallUI from "./CallUI";

const configuration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    {
      urls: "turn:openrelay.metered.ca:80",
      username: "openrelayproject",
      credential: "openrelayproject"
    }
  ]
};
export default function VideoCall({ 
  socket, 
  currentUserId, 
  targetUserId,
  incomingOffer,
  callType: initialCallType,
  onClose 
}){
  const otherUserRef = useRef(null);
  const [localStream, setLocalStream] = useState(null);
const [isMuted, setIsMuted] = useState(false);
const [isCameraOff, setIsCameraOff] = useState(false);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnection = useRef(null);
const [callDuration, setCallDuration] = useState(0);
  const [callType, setCallType] = useState("video");
  const [callStatus, setCallStatus] = useState("idle");
  const [incomingData, setIncomingData] = useState(null);
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;

    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };
  useEffect(() => {
  let timeout;

  if (callStatus === "calling") {
    timeout = setTimeout(() => {
      console.log("⏳ Call timeout - auto ending");

      if (otherUserRef.current) {
        socket.emit("end-call", {
          to: otherUserRef.current.toString()
        });
      }

      cleanupCall();
      onClose();
    }, 30000); // 30 seconds
  }

  return () => clearTimeout(timeout);
}, [callStatus]);
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


useEffect(() => {
  if (!socket) return;

  const handleAnswer = async ({ answer }) => {
    if (!peerConnection.current) return;

    await peerConnection.current.setRemoteDescription(
      new RTCSessionDescription(answer)
    );
    setCallStatus("connected");
  };
  const handleIce = async (candidate) => {
    if (!peerConnection.current) return;

    try {
      await peerConnection.current.addIceCandidate(
        new RTCIceCandidate(candidate)
      );
    } catch {}
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

useEffect(() => {
  let interval;

  if (callStatus === "connected") {
    interval = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
  }

  return () => {
    clearInterval(interval);
  };
}, [callStatus]);

  const createPeerConnection = () => {
    peerConnection.current = new RTCPeerConnection(configuration);

  peerConnection.current.onicecandidate = (event) => {
  if (!event.candidate || !socket) return;

  if (!otherUserRef.current) {
    console.log("❌ ICE skipped — no target user");
    return;
  }

  socket.emit("ice-candidate", {
    to: otherUserRef.current.toString(),
    candidate: event.candidate
  });
};
    peerConnection.current.ontrack = (event) => {
      remoteVideoRef.current.srcObject = event.streams[0];
    };
  };
const startCall = async (type = "video") => {
  setCallType(type);
  setCallStatus("calling");
otherUserRef.current = targetUserId;
  createPeerConnection();

  const stream = await navigator.mediaDevices.getUserMedia({
    video: type === "video",
    audio: true
  });
setLocalStream(stream);
  localVideoRef.current.srcObject = stream;

  stream.getTracks().forEach(track => {
    peerConnection.current.addTrack(track, stream);
  });

  const offer = await peerConnection.current.createOffer();
  await peerConnection.current.setLocalDescription(offer);
if (!socket) return;

socket.emit("call-user", {
    to: targetUserId.toString(),
    from: currentUserId.toString(),
    offer,
    callType: type
  });
};
  const acceptCall = async () => {
    setCallStatus("connected");

    createPeerConnection();

    if (!incomingData?.offer) return;

await peerConnection.current.setRemoteDescription(
  new RTCSessionDescription(incomingData.offer)
);
    const stream = await navigator.mediaDevices.getUserMedia({
      video: callType === "video",
      audio: true
    });
setLocalStream(stream);
    localVideoRef.current.srcObject = stream;

    stream.getTracks().forEach(track =>
      peerConnection.current.addTrack(track, stream)
    );

    const answer = await peerConnection.current.createAnswer();
    await peerConnection.current.setLocalDescription(answer);

    socket.emit("answer-call", {
      to: incomingData.from,
      answer
    });
  };
const toggleMute = () => {
  if (!localStream) return;

  localStream.getAudioTracks().forEach(track => {
    track.enabled = !track.enabled;
  });

  setIsMuted(prev => !prev);
};
const toggleCamera = () => {
  if (!localStream) return;

  localStream.getVideoTracks().forEach(track => {
    track.enabled = !track.enabled;
  });

  setIsCameraOff(prev => !prev);
};
  const rejectCall = () => {
  if (otherUserRef.current) {
    socket.emit("end-call", { to: otherUserRef.current.toString() });
  }

  cleanupCall();
  onClose();
};

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
    setIncomingData(null);
  };

  const endCall = () => {
  socket.emit("end-call", { to: targetUserId.toString() });
  cleanupCall();
  onClose();
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
