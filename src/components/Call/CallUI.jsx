export default function CallUI({
  localVideoRef,
  remoteVideoRef,
  callStatus,
  isMuted,
  isCameraOff,
  toggleMute,
  toggleCamera,
  endCall,
  callDuration,
  formatTime
}) {
  return (
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-50">

      <div className="text-white mb-4 text-lg">
        {callStatus === "connecting" && "Connecting..."}
        {callStatus === "connected" && formatTime(callDuration)}
        {callStatus === "failed" && "Connection Failed"}
      </div>

      <div className="flex gap-4">
        <div
          ref={remoteVideoRef}
          className="w-[400px] h-[300px] bg-gray-800 rounded-lg overflow-hidden"
        />
        <div
          ref={localVideoRef}
          className="w-[200px] h-[150px] bg-gray-700 rounded-lg overflow-hidden"
        />
      </div>

      <div className="flex gap-4 mt-6">
        <button
          onClick={toggleMute}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg"
        >
          {isMuted ? "Unmute" : "Mute"}
        </button>

        <button
          onClick={toggleCamera}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg"
        >
          {isCameraOff ? "Camera On" : "Camera Off"}
        </button>

        <button
          onClick={endCall}
          className="px-4 py-2 bg-red-600 text-white rounded-lg"
        >
          End Call
        </button>
      </div>
    </div>
  );
}
