// client/src/webrtc/useMedia.js
import { useState, useEffect } from "react";

export default function useMedia() {
  const [stream, setStream] = useState(null);

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then(setStream)
      .catch((err) => console.error("Media Error:", err));
  }, []);

  return stream;
}