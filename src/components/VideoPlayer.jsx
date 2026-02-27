// client/src/components/VideoPlayer.jsx
import React, { useRef, useEffect } from "react";

export default function VideoPlayer({ stream, muted }) {
  const ref = useRef();

  useEffect(() => {
    if (stream) ref.current.srcObject = stream;
  }, [stream]);

  return <video ref={ref} autoPlay playsInline muted={muted} className="rounded" />;
}