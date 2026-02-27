// client/src/webrtc/useWebRTC.js
import { useRef, useCallback } from "react";

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    // Replace with your actual TURN credentials from .env
    ...(import.meta.env.VITE_TURN_URL
      ? [
          {
            urls: import.meta.env.VITE_TURN_URL,
            username: import.meta.env.VITE_TURN_USERNAME,
            credential: import.meta.env.VITE_TURN_CREDENTIAL,
          },
        ]
      : []),
  ],
};

/**
 * useWebRTC — manages a single RTCPeerConnection lifecycle.
 *
 * @param {Socket} socket  - socket.io instance
 * @param {MediaStream|null} localStream - from useMedia
 * @param {string} roomId  - current room
 * @param {Function} onRemoteStream - cb(stream) when remote tracks arrive
 * @returns {{ peer, createPeer, destroyPeer }}
 */
export default function useWebRTC(socket, localStream, roomId, onRemoteStream) {
  const peer = useRef(null);

  /**
   * Tears down any existing peer connection cleanly.
   */
  const destroyPeer = useCallback(() => {
    if (peer.current) {
      peer.current.ontrack = null;
      peer.current.onicecandidate = null;
      peer.current.oniceconnectionstatechange = null;
      peer.current.close();
      peer.current = null;
    }
  }, []);

  /**
   * Creates a new RTCPeerConnection, attaches local tracks,
   * and wires up ICE / track callbacks.
   */
  const createPeer = useCallback(() => {
    // Prevent duplicate peer
    if (peer.current) destroyPeer();

    const pc = new RTCPeerConnection(ICE_SERVERS);
    peer.current = pc;

    // Add local tracks
    if (localStream) {
      localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream);
      });
    }

    // Forward ICE candidates to the other peer via signalling server
    pc.onicecandidate = (e) => {
      if (e.candidate && socket) {
        socket.emit("ice-candidate", {
          roomId,
          candidate: e.candidate,
        });
      }
    };

    // Log ICE state changes for debugging
    pc.oniceconnectionstatechange = () => {
      console.log("ICE state:", pc.iceConnectionState);
      if (
        pc.iceConnectionState === "failed" ||
        pc.iceConnectionState === "disconnected"
      ) {
        console.warn("⚠️ ICE connection failed/disconnected");
      }
    };

    // Expose remote stream to the caller
    pc.ontrack = (e) => {
      if (e.streams?.[0] && onRemoteStream) {
        onRemoteStream(e.streams[0]);
      }
    };

    return pc;
  }, [socket, localStream, roomId, destroyPeer, onRemoteStream]);

  return { peer, createPeer, destroyPeer };
}
