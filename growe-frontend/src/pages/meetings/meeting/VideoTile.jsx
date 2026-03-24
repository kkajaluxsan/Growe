import { useEffect, useRef, useState } from 'react';

function TileOverlays({ name, muted, handRaised, screenLabel }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 bg-gradient-to-t from-black/90 via-black/50 to-transparent pt-14 pb-3 px-3">
      <div className="flex items-end justify-between gap-2">
        <span className="min-w-0 truncate text-sm font-medium text-white drop-shadow-md">{name}</span>
        <div className="flex shrink-0 items-center gap-1.5">
          {muted && (
            <span
              className="flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-amber-300"
              title="Muted"
              aria-label="Muted"
            >
              🔇
            </span>
          )}
          {handRaised && (
            <span className="text-lg" title="Hand raised" aria-hidden>
              ✋
            </span>
          )}
          {screenLabel && (
            <span className="rounded-md bg-amber-500/90 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-900">
              {screenLabel}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function CameraOffPlaceholder({ name, email }) {
  const initials =
    (name || email || '?')
      .split(/\s+/)
      .filter(Boolean)
      .map((s) => s[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || '?';
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 via-slate-900 to-black">
      <div
        className="flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-slate-600/90 to-slate-800 text-3xl font-semibold text-white shadow-xl ring-4 ring-white/10"
        aria-hidden
      >
        {initials}
      </div>
      <p className="mt-3 text-xs font-medium text-slate-400">Camera is off</p>
    </div>
  );
}

/** Local participant — parent owns video ref for WebRTC. */
export function LocalVideoTile({
  videoRef,
  name,
  isSpeaking,
  muted,
  cameraOff,
  handRaised,
  screenSharing,
  displayName,
  email,
}) {
  const tileRef = useRef(null);

  return (
    <div
      ref={tileRef}
      className={`meeting-local-tile group/tile relative overflow-hidden rounded-2xl bg-slate-900 shadow-lg ring-2 transition-all duration-200 ${
        isSpeaking ? 'ring-growe shadow-[0_0_24px_-4px_rgba(76,245,183,0.45)]' : 'ring-white/10 hover:ring-white/20'
      } hover:shadow-xl hover:scale-[1.005]`}
    >
      <div className="relative aspect-video w-full bg-slate-950">
        <video ref={videoRef} autoPlay muted playsInline className="h-full w-full object-cover" />
        {cameraOff && <CameraOffPlaceholder name={displayName} email={email} />}
        <button
          type="button"
          className="absolute right-3 top-3 z-40 rounded-xl bg-black/50 px-2 py-1 text-xs font-medium text-white opacity-0 backdrop-blur-sm transition-opacity duration-200 hover:bg-black/70 group-hover/tile:opacity-100"
          onClick={() => tileRef.current?.requestFullscreen?.().catch(() => {})}
        >
          Fullscreen
        </button>
        <TileOverlays
          name={name}
          muted={muted}
          handRaised={handRaised}
          screenLabel={screenSharing ? 'Sharing' : null}
        />
      </div>
    </div>
  );
}

/** Remote participant — stream attached internally. */
export function RemoteVideoTile({ userId, stream, handRaised, isSpeaking, displayName }) {
  const videoRef = useRef(null);
  const tileRef = useRef(null);
  const [cameraOff, setCameraOff] = useState(false);

  useEffect(() => {
    if (videoRef.current && stream) videoRef.current.srcObject = stream;
  }, [stream]);

  useEffect(() => {
    if (!stream) {
      setCameraOff(true);
      return;
    }
    const track = stream.getVideoTracks()[0];
    if (!track) {
      setCameraOff(true);
      return;
    }
    const sync = () => setCameraOff(!track.enabled || track.muted);
    sync();
    track.addEventListener('mute', sync);
    track.addEventListener('unmute', sync);
    return () => {
      track.removeEventListener('mute', sync);
      track.removeEventListener('unmute', sync);
    };
  }, [stream]);

  const label = displayName || `Guest · ${String(userId).slice(0, 8)}`;

  return (
    <div
      ref={tileRef}
      className={`meeting-remote-tile group/tile relative overflow-hidden rounded-2xl bg-slate-900 shadow-lg ring-2 transition-all duration-200 ${
        isSpeaking ? 'ring-growe shadow-[0_0_24px_-4px_rgba(76,245,183,0.45)]' : 'ring-white/10 hover:ring-white/20'
      } hover:shadow-xl hover:scale-[1.005]`}
    >
      <div className="relative aspect-video w-full bg-slate-950">
        <video ref={videoRef} autoPlay playsInline className="h-full w-full object-cover" />
        {cameraOff && <CameraOffPlaceholder name={label} email={null} />}
        <button
          type="button"
          className="absolute right-3 top-3 z-40 rounded-xl bg-black/50 px-2 py-1 text-xs font-medium text-white opacity-0 backdrop-blur-sm transition-opacity duration-200 hover:bg-black/70 group-hover/tile:opacity-100"
          onClick={() => tileRef.current?.requestFullscreen?.().catch(() => {})}
        >
          Fullscreen
        </button>
        <TileOverlays name={label} muted={false} handRaised={handRaised} screenLabel={null} />
      </div>
    </div>
  );
}
