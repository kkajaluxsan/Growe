import { useRef, useEffect, useState } from 'react';
import Button from '../../components/ui/Button';

export default function Whiteboard({ socket, meetingId, onClose }) {
  const canvasRef = useRef(null);
  const contextRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#4f46e5');
  const posRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const parent = canvas.parentElement;
    canvas.width = parent.clientWidth * 2;
    canvas.height = parent.clientHeight * 2;
    canvas.style.width = '100%';
    canvas.style.height = '100%';

    const context = canvas.getContext('2d');
    context.scale(2, 2);
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.strokeStyle = color;
    context.lineWidth = 4;
    contextRef.current = context;
  }, []);

  useEffect(() => {
    if (contextRef.current) {
      contextRef.current.strokeStyle = color;
    }
  }, [color]);

  useEffect(() => {
    if (!socket) return;
    
    const handleDraw = ({ stroke }) => {
      const context = contextRef.current;
      if (!context) return;
      
      const prevColor = context.strokeStyle;
      context.beginPath();
      context.moveTo(stroke.x0, stroke.y0);
      context.lineTo(stroke.x1, stroke.y1);
      context.strokeStyle = stroke.color;
      context.stroke();
      context.closePath();
      context.strokeStyle = prevColor; 
    };

    const handleClear = () => {
      const canvas = canvasRef.current;
      const context = contextRef.current;
      if (context && canvas) {
        context.clearRect(0, 0, canvas.width, canvas.height);
      }
    };

    socket.on('whiteboard-draw', handleDraw);
    socket.on('whiteboard-clear', handleClear);

    return () => {
      socket.off('whiteboard-draw', handleDraw);
      socket.off('whiteboard-clear', handleClear);
    };
  }, [socket]);

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if (e.touches && e.touches.length > 0) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startDrawing = (e) => {
    const { x, y } = getCoordinates(e);
    posRef.current = { x, y };
    setIsDrawing(true);
  };

  const finishDrawing = () => {
    setIsDrawing(false);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault(); 
    const { x, y } = getCoordinates(e);
    
    const stroke = {
      x0: posRef.current.x,
      y0: posRef.current.y,
      x1: x,
      y1: y,
      color,
    };

    const context = contextRef.current;
    context.beginPath();
    context.moveTo(stroke.x0, stroke.y0);
    context.lineTo(stroke.x1, stroke.y1);
    context.stroke();
    context.closePath();

    if (socket && meetingId) {
      socket.emit('whiteboard-draw', { meetingId, stroke });
    }

    posRef.current = { x, y };
  };

  const clearWhiteboard = () => {
    const canvas = canvasRef.current;
    const context = contextRef.current;
    if (context && canvas) {
      context.clearRect(0, 0, canvas.width, canvas.height);
      if (socket && meetingId) {
        socket.emit('whiteboard-clear', { meetingId });
      }
    }
  };

  const colors = ['#4f46e5', '#ec4899', '#10b981', '#f59e0b', '#ef4444', '#1e293b'];

  return (
    <div className="flex flex-col bg-slate-50 dark:bg-slate-900 rounded-2xl shadow-xl overflow-hidden border border-slate-200 dark:border-slate-700 w-full h-[600px] max-h-[80vh]">
      <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-4">
          <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <span className="text-xl">🎨</span> Live Whiteboard
          </h3>
          <div className="flex gap-2">
            {colors.map(c => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-6 h-6 rounded-full border-2 transition-transform ${color === c ? 'scale-110 border-slate-500 shadow-md' : 'border-transparent'}`}
                style={{ backgroundColor: c }}
                aria-label="Color selector"
              />
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="danger" onClick={clearWhiteboard}>Clear</Button>
          <Button size="sm" variant="secondary" onClick={onClose}>Close</Button>
        </div>
      </div>
      
      <div className="flex-1 w-full h-full relative overflow-hidden touch-none">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseUp={finishDrawing}
          onMouseOut={finishDrawing}
          onMouseMove={draw}
          onTouchStart={startDrawing}
          onTouchEnd={finishDrawing}
          onTouchMove={draw}
          className="cursor-crosshair bg-white dark:bg-slate-950 absolute inset-0"
        />
      </div>
    </div>
  );
}
