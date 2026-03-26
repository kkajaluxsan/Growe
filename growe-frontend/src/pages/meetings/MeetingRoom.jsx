import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import ShareButton from '../../components/ui/ShareButton';
import ChatWindow from '../messaging/ChatWindow';
import { LocalVideoTile, RemoteVideoTile } from './meeting/VideoTile';
import MeetingControlBar from './meeting/MeetingControlBar';
import { useToast } from '../../context/ToastContext';

function useMeetingDuration(started) {
  const [duration, setDuration] = useState('0:00');
  useEffect(() => {
    if (!started) return;
    const start = Date.now();
    const t = setInterval(() => {
      const s = Math.floor((Date.now() - start) / 1000);
      const m = Math.floor(s / 60);
      setDuration(`${m}:${String(s % 60).padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(t);
  }, [started]);
  return duration;
}

function videoGridClass(participantCount) {
  if (participantCount <= 1) return 'grid grid-cols-1 max-w-5xl mx-auto w-full';
  if (participantCount === 2) return 'grid grid-cols-1 sm:grid-cols-2 max-w-6xl mx-auto w-full';
  if (participantCount <= 4) return 'grid grid-cols-1 sm:grid-cols-2 max-w-7xl mx-auto w-full';
  return 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 max-w-[1920px] mx-auto w-full';
}

export default function MeetingRoom() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { socket } = useSocket();
  const { toast } = useToast();
  const localVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const peersRef = useRef({});
  const [remoteStreams, setRemoteStreams] = useState({});
  const [participantMeta, setParticipantMeta] = useState({});
  const [muted, setMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);
  const [error, setError] = useState('');
  const [joined, setJoined] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [meetingTitle, setMeetingTitle] = useState('Meeting');
  const [meetingConversation, setMeetingConversation] = useState(null);
  const [chatPanelOpen, setChatPanelOpen] = useState(false);
  const [participantsOpen, setParticipantsOpen] = useState(false);
  const [screenSharing, setScreenSharing] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [handsRaised, setHandsRaised] = useState({});
  const [speakingUser, setSpeakingUser] = useState(null);
  const screenStreamRef = useRef(null);
  const originalVideoTrackRef = useRef(null);
  const meetingContainerRef = useRef(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const duration = useMeetingDuration(joined);
  const connected = socket?.connected ?? false;

  const participantCount = 1 + Object.keys(remoteStreams).length;
  const gridClass = videoGridClass(participantCount);

  useEffect(() => {
    const el = meetingContainerRef.current;
    if (!el) return;
    const onFullScreenChange = () => setIsFullScreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFullScreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullScreenChange);
  }, []);

  const toggleFullScreen = async () => {
    const el = meetingContainerRef.current;
    if (!el) return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await el.requestFullscreen();
      }
    } catch (err) {
      console.warn('Fullscreen error:', err);
    }
  };

  useEffect(() => {
    api.get(`/meetings/${id}`)
      .then(({ data }) => setMeetingTitle(data?.title || 'Meeting'))
      .catch((err) => toast.error(err.response?.data?.error || 'Failed to load meeting'));
  }, [id, toast]);

  useEffect(() => {
    if (!id || !user) return;
    api
      .post(`/conversations/meeting/${id}`)
      .then(({ data }) => setMeetingConversation(data))
      .catch((err) => toast.error(err.response?.data?.error || 'Failed to load meeting chat'));
  }, [id, user, toast]);

  useEffect(() => {
    if (!socket || !user) return;

    const initMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;

        socket.emit('join-room', { meetingId: id }, (res) => {
          if (res?.error) {
            setError(res.error);
            return;
          }
          setJoined(true);
          if (Array.isArray(res?.existingParticipants)) {
            res.existingParticipants.forEach((p) => {
              const uid = p?.userId;
              if (uid && uid !== user.id) {
                if (p?.userEmail) {
                  setParticipantMeta((prev) => ({ ...prev, [uid]: { email: p.userEmail } }));
                }
                createPeer(uid);
              }
            });
          }
        });
      } catch (err) {
        setError('Could not access camera/microphone');
      }
    };

    initMedia();

    socket.on('user-joined', ({ userId, userEmail }) => {
      if (userId && userEmail) {
        setParticipantMeta((prev) => ({ ...prev, [userId]: { email: userEmail } }));
      }
      createPeer(userId);
    });

    socket.on('user-left', ({ userId }) => {
      if (peersRef.current[userId]) {
        peersRef.current[userId].close();
        delete peersRef.current[userId];
        setRemoteStreams((prev) => {
          const next = { ...prev };
          delete next[userId];
          return next;
        });
      }
    });

    socket.on('meeting-terminated', () => {
      setError('This meeting was ended by an administrator.');
      setTimeout(() => navigate('/meetings'), 2000);
    });

    socket.on('offer', async ({ fromUserId, fromUserEmail, sdp }) => {
      if (fromUserId && fromUserEmail) {
        setParticipantMeta((prev) => ({ ...prev, [fromUserId]: { email: fromUserEmail } }));
      }
      const pc = peersRef.current[fromUserId] || createPeer(fromUserId);
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('answer', { meetingId: id, targetUserId: fromUserId, sdp: answer });
    });

    socket.on('answer', async ({ fromUserId, fromUserEmail, sdp }) => {
      if (fromUserId && fromUserEmail) {
        setParticipantMeta((prev) => ({ ...prev, [fromUserId]: { email: fromUserEmail } }));
      }
      const pc = peersRef.current[fromUserId];
      if (pc) await pc.setRemoteDescription(new RTCSessionDescription(sdp));
    });

    socket.on('ice-candidate', async ({ fromUserId, fromUserEmail, candidate }) => {
      if (fromUserId && fromUserEmail) {
        setParticipantMeta((prev) => ({ ...prev, [fromUserId]: { email: fromUserEmail } }));
      }
      const pc = peersRef.current[fromUserId];
      if (pc && candidate) await pc.addIceCandidate(new RTCIceCandidate(candidate));
    });

    socket.on('raise-hand', ({ userId: uid }) => setHandsRaised((p) => ({ ...p, [uid]: true })));
    socket.on('lower-hand', ({ userId: uid }) => setHandsRaised((p) => ({ ...p, [uid]: false })));
    socket.on('speaking', ({ userId: uid, active }) => setSpeakingUser((cur) => (active ? uid : cur === uid ? null : cur)));

    return () => {
      socket.emit('leave-room', { meetingId: id });
      Object.values(peersRef.current).forEach((pc) => pc.close());
      Object.keys(peersRef.current).forEach((k) => delete peersRef.current[k]);
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [socket, user, id, navigate]);

  const replaceVideoTrack = (newTrack) => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const existing = stream.getVideoTracks()[0];
    if (existing) existing.stop();
    if (newTrack) stream.addTrack(newTrack);
    if (localVideoRef.current?.srcObject) localVideoRef.current.srcObject = stream;
    Object.values(peersRef.current).forEach((pc) => {
      const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
      if (sender && newTrack) sender.replaceTrack(newTrack);
    });
  };

  const createPeer = (userId) => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });

    localStreamRef.current?.getTracks().forEach((track) => pc.addTrack(track, localStreamRef.current));

    pc.ontrack = (e) => {
      setRemoteStreams((prev) => ({ ...prev, [userId]: e.streams[0] }));
    };

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        socket?.emit('ice-candidate', { meetingId: id, targetUserId: userId, candidate: e.candidate });
      }
    };

    peersRef.current[userId] = pc;
    pc.createOffer().then((offer) => {
      pc.setLocalDescription(offer);
      socket?.emit('offer', { meetingId: id, targetUserId: userId, sdp: offer });
    });
    return pc;
  };

  const handleLeave = (skipConfirm) => {
    if (!skipConfirm) {
      setShowLeaveConfirm(true);
      return;
    }
    socket?.emit('leave-room', { meetingId: id });
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    Object.values(peersRef.current).forEach((pc) => pc.close());
    peersRef.current = {};
    setRemoteStreams({});
    navigate('/meetings');
  };

  const toggleMute = () => {
    const nextMuted = !muted;
    localStreamRef.current?.getAudioTracks().forEach((t) => {
      t.enabled = !nextMuted;
    });
    setMuted(nextMuted);
    socket?.emit('speaking', { meetingId: id, active: !nextMuted });
  };

  const toggleVideo = () => {
    const nextOff = !videoOff;
    localStreamRef.current?.getVideoTracks().forEach((t) => {
      t.enabled = !nextOff;
    });
    setVideoOff(nextOff);
  };

  const toggleScreenShare = async () => {
    try {
      if (screenSharing) {
        if (originalVideoTrackRef.current) {
          replaceVideoTrack(originalVideoTrackRef.current);
          originalVideoTrackRef.current = null;
        }
        screenStreamRef.current?.getTracks().forEach((t) => t.stop());
        screenStreamRef.current = null;
        setScreenSharing(false);
      } else {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        screenStreamRef.current = screenStream;
        const [videoTrack] = screenStream.getVideoTracks();
        originalVideoTrackRef.current = localStreamRef.current?.getVideoTracks()[0] ?? null;
        replaceVideoTrack(videoTrack);
        videoTrack.onended = () => toggleScreenShare();
        setScreenSharing(true);
      }
    } catch (err) {
      console.error('Screen share error:', err);
    }
  };

  const toggleHandRaise = () => {
    const next = !handRaised;
    setHandRaised(next);
    socket?.emit(next ? 'raise-hand' : 'lower-hand', { meetingId: id });
  };

  if (error) {
    return (
      <Card className="max-w-md border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
        <p className="text-red-800 dark:text-red-200 font-medium">{error}</p>
        <Button variant="primary" className="mt-4" onClick={() => navigate('/meetings')}>
          Back to Meetings
        </Button>
      </Card>
    );
  }

  return (
    <div
      ref={meetingContainerRef}
      className="relative flex min-h-[calc(100vh-7rem)] flex-col overflow-hidden rounded-2xl border border-slate-800/80 bg-gray-900 shadow-xl -mx-6 md:-mx-8"
    >
      {/* Top bar */}
      <header className="relative z-10 flex flex-shrink-0 flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-black/40 px-4 py-3 backdrop-blur-md">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-lg font-semibold text-white">{meetingTitle}</h1>
            <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-medium text-slate-300">
              {participantCount} {participantCount === 1 ? 'participant' : 'participants'}
            </span>
          </div>
          {joined && (
            <p className="mt-0.5 text-xs tabular-nums text-slate-400">
              {connected ? 'Connected · ' : 'Reconnecting · '}
              {duration}
            </p>
          )}
        </div>
        <div className="flex flex-shrink-0 flex-wrap items-center justify-end gap-2">
          <Badge variant={connected ? 'success' : 'error'}>{connected ? 'Live' : 'Offline'}</Badge>
          {!connected && joined && (
            <span className="hidden text-xs text-amber-400 sm:inline">Connection unstable</span>
          )}
          <button
            type="button"
            onClick={() => setParticipantsOpen((o) => !o)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-all duration-200 ${
              participantsOpen ? 'bg-growe/20 text-growe' : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            People
          </button>
          <button
            type="button"
            onClick={() => setChatPanelOpen((o) => !o)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-all duration-200 ${
              chatPanelOpen ? 'bg-growe/20 text-growe' : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            Chat
          </button>
          <button
            type="button"
            onClick={toggleFullScreen}
            className="rounded-full bg-white/10 px-3 py-1.5 text-sm font-medium text-white transition-all duration-200 hover:bg-white/20"
            title={isFullScreen ? 'Exit full screen' : 'Full screen'}
          >
            {isFullScreen ? 'Exit' : 'Fullscreen'}
          </button>
          <ShareButton
            title={meetingTitle}
            shareText={`Join this meeting: ${meetingTitle} on GROWE`}
            url={typeof window !== 'undefined' ? `${window.location.origin}/meetings/${id}` : ''}
            variant="secondary"
            size="sm"
            className="!shadow-none rounded-full bg-white/10 !text-white hover:!bg-white/20"
          />
        </div>
      </header>

      {/* Main + optional left participants drawer */}
      <div className="relative flex min-h-0 flex-1 flex-col lg:flex-row">
        {participantsOpen && (
          <aside
            className="absolute left-0 top-0 z-30 flex h-full w-72 max-w-[85vw] flex-col border-r border-white/10 bg-gray-950/95 shadow-2xl backdrop-blur-xl transition-transform duration-200 lg:relative lg:max-w-none"
            aria-label="Participants"
          >
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <span className="font-semibold text-white">Participants</span>
              <button
                type="button"
                onClick={() => setParticipantsOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
                aria-label="Close participants"
              >
                ×
              </button>
            </div>
            <ul className="flex-1 overflow-y-auto p-3 text-sm text-slate-200">
              <li className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2">
                <span className="h-2 w-2 shrink-0 rounded-full bg-growe" aria-hidden />
                <span className="truncate font-medium">You</span>
                {muted && <span className="text-xs text-amber-400">Muted</span>}
              </li>
              {Object.keys(remoteStreams).map((uid) => (
                <li key={uid} className="mt-1 flex items-center gap-2 rounded-xl px-3 py-2 hover:bg-white/5">
                  <span className="h-2 w-2 shrink-0 rounded-full bg-slate-500" aria-hidden />
                  <span className="truncate">
                    {participantMeta[uid]?.email || `Guest · ${String(uid).slice(0, 8)}`}
                  </span>
                  {handsRaised[uid] && <span className="text-xs">✋</span>}
                </li>
              ))}
            </ul>
          </aside>
        )}

        <div className="relative min-h-0 flex-1 overflow-y-auto pb-36 pt-4">
          {!connected && joined && (
            <div className="mx-auto mb-3 max-w-3xl rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-center text-sm text-amber-100">
              Trying to reconnect… Your call may be affected.
            </div>
          )}
          <div className={`${gridClass} gap-3 px-4 md:gap-4 lg:px-6`}>
            <LocalVideoTile
              videoRef={localVideoRef}
              name="You"
              isSpeaking={speakingUser != null && user?.id != null && String(speakingUser) === String(user.id)}
              muted={muted}
              cameraOff={videoOff}
              handRaised={handRaised}
              screenSharing={screenSharing}
              displayName={user?.displayName}
              email={user?.email}
            />
            {Object.entries(remoteStreams).map(([uid, stream]) => (
              <RemoteVideoTile
                key={uid}
                userId={uid}
                stream={stream}
                handRaised={handsRaised[uid]}
                isSpeaking={speakingUser != null && String(speakingUser) === String(uid)}
                displayName={participantMeta[uid]?.email}
              />
            ))}
          </div>
        </div>
      </div>

      <MeetingControlBar
        muted={muted}
        videoOff={videoOff}
        screenSharing={screenSharing}
        handRaised={handRaised}
        onMute={toggleMute}
        onVideo={toggleVideo}
        onShare={toggleScreenShare}
        onHand={toggleHandRaise}
        onLeave={() => handleLeave(false)}
      />

      {chatPanelOpen && meetingConversation && (
        <div className="fixed inset-y-0 right-0 z-40 flex w-full max-w-md flex-col border-l border-white/10 bg-gray-950/98 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <span className="font-semibold text-white">Meeting chat</span>
            <button
              type="button"
              onClick={() => setChatPanelOpen(false)}
              className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white"
              aria-label="Close chat"
            >
              ×
            </button>
          </div>
          <div className="min-h-0 flex-1">
            <ChatWindow
              conversationId={meetingConversation.id}
              conversation={meetingConversation}
              participants={meetingConversation.participants || []}
              onConversationLoad={() => {}}
            />
          </div>
        </div>
      )}

      {showLeaveConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setShowLeaveConfirm(false)}
        >
          <Card className="max-w-sm border-slate-600 bg-gray-900 text-white" onClick={(e) => e.stopPropagation()}>
            <p className="text-slate-200">Leave this meeting?</p>
            <div className="mt-4 flex gap-2">
              <Button variant="secondary" onClick={() => setShowLeaveConfirm(false)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={() => handleLeave(true)}>
                Leave
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
