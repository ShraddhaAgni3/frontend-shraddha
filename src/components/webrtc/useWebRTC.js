// client/src/webrtc/useWebRTC.js
import { useRef } from "react";

export default function useWebRTC(socket, localStream) {
  const peer = useRef(null);

  const servers = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      {
        urls: "turn:your-turn-server:3478",
        username: "user",
        credential: "pass",
      },
    ],
  };

  const createPeer = () => {
    peer.current = new RTCPeerConnection(servers);

    localStream.getTracks().forEach((track) => {
      peer.current.addTrack(track, localStream);
    });

    peer.current.onicecandidate = (e) => {
      if (e.candidate) {
        socket.emit("ice-candidate", {
          roomId: window.roomId,
          candidate: e.candidate,
        });
      }
    };

    return peer.current;
  };

  return { peer, createPeer };
}