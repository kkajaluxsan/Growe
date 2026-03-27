import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

const DirectCallContext = createContext(null);

function getIceServers() {
  const raw = import.meta.env.VITE_WEBRTC_ICE_SERVERS;
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch {
      // ignore
    }
  }
  return [{ urls: 'stun:stun.l.google.com:19302' }];
}

export function useDirectCall() {
  const ctx = useContext(DirectCallContext);
  if (!ctx) {
    throw new Error('useDirectCall must be used within DirectCallProvider');
  }
  return ctx;
}

export function DirectCallProvider({ children }) {
  const { socket } = useSocket();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [status, setStatus] = useState('idle'); // idle | incoming | outgoing | connecting | connected
  const [incoming, setIncoming] = useState(null);
  const [peerLabel, setPeerLabel] = useState('');
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [muted, setMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState(null);

  const pcRef = useRef(null);
  const sessionRef = useRef(null);
  const incomingRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const [callUiType, setCallUiType] = useState('voice');

  const hangUpInternal = useCallback(
    (silent) => {
      const s = sessionRef.current;
      if (s && socket) {
        socket.emit('dm-call-end', { conversationId: s.conversationId, callId: s.callId });
      }
      pcRef.current?.close();
      pcRef.current = null;
      setLocalStream((prev) => {
        prev?.getTracks().forEach((t) => t.stop());
        return null;
      });
      setRemoteStream(null);
      setMuted(false);
      setVideoOff(false);
      sessionRef.current = null;
      setIncoming(null);
      incomingRef.current = null;
      setStatus('idle');
      setPeerLabel('');
      setActiveConversationId(null);
      setCallUiType('voice');
      if (!silent) {
        // toast optional
      }
    },
    [socket]
  );

  const cleanupOnUnmount = useCallback(() => {
    const s = sessionRef.current;
    if (s && socket) {
      socket.emit('dm-call-end', { conversationId: s.conversationId, callId: s.callId });
    }
    pcRef.current?.close();
    pcRef.current = null;
    setLocalStream((prev) => {
      prev?.getTracks().forEach((t) => t.stop());
      return null;
    });
    setRemoteStream(null);
    sessionRef.current = null;
  }, [socket]);

  useEffect(() => () => cleanupOnUnmount(), [cleanupOnUnmount]);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  useEffect(() => {
    if (remoteAudioRef.current && remoteStream && callUiType === 'voice') {
      remoteAudioRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, callUiType]);

  useEffect(() => {
    if (!socket || !user?.id) return;

    const onIncoming = (payload) => {
      if (sessionRef.current) {
        socket.emit('dm-call-decline', {
          conversationId: payload.conversationId,
          callId: payload.callId,
        });
        return;
      }
      setIncoming(payload);
      incomingRef.current = payload;
      setCallUiType(payload.callType || 'voice');
      setPeerLabel(payload.fromDisplayName || 'Someone');
      setStatus('incoming');
      navigate('/messages');
    };

    const onAccepted = async ({ callId, conversationId }) => {
      const s = sessionRef.current;
      if (!s || s.callId !== callId || s.role !== 'caller') return;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: s.callType === 'video',
        });
        setLocalStream(stream);
        const pc = new RTCPeerConnection({ iceServers: getIceServers() });
        pcRef.current = pc;
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));
        pc.onicecandidate = (e) => {
          if (e.candidate && sessionRef.current?.callId === callId) {
            socket.emit('dm-call-ice', {
              conversationId,
              callId,
              candidate: e.candidate.toJSON(),
            });
          }
        };
        pc.ontrack = (e) => {
          if (e.streams[0]) setRemoteStream(e.streams[0]);
        };
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('dm-call-offer', {
          conversationId,
          callId,
          sdp: pc.localDescription,
        });
        setStatus('connected');
      } catch (err) {
        toast.error(err.message || 'Could not access camera or microphone');
        socket.emit('dm-call-cancel', { conversationId, callId });
        sessionRef.current = null;
        hangUpInternal(true);
      }
    };

    const onOffer = async ({ callId, conversationId, sdp }) => {
      const s = sessionRef.current;
      if (!s || s.callId !== callId || s.role !== 'callee') return;
      const pc = pcRef.current;
      if (!pc) return;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('dm-call-answer', {
          conversationId,
          callId,
          sdp: pc.localDescription,
        });
        setStatus('connected');
      } catch (err) {
        console.error(err);
        toast.error('Could not connect the call');
        hangUpInternal(true);
      }
    };

    const onAnswer = async ({ callId, sdp }) => {
      const s = sessionRef.current;
      if (!s || s.callId !== callId || s.role !== 'caller') return;
      const pc = pcRef.current;
      if (!pc) return;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      } catch (err) {
        console.error(err);
      }
    };

    const onIce = async ({ callId, candidate }) => {
      if (sessionRef.current?.callId !== callId) return;
      const pc = pcRef.current;
      if (!pc || !candidate) return;
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch {
        // race with description — safe to ignore
      }
    };

    const onEnded = ({ callId, reason }) => {
      if (incomingRef.current?.callId === callId) {
        setIncoming(null);
        incomingRef.current = null;
        setStatus('idle');
        setPeerLabel('');
        if (reason === 'cancelled') toast.info('Caller cancelled');
        return;
      }
      if (sessionRef.current?.callId !== callId) return;
      if (reason === 'declined') toast.info('Call declined');
      else if (reason === 'cancelled') toast.info('Call cancelled');
      else if (reason === 'ended') toast.info('Call ended');
      hangUpInternal(true);
    };

    socket.on('dm-incoming-call', onIncoming);
    socket.on('dm-call-accepted', onAccepted);
    socket.on('dm-call-offer', onOffer);
    socket.on('dm-call-answer', onAnswer);
    socket.on('dm-call-ice', onIce);
    socket.on('dm-call-ended', onEnded);

    return () => {
      socket.off('dm-incoming-call', onIncoming);
      socket.off('dm-call-accepted', onAccepted);
      socket.off('dm-call-offer', onOffer);
      socket.off('dm-call-answer', onAnswer);
      socket.off('dm-call-ice', onIce);
      socket.off('dm-call-ended', onEnded);
    };
  }, [socket, user?.id, navigate, toast, hangUpInternal]);

  const startOutgoingCall = useCallback(
    (conversationId, callType, peerName) => {
      if (!socket) return;
      if (sessionRef.current || incoming) {
        toast.error('You are already in a call');
        return;
      }
      const callId = crypto.randomUUID();
      sessionRef.current = { callId, conversationId, callType, role: 'caller' };
      setCallUiType(callType);
      setActiveConversationId(conversationId);
      setPeerLabel(peerName || 'Contact');
      setStatus('outgoing');
      socket.emit('dm-call-invite', { conversationId, callId, callType }, (res) => {
        if (res?.error) {
          toast.error(res.error);
          sessionRef.current = null;
          setStatus('idle');
          setActiveConversationId(null);
        }
      });
    },
    [socket, toast, incoming]
  );

  const cancelOutgoing = useCallback(() => {
    const s = sessionRef.current;
    if (!s || s.role !== 'caller' || !socket) return;
    socket.emit('dm-call-cancel', { conversationId: s.conversationId, callId: s.callId });
    sessionRef.current = null;
    setStatus('idle');
    setActiveConversationId(null);
  }, [socket]);

  const acceptIncoming = useCallback(async () => {
    const inc = incoming;
    if (!inc || !socket) return;
    setIncoming(null);
    incomingRef.current = null;
    sessionRef.current = {
      callId: inc.callId,
      conversationId: inc.conversationId,
      callType: inc.callType,
      role: 'callee',
    };
    setActiveConversationId(inc.conversationId);
    setStatus('connecting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: inc.callType === 'video',
      });
      setLocalStream(stream);
      const pc = new RTCPeerConnection({ iceServers: getIceServers() });
      pcRef.current = pc;
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      pc.onicecandidate = (e) => {
        if (e.candidate && sessionRef.current?.callId === inc.callId) {
          socket.emit('dm-call-ice', {
            conversationId: inc.conversationId,
            callId: inc.callId,
            candidate: e.candidate.toJSON(),
          });
        }
      };
      pc.ontrack = (e) => {
        if (e.streams[0]) setRemoteStream(e.streams[0]);
      };
      socket.emit('dm-call-accept', { conversationId: inc.conversationId, callId: inc.callId }, (res) => {
        if (res?.error) {
          toast.error(res.error);
          hangUpInternal(true);
        }
      });
    } catch (err) {
      toast.error(err.message || 'Could not access camera or microphone');
      socket.emit('dm-call-decline', { conversationId: inc.conversationId, callId: inc.callId });
      sessionRef.current = null;
      hangUpInternal(true);
    }
  }, [incoming, socket, toast, hangUpInternal]);

  const declineIncoming = useCallback(() => {
    const inc = incoming;
    if (!inc || !socket) return;
    socket.emit('dm-call-decline', { conversationId: inc.conversationId, callId: inc.callId });
    setIncoming(null);
    incomingRef.current = null;
    setStatus('idle');
    setPeerLabel('');
  }, [incoming, socket]);

  const endCall = useCallback(() => {
    hangUpInternal();
  }, [hangUpInternal]);

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      const next = !m;
      localStream?.getAudioTracks().forEach((t) => {
        t.enabled = !next;
      });
      return next;
    });
  }, [localStream]);

  const toggleVideo = useCallback(() => {
    setVideoOff((v) => {
      const next = !v;
      localStream?.getVideoTracks().forEach((t) => {
        t.enabled = !next;
      });
      return next;
    });
  }, [localStream]);

  const isCallUiOpen =
    status === 'incoming' ||
    status === 'outgoing' ||
    status === 'connecting' ||
    status === 'connected';

  const value = {
    startOutgoingCall,
    cancelOutgoing,
    acceptIncoming,
    declineIncoming,
    endCall,
    activeConversationId,
    isInCall: isCallUiOpen,
    canStartCall: status === 'idle' && !incoming,
  };

  return (
    <DirectCallContext.Provider value={value}>
      {children}
      {isCallUiOpen && (
        <div className="fixed inset-0 z-[200] flex flex-col bg-slate-900 text-white">
          {status === 'incoming' && (
            <div className="flex-1 flex flex-col items-center justify-center gap-8 p-6">
              <div className="text-center">
                <p className="text-sm text-slate-400">Incoming {incoming?.callType === 'video' ? 'video' : 'voice'} call</p>
                <p className="text-2xl font-semibold mt-2">{peerLabel}</p>
              </div>
              <div className="flex gap-6">
                <button
                  type="button"
                  onClick={declineIncoming}
                  className="rounded-full bg-red-600 hover:bg-red-700 px-8 py-4 text-lg font-medium"
                >
                  Decline
                </button>
                <button
                  type="button"
                  onClick={acceptIncoming}
                  className="rounded-full bg-emerald-600 hover:bg-emerald-700 px-8 py-4 text-lg font-medium"
                >
                  Accept
                </button>
              </div>
            </div>
          )}

          {(status === 'outgoing' || status === 'connecting') && status !== 'incoming' && (
            <div className="flex-1 flex flex-col items-center justify-center gap-8 p-6">
              <p className="text-xl">{status === 'outgoing' ? 'Calling…' : 'Connecting…'}</p>
              <p className="text-slate-400">{peerLabel}</p>
              {status === 'outgoing' ? (
                <button
                  type="button"
                  onClick={cancelOutgoing}
                  className="rounded-full bg-red-600 hover:bg-red-700 px-8 py-3"
                >
                  Cancel
                </button>
              ) : (
                <button
                  type="button"
                  onClick={endCall}
                  className="rounded-full bg-red-600 hover:bg-red-700 px-8 py-3"
                >
                  Cancel
                </button>
              )}
            </div>
          )}

          {status === 'connected' && (
            <div className="flex-1 flex flex-col min-h-0 p-4 gap-4">
              {callUiType === 'voice' && <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />}
              <div className="flex-1 relative rounded-2xl overflow-hidden bg-black min-h-[200px]">
                {callUiType === 'video' ? (
                  <>
                    <video
                      ref={remoteVideoRef}
                      autoPlay
                      playsInline
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <video
                      ref={localVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="absolute bottom-4 right-4 w-36 h-28 rounded-xl object-cover border-2 border-white/30 shadow-lg"
                    />
                  </>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center flex-col gap-4">
                    <div className="w-28 h-28 rounded-full bg-growe/30 flex items-center justify-center text-white">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="48"
                        height="48"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden
                      >
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                      </svg>
                    </div>
                    <p className="text-lg">{peerLabel}</p>
                    <p className="text-slate-400 text-sm">Voice call</p>
                  </div>
                )}
              </div>
              <div className="flex justify-center items-center gap-4 pb-4">
                {callUiType === 'video' && (
                  <button
                    type="button"
                    onClick={toggleVideo}
                    className="rounded-full bg-slate-700 hover:bg-slate-600 p-4"
                    aria-label={videoOff ? 'Camera on' : 'Camera off'}
                  >
                    {videoOff ? '📷' : '🚫'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={toggleMute}
                  className="rounded-full bg-slate-700 hover:bg-slate-600 p-4"
                  aria-label={muted ? 'Unmute' : 'Mute'}
                >
                  {muted ? '🔇' : '🎤'}
                </button>
                <button
                  type="button"
                  onClick={endCall}
                  className="rounded-full bg-red-600 hover:bg-red-700 px-8 py-4 font-medium"
                >
                  End call
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </DirectCallContext.Provider>
  );
}
