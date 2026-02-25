import { useEffect, useRef, useState } from "react";
import Video from "twilio-video";
import CallUI from "./CallUI";

export default function VideoCallPage({
  token,          // Twilio access token (from backend)
  roomName,       // Room name
  onClose
}) {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  const [room, setRoom] = useState(null);
  const [callStatus, setCallStatus] = useState("connecting");
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  /* ================= CONNECT ================= */

  useEffect(() => {
    if (!token || !roomName) return;

    Video.connect(token, {
      name: roomName,
      audio: true,
      video: true
    }).then((connectedRoom) => {
      setRoom(connectedRoom);
      setCallStatus("connected");

      // Attach local video
      connectedRoom.localParticipant.tracks.forEach(publication => {
        if (publication.track.kind === "video") {
          localVideoRef.current.appendChild(publication.track.attach());
        }
      });

      // Handle remote participants
      connectedRoom.on("participantConnected", participant => {
        participant.on("trackSubscribed", track => {
          if (track.kind === "video") {
            remoteVideoRef.current.appendChild(track.attach());
          }
        });
      });

    }).catch(err => {
      console.error("Twilio connection failed:", err);
      setCallStatus("failed");
    });

    return () => {
      if (room) {
        room.disconnect();
      }
    };
  }, [token, roomName]);

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

  /* ================= CONTROLS ================= */

  const toggleMute = () => {
    room?.localParticipant.audioTracks.forEach(pub => {
      pub.track.enable(isMuted);
    });
    setIsMuted(prev => !prev);
  };

  const toggleCamera = () => {
    room?.localParticipant.videoTracks.forEach(pub => {
      pub.track.enable(isCameraOff);
    });
    setIsCameraOff(prev => !prev);
  };

  const endCall = () => {
    room?.disconnect();
    onClose();
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
      callStatus={callStatus}
      isMuted={isMuted}
      isCameraOff={isCameraOff}
      toggleMute={toggleMute}
      toggleCamera={toggleCamera}
      endCall={endCall}
      callDuration={callDuration}
      formatTime={formatTime}
    />
  );
}
