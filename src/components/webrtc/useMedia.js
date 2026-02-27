// client/src/webrtc/useMedia.js
import { useState, useEffect } from "react";

/**
 * Returns { stream, error }
 * stream is null until camera/mic permission is granted.
 */
export default function useMedia(videoEnabled = true, audioEnabled = true) {
  const [stream, setStream] = useState(null);
  const [error, setError]   = useState(null);

  useEffect(() => {
    let active = true;
    let acquired = null;

    navigator.mediaDevices
      .getUserMedia({ video: videoEnabled, audio: audioEnabled })
      .then((s) => {
        if (!active) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        acquired = s;
        setStream(s);
      })
      .catch((err) => {
        console.error("❌ getUserMedia error:", err);
        setError(err.message || "Could not access camera/microphone.");
      });

    return () => {
      active = false;
      if (acquired) {
        acquired.getTracks().forEach((t) => t.stop());
      }
    };
  }, [videoEnabled, audioEnabled]);

  return { stream, error };
}
