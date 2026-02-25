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

  return (
    <div className="fixed inset-0 z-[9999] bg-black overflow-hidden">

      {/* TIMER */}
      {callStatus === "connected" && (
        <div className="absolute top-6 w-full flex justify-center z-50">
          <div className="bg-black bg-opacity-60 px-4 py-1 rounded-full text-white text-sm">
            {formatTime(callDuration)}
          </div>
        </div>
      )}
{/* REMOTE VIDEO */}
<video
  ref={remoteVideoRef}
  autoPlay
  playsInline
  onClick={() => setIsLocalFull(prev => !prev)}
  className={`absolute object-cover transition-all duration-300 ${
    callStatus === "connected" && callType === "video"
      ? isLocalFull
        ? "bottom-6 right-6 w-48 h-32 rounded-lg border-2 border-white z-40 cursor-pointer"
        : "inset-0 w-full h-full z-10"
      : "opacity-0 pointer-events-none"
  }`}
/>

{/* LOCAL VIDEO */}
<video
  ref={localVideoRef}
  autoPlay
  playsInline
  muted
  onClick={() => setIsLocalFull(prev => !prev)}
  className={`absolute object-cover transition-all duration-300 ${
    callStatus === "connected" && callType === "video"
      ? isLocalFull
        ? "inset-0 w-full h-full z-10"
        : "bottom-6 right-6 w-48 h-32 rounded-lg border-2 border-white z-40 cursor-pointer"
      : "opacity-0 pointer-events-none"
  }`}
/>
      

      {/* CALLING / INCOMING */}
      {(callStatus === "calling" || callStatus === "incoming") && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
          <div className="w-44 h-44 rounded-full bg-gray-700 flex items-center justify-center text-4xl">
            👤
          </div>

          <h2 className="mt-6 text-xl font-semibold">
            {callStatus === "calling" && "Calling..."}
            {callStatus === "incoming" && "Incoming Call"}
          </h2>

          {callStatus === "incoming" && (
            <div className="flex gap-4 mt-6">
              <button
                onClick={acceptCall}
                className="bg-green-600 px-6 py-3 rounded-full"
              >
                Accept
              </button>

              <button
                onClick={rejectCall}
                className="bg-red-600 px-6 py-3 rounded-full"
              >
                Reject
              </button>
            </div>
          )}
        </div>
      )}

      {/* AUDIO CONNECTED */}
      {callStatus === "connected" && callType === "audio" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
          <div className="w-44 h-44 rounded-full bg-gray-700 flex items-center justify-center text-4xl">
            👤
          </div>

          <h2 className="mt-6 text-xl font-semibold">Connected</h2>

          <p className="mt-2 text-lg text-gray-300">
            {formatTime(callDuration)}
          </p>
        </div>
      )}
{callStatus === "connected" && (
  <div className="absolute bottom-24 w-full flex justify-center gap-4 z-50">

    <button
      onClick={toggleMute}
      className="bg-gray-700 px-4 py-2 rounded-full text-white"
    >
      {isMuted ? "🔈 Unmute" : "🔇 Mute"}
    </button>

    {callType === "video" && (
      <button
        onClick={toggleCamera}
        className="bg-gray-700 px-4 py-2 rounded-full text-white"
      >
        {isCameraOff ? "📷 On" : "🚫 Off"}
      </button>
    )}

  </div>
)}

    {callStatus === "connected" && (
  <div className="absolute bottom-8 w-full flex justify-center z-50">
    <button
      onClick={endCall}
      className="bg-red-600 px-6 py-3 rounded-full text-white"
    >
      🔴 End Call
    </button>
  </div>
)}

      {/* IDLE */}
    {callStatus === "idle" && (
  <div className="absolute inset-0 flex items-center justify-center gap-6 z-50">
    <button
      onClick={startVideoCall}
      className="bg-blue-600 px-6 py-3 rounded-full text-white"
    >
      📹 Video
    </button>

    <button
      onClick={startAudioCall}
      className="bg-green-600 px-6 py-3 rounded-full text-white"
    >
      📞 Audio
    </button>
  </div>
)}
    </div>
  );
}
