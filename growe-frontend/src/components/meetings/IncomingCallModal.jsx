import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../../context/SocketContext';

// Simple synthetic ringtone to avoid needing an external audio file
const playRingtone = (audioCtxRef) => {
  try {
    if (!window.AudioContext && !window.webkitAudioContext) return null;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioContext();
    audioCtxRef.current = ctx;

    const playBeep = () => {
      if (ctx.state === 'closed') return;
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime); // A4
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1); // A5
      
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime + 0.5);
      gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.6);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.6);
    };

    // Play ringtone pattern: beep... beep... pause... repeat
    const interval = setInterval(() => {
      playBeep();
      setTimeout(playBeep, 800);
    }, 3000);
    
    playBeep();
    setTimeout(playBeep, 800);

    return () => {
      clearInterval(interval);
      if (ctx.state !== 'closed') ctx.close();
    };
  } catch (err) {
    console.warn('Audio Context not supported or blocked:', err);
    return () => {};
  }
};

export default function IncomingCallModal() {
  const { socket } = useSocket();
  const navigate = useNavigate();
  const [callData, setCallData] = useState(null);
  const audioCtxRef = useRef(null);
  const stopAudioRef = useRef(null);
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (!socket) return;

    const handleIncomingCall = (data) => {
      setCallData(data);
      
      // Attempt to play ringtone
      stopAudioRef.current = playRingtone(audioCtxRef);

      // Auto dismiss after 60 seconds
      timeoutRef.current = setTimeout(() => {
        handleDecline();
      }, 60000);
    };

    socket.on('incoming-meeting-call', handleIncomingCall);

    return () => {
      socket.off('incoming-meeting-call', handleIncomingCall);
    };
  }, [socket]);

  const cleanup = () => {
    if (stopAudioRef.current) stopAudioRef.current();
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setCallData(null);
  };

  const handleAccept = () => {
    const meetingId = callData.meetingId;
    cleanup();
    navigate(`/meetings/${meetingId}`);
  };

  const handleDecline = () => {
    cleanup();
  };

  if (!callData) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden max-w-sm w-full mx-4 border border-slate-200 dark:border-slate-700 zoom-in-95 animate-in duration-300">
        <div className="p-6 text-center space-y-6">
          <div className="mx-auto w-20 h-20 bg-growe/20 dark:bg-growe/10 rounded-full flex items-center justify-center relative shadow-[0_0_20px_rgba(76,245,183,0.3)]">
            <div className="absolute inset-0 bg-growe/20 rounded-full animate-ping opacity-75"></div>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-growe-dark dark:text-growe" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="7" width="15" height="10" rx="2" />
              <path d="m17 10 5-3v10l-5-3z" />
            </svg>
          </div>
          
          <div className="space-y-1">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              {callData.callerName}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
              Incoming Video Call...
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 truncate">
              {callData.meetingTitle || 'Study Group Session'}
            </p>
          </div>

          <div className="flex items-center justify-center gap-6 pt-4">
            <button 
              onClick={handleDecline}
              className="flex flex-col items-center gap-2 group"
            >
              <div className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-lg transition-transform transform group-hover:scale-105 active:scale-95">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91" />
                  <line x1="23" y1="1" x2="1" y2="23" />
                </svg>
              </div>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Decline</span>
            </button>

            <button 
              onClick={handleAccept}
              className="flex flex-col items-center gap-2 group"
            >
              <div className="w-14 h-14 rounded-full bg-green-500 hover:bg-green-600 text-white flex items-center justify-center shadow-[0_0_15px_rgba(34,197,94,0.4)] transition-transform transform group-hover:scale-105 active:scale-95">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="7" width="15" height="10" rx="2" />
                  <path d="m17 10 5-3v10l-5-3z" />
                </svg>
              </div>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Accept</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
