import ControlButton from './ControlButton';
import { IconMic, IconCamera, IconScreenShare, IconHand, IconLeave } from './MeetingIcons';

export default function MeetingControlBar({
  muted,
  videoOff,
  screenSharing,
  handRaised,
  onMute,
  onVideo,
  onShare,
  onHand,
  onLeave,
  onEndMeeting,
}) {
  return (
    <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-[45] flex justify-center px-4 pb-6 pt-4">
      <div
        className="pointer-events-auto flex flex-wrap items-center justify-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-2 shadow-2xl backdrop-blur-xl md:gap-3 md:px-5 md:py-2.5"
        role="toolbar"
        aria-label="Meeting controls"
      >
        <ControlButton
          label={muted ? 'Unmute microphone' : 'Mute microphone'}
          active={muted}
          onClick={onMute}
        >
          <IconMic off={muted} />
        </ControlButton>
        <ControlButton
          label={videoOff ? 'Turn camera on' : 'Turn camera off'}
          active={videoOff}
          onClick={onVideo}
        >
          <IconCamera off={videoOff} />
        </ControlButton>
        <ControlButton
          label={screenSharing ? 'Stop sharing' : 'Share screen'}
          active={screenSharing}
          onClick={onShare}
        >
          <IconScreenShare active={screenSharing} />
        </ControlButton>
        <ControlButton
          label={handRaised ? 'Lower hand' : 'Raise hand'}
          active={handRaised}
          onClick={onHand}
        >
          <IconHand raised={handRaised} />
        </ControlButton>
        <div className="mx-1 hidden h-8 w-px bg-white/20 sm:block" aria-hidden />
        {onEndMeeting && (
          <ControlButton danger label="End Session for All" onClick={onEndMeeting}>
            <IconLeave />
          </ControlButton>
        )}
        <ControlButton danger={!onEndMeeting} label="Leave meeting" onClick={onLeave}>
          <IconLeave />
        </ControlButton>
      </div>
    </div>
  );
}
