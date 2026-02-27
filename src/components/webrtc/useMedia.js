// client/src/webrtc/useMedia.js
import { useState, useEffect } from "react";

/**
 * Acquires local camera + microphone stream.
 * Returns { stream, error } and cleans up tracks on unmount.
 */
export default function useMedia(videoEnabled = true, audioEnabled = true) {
  const [stream, setStream] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let localStream = null;

    navigator.mediaDevices
      .getUserMedia({ video: videoEnabled, audio: audioEnabled })
      .then((s) => {
        localStream = s;
        setStream(s);
      })
      .catch((err) => {
        console.error("❌ Media Error:", err);
        setError(err.message || "Could not access camera/microphone.");
      });

    // Cleanup: stop all tracks when component unmounts
    return () => {
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [videoEnabled, audioEnabled]);

  return { stream, error };
}
