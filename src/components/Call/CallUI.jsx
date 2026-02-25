import { useState } from "react";

export default function CallUI({
  localVideoRef,
  remoteVideoRef,
  startVideoCall,
  startAudioCall,
  acceptCall,
  rejectCall,
  endCall,
  callStatus,
  callType,
  toggleMute,
  toggleCamera,
  isMuted,
  isCameraOff,
  callDuration,
  formatTime
}) {

  const [isLocalFull, setIsLocalFull] = useState(false);
  const isVideoConnected =
    callStatus === "connected" && callType === "video";

  return (
    <div className="fixed inset-0 z-[9999] bg-black overflow-hidden">

      {/* ALWAYS MOUNTED VIDEO ELEMENTS */}
      <video
        ref={remoteVideoRef}
        autoPlay
        playsInline
        className={`absolute object-cover ${
          isVideoConnected
            ? isLocalFull
              ? "bottom-6 right-6 w-48 h-32 rounded-lg border-2 border-white z-40"
              : "inset-0 w-full h-full z-10"
            : "hidden"
        }`}
      />

      <video
        ref={localVideoRef}
        autoPlay
        playsInline
        muted
        className={`absolute object-cover ${
          isVideoConnected
            ? isLocalFull
              ? "inset-0 w-full h-full z-10"
              : "bottom-6 right-6 w-48 h-32 rounded-lg border-2 border-white z-40"
            : "hidden"
        }`}
      />

      {callStatus === "idle" && (
        <div className="absolute inset-0 flex items-center justify-center gap-6">
          <button onClick={startVideoCall} className="bg-blue-600 px-6 py-3 rounded-full text-white">
            📹 Video
          </button>
          <button onClick={startAudioCall} className="bg-green-600 px-6 py-3 rounded-full text-white">
            📞 Audio
          </button>
        </div>
      )}

      {callStatus === "incoming" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
          <h2>Incoming Call</h2>
          <div className="flex gap-4 mt-4">
            <button onClick={acceptCall} className="bg-green-600 px-6 py-3 rounded-full">Accept</button>
            <button onClick={rejectCall} className="bg-red-600 px-6 py-3 rounded-full">Reject</button>
          </div>
        </div>
      )}

      {callStatus === "connected" && (
        <>
          <div className="absolute bottom-24 w-full flex justify-center gap-4">
            <button onClick={toggleMute} className="bg-gray-700 px-4 py-2 rounded-full text-white">
              {isMuted ? "🔈 Unmute" : "🔇 Mute"}
            </button>
            {callType === "video" && (
              <button onClick={toggleCamera} className="bg-gray-700 px-4 py-2 rounded-full text-white">
                {isCameraOff ? "📷 On" : "🚫 Off"}
              </button>
            )}
          </div>

          <div className="absolute bottom-8 w-full flex justify-center">
            <button onClick={endCall} className="bg-red-600 px-6 py-3 rounded-full text-white">
              🔴 End Call
            </button>
          </div>
        </>
      )}
    </div>
  );
}
