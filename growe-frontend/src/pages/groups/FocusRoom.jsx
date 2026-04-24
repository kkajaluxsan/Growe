import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../../context/SocketContext';
import Button from '../../components/ui/Button';

export default function FocusRoom() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { socket } = useSocket();
  const [endTime, setEndTime] = useState(null);
  const [timeLeft, setTimeLeft] = useState('25:00');
  const [isFocusing, setIsFocusing] = useState(false);

  useEffect(() => {
    if (!socket || !id) return;

    socket.emit('join-focus-room', { groupId: id });

    socket.on('focus-timer-started', ({ endTime: newEndTime }) => {
      setEndTime(newEndTime);
      setIsFocusing(true);
    });

    socket.on('focus-timer-stopped', () => {
      setEndTime(null);
      setIsFocusing(false);
      setTimeLeft('25:00');
    });

    return () => {
      socket.emit('leave-focus-room', { groupId: id });
      socket.off('focus-timer-started');
      socket.off('focus-timer-stopped');
    };
  }, [socket, id]);

  useEffect(() => {
    if (!endTime) return;

    const interval = setInterval(() => {
      const remaining = Math.max(0, endTime - Date.now());
      if (remaining === 0) {
        setIsFocusing(false);
        setEndTime(null);
        setTimeLeft('00:00');
        clearInterval(interval);
      } else {
        const mins = Math.floor(remaining / 60000);
        const secs = Math.floor((remaining % 60000) / 1000);
        setTimeLeft(`${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [endTime]);

  const startTimer = () => {
    if (socket && id) {
      const eTime = Date.now() + 25 * 60 * 1000;
      socket.emit('start-focus-timer', { groupId: id, endTime: eTime });
    }
  };

  const stopTimer = () => {
    if (socket && id) {
      socket.emit('stop-focus-timer', { groupId: id });
    }
  };

  return (
    <div className="min-h-[calc(100vh-7rem)] flex flex-col items-center justify-center bg-gray-900 rounded-2xl -mx-6 md:-mx-8 p-6 text-white relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-purple-600/30 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 right-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-[120px]" />
      </div>

      <div className="z-10 text-center max-w-lg w-full flex flex-col items-center">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Group Focus Room</h1>
        <p className="text-slate-400 mb-12">
          Sync your pomodoro timer with the rest of your study group. Stay disciplined.
        </p>

        <div className="relative mb-12">
          <svg className="w-64 h-64 transform -rotate-90">
            <circle
              cx="128"
              cy="128"
              r="120"
              stroke="currentColor"
              strokeWidth="4"
              fill="transparent"
              className="text-slate-800"
            />
            {isFocusing && endTime && (
              <circle
                cx="128"
                cy="128"
                r="120"
                stroke="currentColor"
                strokeWidth="8"
                fill="transparent"
                strokeDasharray={2 * Math.PI * 120}
                strokeDashoffset={
                  2 * Math.PI * 120 * (1 - Math.max(0, endTime - Date.now()) / (25 * 60 * 1000))
                }
                className="text-indigo-500 transition-all duration-100 ease-linear"
              />
            )}
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-6xl font-mono font-light tracking-widest">{timeLeft}</span>
          </div>
        </div>

        <div className="flex gap-4">
          {!isFocusing ? (
            <Button
              className="px-8 py-3 bg-white text-slate-900 hover:bg-slate-200 rounded-full font-bold shadow-lg transition-transform hover:scale-105"
              onClick={startTimer}
            >
              Start 25m Focus
            </Button>
          ) : (
            <Button
              className="px-8 py-3 bg-red-500/20 text-red-100 hover:bg-red-500/30 border border-red-500/50 rounded-full"
              onClick={stopTimer}
            >
              Stop Timer
            </Button>
          )}
          <Button
            variant="secondary"
            className="px-8 py-3 rounded-full bg-slate-800 border-none text-slate-300 hover:bg-slate-700"
            onClick={() => navigate(`/groups/${id}`)}
          >
            Leave Room
          </Button>
        </div>
      </div>
    </div>
  );
}
