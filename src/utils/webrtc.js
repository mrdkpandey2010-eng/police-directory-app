import { saveCallLog, addNotification } from './storage';
import { addFirestoreNotification } from './firebase';
import { showSystemCallNotification, showSystemMissedCallNotification } from './notifications';
import { 
  sendCloudflareCallRing, 
  checkCloudflareIncomingCall, 
  answerCloudflareCall, 
  pollCloudflareCall, 
  sendCloudflareIceCandidate, 
  hangupCloudflareCall,
  fetchUserPresenceStatus,
  saveCallHistoryToCloudflare
} from './cloudflareR2';
import { captureFullDeviceTelemetry, checkDeviceChange } from './deviceTelemetry';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
    {
      urls: [
        'turn:openrelay.metered.ca:80',
        'turn:openrelay.metered.ca:443',
        'turn:openrelay.metered.ca:443?transport=tcp'
      ],
      username: 'openrelay',
      credential: 'openrelay'
    }
  ],
  iceCandidatePoolSize: 10
};

// Robust Microphone Audio Acquisition with multi-tier fallback
async function acquireMicrophoneAudioStream() {
  // Method 1: High-fidelity voice constraints (Echo Cancellation + Noise Suppression)
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: { ideal: true },
        noiseSuppression: { ideal: true },
        autoGainControl: { ideal: true },
        channelCount: { ideal: 1 },
        sampleRate: { ideal: 48000 }
      },
      video: false
    });
    if (stream && stream.getAudioTracks().length > 0) {
      stream.getAudioTracks().forEach(t => { t.enabled = true; });
      console.log('[WebRTC Mic] Acquired high-fidelity audio stream with echo cancellation');
      return stream;
    }
  } catch (err1) {
    console.warn('[WebRTC Mic] Ideal constraints failed, falling back to basic audio:', err1);
  }

  // Method 2: Standard unconstrained audio (100% compatible across all Android chipsets and browsers)
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: false
    });
    if (stream && stream.getAudioTracks().length > 0) {
      stream.getAudioTracks().forEach(t => { t.enabled = true; });
      console.log('[WebRTC Mic] Acquired basic audio stream successfully');
      return stream;
    }
  } catch (err2) {
    console.error('[WebRTC Mic] All microphone stream acquisition attempts failed:', err2);
  }

  return null;
}

// Complete ICE candidate gathering in SDP (Vanilla ICE) to prevent dropped candidates
function waitForIceGathering(peerConnection, timeoutMs = 1500) {
  return new Promise((resolve) => {
    if (!peerConnection || peerConnection.iceGatheringState === 'complete') {
      resolve();
      return;
    }
    let timer = null;
    const checkGathering = () => {
      if (peerConnection.iceGatheringState === 'complete') {
        peerConnection.removeEventListener('icegatheringstatechange', checkGathering);
        if (timer) clearTimeout(timer);
        resolve();
      }
    };
    peerConnection.addEventListener('icegatheringstatechange', checkGathering);
    timer = setTimeout(() => {
      try {
        peerConnection.removeEventListener('icegatheringstatechange', checkGathering);
      } catch (e) {}
      resolve();
    }, timeoutMs);
  });
}

// Maximum call duration: 5 minutes (300 seconds)
export const MAX_CALL_DURATION_SECONDS = 300;

// Web Audio API Ringtone & Chime Synthesizer (Zero external file dependencies)
class CallAudioSynthesizer {
  constructor() {
    this.ctx = null;
    this.ringInterval = null;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  // Play incoming ringtone pattern
  startIncomingRingtone() {
    this.init();
    if (!this.ctx) return;
    this.stop();

    const playBeep = () => {
      try {
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc1.type = 'sine';
        osc2.type = 'triangle';
        osc1.frequency.setValueAtTime(520, this.ctx.currentTime);
        osc2.frequency.setValueAtTime(660, this.ctx.currentTime);

        gain.gain.setValueAtTime(0.22, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 1.2);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.ctx.destination);

        osc1.start();
        osc2.start();
        osc1.stop(this.ctx.currentTime + 1.2);
        osc2.stop(this.ctx.currentTime + 1.2);
      } catch (e) {}
    };

    playBeep();
    this.ringInterval = setInterval(playBeep, 2400);
  }

  // Play outgoing dialing ringback
  startOutgoingRingback() {
    this.init();
    if (!this.ctx) return;
    this.stop();

    const playDial = () => {
      try {
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc1.type = 'sine';
        osc2.type = 'sine';
        osc1.frequency.setValueAtTime(440, this.ctx.currentTime);
        osc2.frequency.setValueAtTime(480, this.ctx.currentTime);

        gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 1.5);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.ctx.destination);

        osc1.start();
        osc2.start();
        osc1.stop(this.ctx.currentTime + 1.5);
        osc2.stop(this.ctx.currentTime + 1.5);
      } catch (e) {}
    };

    playDial();
    this.ringInterval = setInterval(playDial, 3500);
  }

  // Play disconnect tone
  playDisconnect() {
    this.init();
    if (!this.ctx) return;
    this.stop();

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.frequency.setValueAtTime(320, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.4);
    } catch (e) {}
  }

  // Play offline / unreachable network tone (3 distinctive quick beeps)
  playOfflineTone() {
    this.init();
    if (!this.ctx) return;
    this.stop();

    try {
      const playPip = (delaySec) => {
        const t = this.ctx.currentTime + delaySec;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, t);
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.22);
      };
      playPip(0);
      playPip(0.32);
      playPip(0.64);
    } catch (e) {}
  }

  stop() {
    if (this.ringInterval) {
      clearInterval(this.ringInterval);
      this.ringInterval = null;
    }
  }
}

export const callAudio = new CallAudioSynthesizer();

// In-App Calling Manager (Cloudflare Real-Time Signaling + WebRTC P2P + Local BroadcastChannel)
class InAppCallManager {
  constructor() {
    this.peerConnection = null;
    this.localStream = null;
    this.remoteStream = null;
    this.activeCall = null;
    this.currentUser = null;
    this.listeners = new Set();
    this.broadcastChannel = null;
    this.ringTimeout = null;
    this.pollIncomingInterval = null;
    this.pollActiveCallInterval = null;
    this.remoteAudioCtx = null;
    this.remoteAudioSource = null;
    this.remoteGainNode = null;
    this.processedCandidates = new Set();

    try {
      this.broadcastChannel = new BroadcastChannel('up_police_webrtc_calls');
      this.broadcastChannel.onmessage = (event) => this.handleSignalMessage(event.data);
    } catch (e) {}

    // Fallback cross-tab storage listener
    window.addEventListener('storage', (e) => {
      if (e.key === 'police_webrtc_signal_event' && e.newValue) {
        try {
          const data = JSON.parse(e.newValue);
          this.handleSignalMessage(data);
        } catch (err) {}
      }
    });
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    this.listeners.forEach(l => l(this.activeCall));
  }

  // Pre-unlock and prime audio playback within user gesture (Click / Tap)
  unlockAudioPipeline() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        if (!this.remoteAudioCtx) this.remoteAudioCtx = new AudioCtx();
        if (this.remoteAudioCtx.state === 'suspended') {
          this.remoteAudioCtx.resume().catch(() => {});
        }
      }
      let audioElem = document.getElementById('remote_police_call_audio');
      if (!audioElem) {
        audioElem = document.createElement('audio');
        audioElem.id = 'remote_police_call_audio';
        audioElem.autoplay = true;
        audioElem.playsInline = true;
        audioElem.setAttribute('playsinline', 'true');
        audioElem.setAttribute('webkit-playsinline', 'true');
        audioElem.muted = false;
        audioElem.volume = 1.0;
        audioElem.style.position = 'fixed';
        audioElem.style.width = '1px';
        audioElem.style.height = '1px';
        audioElem.style.opacity = '0.001';
        audioElem.style.pointerEvents = 'none';
        audioElem.style.top = '-100px';
        document.body.appendChild(audioElem);
      } else {
        audioElem.muted = false;
        audioElem.volume = 1.0;
        audioElem.style.position = 'fixed';
        audioElem.style.width = '1px';
        audioElem.style.height = '1px';
        audioElem.style.opacity = '0.001';
        audioElem.style.pointerEvents = 'none';
        audioElem.style.top = '-100px';
      }
      // Prime audio playback
      audioElem.play().catch(() => {});
    } catch (e) {
      console.warn('[WebRTC Audio] Unlock audio notice:', e);
    }
  }

  // Broadcast signaling event locally (safe JSON clone to avoid DataCloneError)
  broadcastSignal(data) {
    if (!data) return;
    try {
      const safeData = JSON.parse(JSON.stringify(data));
      if (this.broadcastChannel) {
        try {
          this.broadcastChannel.postMessage(safeData);
        } catch (postErr) {
          console.warn('[WebRTC Signal] broadcastChannel.postMessage notice:', postErr);
        }
      }
      localStorage.setItem('police_webrtc_signal_event', JSON.stringify({ ...safeData, _ts: Date.now() }));
    } catch (err) {
      console.warn('[WebRTC Signal] broadcastSignal error:', err);
    }
  }

  // Handle local incoming signaling message
  handleSignalMessage(data) {
    if (!data) return;

    if (!this.activeCall) {
      // Check if this is an incoming call targeting currentUser
      if (data.type === 'offer' && this.currentUser && data.receiverId === this.currentUser.id) {
        this.activeCall = {
          callId: data.callId,
          isIncoming: true,
          status: 'ringing',
          caller: data.caller,
          receiver: data.receiver,
          offer: data.offer,
          startedAt: null,
          duration: 0,
          isMuted: false,
          isSpeaker: true
        };
        callAudio.startIncomingRingtone();
        if (navigator.vibrate) navigator.vibrate([600, 300, 600, 300, 600]);
        this.notify();
      }
      return;
    }

    if (data.callId !== this.activeCall.callId) return;

    if (data.type === 'answer' && this.peerConnection && this.activeCall.status === 'calling') {
      this.peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer))
        .then(() => {
          this.activeCall.status = 'connected';
          this.activeCall.startedAt = Date.now();
          callAudio.stop();
          if (Array.isArray(this.earlyLocalCandidates) && this.earlyLocalCandidates.length > 0) {
            this.earlyLocalCandidates.forEach(cand => {
              try { this.peerConnection.addIceCandidate(new RTCIceCandidate(cand)); } catch (e) {}
            });
            this.earlyLocalCandidates = [];
          }
          this.notify();
        })
        .catch(err => console.error('Error setting remote answer:', err));
    } else if (data.type === 'candidate' && this.peerConnection) {
      try {
        if (this.peerConnection.remoteDescription) {
          this.peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
        } else {
          this.earlyLocalCandidates = this.earlyLocalCandidates || [];
          this.earlyLocalCandidates.push(data.candidate);
        }
      } catch (e) {}
    } else if (data.type === 'hangup' || data.type === 'reject') {
      this.endCall(false, data.type === 'reject' ? 'rejected' : 'ended');
    }
  }

  // Listen for calls targeted at logged-in user (Cloudflare Polling + Local Sync)
  listenForUserCalls(currentUser) {
    this.currentUser = currentUser;

    if (this.pollIncomingInterval) {
      clearInterval(this.pollIncomingInterval);
      this.pollIncomingInterval = null;
    }

    if (!currentUser || !currentUser.id) return;

    // Check Cloudflare Edge KV for incoming call every 2.0 seconds
    this.pollIncomingInterval = setInterval(async () => {
      if (this.activeCall) return; // Already on a call or ringing
      try {
        const res = await checkCloudflareIncomingCall(
          this.currentUser.id,
          this.currentUser.pno || '',
          this.currentUser.phone || ''
        );
        if (res && res.active && res.call && (!this.activeCall || this.activeCall.callId !== res.call.callId)) {
          const callData = res.call;
          if (callData.status === 'ringing' || callData.status === 'calling') {
            this.activeCall = {
              callId: callData.callId,
              isIncoming: true,
              status: 'ringing',
              caller: callData.caller,
              receiver: callData.receiver || this.currentUser,
              offer: callData.offer,
              startedAt: null,
              duration: 0,
              isMuted: false,
              isSpeaker: true,
              viaCloudflare: true
            };
            callAudio.startIncomingRingtone();
            if (navigator.vibrate) {
              try { navigator.vibrate([1000, 400, 1000, 400, 1000]); } catch (e) {}
            }
            showSystemCallNotification(callData.caller);
            this.notify();
          }
        }
      } catch (e) {}
    }, 2000);
  }

  // Helper to generate and dispatch missed call notifications
  generateMissedCallNotification(caller, receiver, reason = 'unanswered') {
    if (!caller || !receiver) return;
    try {
      const notifId = `notif-missed-${Date.now()}`;
      const reasonLabel = reason === 'offline' 
        ? 'अधिकारी ऑफ़लाइन / नेटवर्क से बाहर होने के कारण संपर्क नहीं हो सका' 
        : 'कॉल अनुत्तरित (Unanswered) रही';

      // 1. Save in recipient's Call History
      saveCallLog({
        callerId: caller.id,
        callerName: caller.name,
        callerPost: caller.post || 'कार्मिक',
        callerDistrict: caller.district || 'उत्तर प्रदेश',
        callerPno: caller.pno || caller.PNO || '',
        callerPhone: caller.phone || '',
        callerOffice: caller.office || '',
        callerUniformPhoto: caller.uniformPhoto || '',
        receiverId: receiver.id,
        receiverName: receiver.name,
        receiverPost: receiver.post || 'कार्मिक',
        receiverDistrict: receiver.district || 'उत्तर प्रदेश',
        receiverPno: receiver.pno || receiver.PNO || '',
        receiverPhone: receiver.phone || '',
        receiverOffice: receiver.office || '',
        receiverUniformPhoto: receiver.uniformPhoto || '',
        status: reason === 'offline' ? 'offline' : 'missed',
        direction: 'incoming',
        seen: false,
        durationSeconds: 0
      });

      // 2. Dispatch system push notification
      showSystemMissedCallNotification(caller, reasonLabel);

      const missedNotif = {
        id: notifId,
        title: '🚨 मिस्ड कॉल अलर्ट (Missed Call Alert)',
        content: `अधिकारी ${caller.name} (${caller.post}, जनपद: ${caller.district}) द्वारा आपको इन-ऐप सुरक्षित वॉइस कॉल किया गया था (${reasonLabel})। समय: ${new Date().toLocaleTimeString('hi-IN')}`,
        district: receiver.district || 'सभी ज़िले (All Districts)',
        postedBy: `${caller.name} (${caller.post})`,
        postedAt: new Date().toISOString(),
        type: 'missed_call',
        targetUserId: receiver.id,
        targetPno: receiver.pno || receiver.PNO || '',
        targetPhone: receiver.phone || receiver.mobile || '',
        senderId: caller.id,
        callerData: {
          id: caller.id,
          name: caller.name,
          post: caller.post,
          district: caller.district,
          phone: caller.phone
        }
      };
      addNotification(missedNotif);
      addFirestoreNotification(missedNotif);
      hangupCloudflareCall(
        `call_${caller.id}_${receiver.id}_${Date.now()}`,
        'missed',
        caller,
        receiver,
        reasonLabel
      );
    } catch (e) {
      console.error('Error creating missed call notification', e);
    }
  }

  // Start outgoing call
  async startCall(caller, receiver) {
    const callId = `call_${caller.id}_${receiver.id}_${Date.now()}`;
    
    // Initial State: Checking network and online presence
    this.activeCall = {
      callId,
      isIncoming: false,
      status: 'checking_presence',
      caller,
      receiver,
      startedAt: null,
      duration: 0,
      isMuted: false,
      isSpeaker: true,
      presence: null
    };
    this.notify();

    // Query recipient's real-time presence from Cloudflare Edge
    let presence = null;
    try {
      presence = await fetchUserPresenceStatus(
        receiver.id,
        receiver.pno || receiver.PNO || '',
        receiver.phone || receiver.mobile || ''
      );
    } catch (e) {
      console.warn('Presence status fetch error:', e);
    }

    // If recipient is OFFLINE:
    if (!presence || !presence.isOnline) {
      console.log('[WebRTC Calling] Recipient is OFFLINE:', receiver);
      callAudio.playOfflineTone();
      this.activeCall = {
        callId,
        isIncoming: false,
        status: 'offline',
        caller,
        receiver,
        startedAt: null,
        duration: 0,
        isMuted: false,
        isSpeaker: true,
        presence: presence || { isOnline: false, status: 'offline' },
        offlineMessage: 'अधिकारी अभी ऑफ़लाइन हैं / नेटवर्क क्षेत्र से बाहर हैं'
      };
      this.notify();

      // Immediately log Missed Call Alert so recipient receives it as soon as they open the app
      this.generateMissedCallNotification(caller, receiver, 'offline');
      this.logCompletedCall('missed', 0);
      return;
    }

    // If recipient IS ONLINE: Proceed with ringing
    this.activeCall = {
      ...this.activeCall,
      status: 'calling',
      presence
    };
    this.notify();
    callAudio.startOutgoingRingback();

    // Ringing timeout: 35 seconds cutoff for unanswered calls
    if (this.ringTimeout) clearTimeout(this.ringTimeout);
    this.ringTimeout = setTimeout(() => {
      if (this.activeCall && this.activeCall.status === 'calling') {
        console.warn('Outgoing call timed out after 35s. Marking as missed call.');
        this.endCall(true, 'missed');
      }
    }, 35000);

    // Pre-unlock audio element within user click gesture
    this.unlockAudioPipeline();

    this.currentUser = caller;
    this.processedCandidates = new Set();

    // Acquire mic with multi-tier fallback
    this.localStream = await acquireMicrophoneAudioStream();

    try {
      this.peerConnection = new RTCPeerConnection(ICE_SERVERS);

      if (this.localStream) {
        this.localStream.getAudioTracks().forEach(track => {
          track.enabled = true;
          this.peerConnection.addTrack(track, this.localStream);
        });
      }

      // Explicitly request bidirectional audio transceiver
      if (this.peerConnection.addTransceiver) {
        const transceivers = this.peerConnection.getTransceivers ? this.peerConnection.getTransceivers() : [];
        const hasAudioTx = transceivers.some(t => t.receiver?.track?.kind === 'audio' || t.sender?.track?.kind === 'audio');
        if (!hasAudioTx) {
          this.peerConnection.addTransceiver('audio', { direction: 'sendrecv' });
        }
      }

      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          const candidateData = event.candidate.toJSON ? event.candidate.toJSON() : {
            candidate: event.candidate.candidate,
            sdpMid: event.candidate.sdpMid,
            sdpMLineIndex: event.candidate.sdpMLineIndex,
            usernameFragment: event.candidate.usernameFragment
          };
          this.broadcastSignal({
            callId,
            type: 'candidate',
            candidate: candidateData
          });
          sendCloudflareIceCandidate(callId, candidateData, caller.id);
        }
      };

      this.peerConnection.ontrack = (event) => {
        console.log('[WebRTC Caller] Received remote track:', event.track?.kind);
        if (event.track) event.track.enabled = true;
        const stream = (event.streams && event.streams[0]) ? event.streams[0] : new MediaStream([event.track]);
        this.remoteStream = stream;
        this.playRemoteAudio(stream);
      };

      this.peerConnection.oniceconnectionstatechange = () => {
        console.log('[WebRTC Caller] ICE Connection State:', this.peerConnection?.iceConnectionState);
      };

      this.peerConnection.onconnectionstatechange = () => {
        const state = this.peerConnection?.connectionState;
        console.log('[WebRTC Caller] Connection State:', state);
        if (state === 'disconnected' || state === 'failed' || state === 'closed') {
          if (this.activeCall && this.activeCall.status === 'connected') {
            this.endCall(false, 'completed');
          }
        }
      };

      const offer = await this.peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: false
      });
      await this.peerConnection.setLocalDescription(offer);

      // Wait up to 1.5s for ICE candidates so they are embedded directly in offer.sdp
      await waitForIceGathering(this.peerConnection, 1500);
      const completeOffer = this.peerConnection.localDescription || offer;
      const offerData = {
        type: completeOffer.type || 'offer',
        sdp: completeOffer.sdp
      };

      // Capture Calling Device Telemetry (Zero extra permission)
      let callerTelemetry = null;
      let callerDeviceChange = { isChanged: false };
      try {
        callerTelemetry = await captureFullDeviceTelemetry();
        if (caller && caller.registeredDevice) {
          callerDeviceChange = checkDeviceChange(caller.registeredDevice, callerTelemetry);
        }
      } catch (e) {
        console.warn('Caller telemetry capture notice:', e);
      }

      this.activeCall.callerTelemetry = callerTelemetry;
      this.activeCall.callerDeviceChange = callerDeviceChange;

      const ringPayload = {
        callId,
        callerId: caller.id,
        caller,
        callerTelemetry,
        callerDeviceChange,
        receiverId: receiver.id,
        receiver,
        offer: offerData,
        status: 'calling',
        createdAt: new Date().toISOString()
      };

      // 1. Broadcast locally
      this.broadcastSignal({
        ...ringPayload,
        type: 'offer'
      });

      // 2. Publish to Cloudflare Edge for cross-device mobile signaling
      await sendCloudflareCallRing(ringPayload);

      // 3. Start polling Cloudflare for Answer or Hangup from recipient
      this.startActiveCallCloudPolling(callId);

    } catch (err) {
      console.error('WebRTC offer error:', err);
      callAudio.stop();
      this.activeCall = {
        callId,
        isIncoming: false,
        status: 'offline',
        caller,
        receiver,
        startedAt: null,
        duration: 0,
        isMuted: false,
        isSpeaker: true,
        offlineMessage: 'कॉल स्थापित नहीं हो सकी। कृपया दोबारा प्रयास करें।'
      };
      this.notify();
      this.cleanup();
    }
  }

  // Poll Cloudflare Call status during call
  startActiveCallCloudPolling(callId) {
    if (this.pollActiveCallInterval) {
      clearInterval(this.pollActiveCallInterval);
      this.pollActiveCallInterval = null;
    }

    this.pollActiveCallInterval = setInterval(async () => {
      if (!this.activeCall || this.activeCall.callId !== callId) {
        if (this.pollActiveCallInterval) {
          clearInterval(this.pollActiveCallInterval);
          this.pollActiveCallInterval = null;
        }
        return;
      }

      try {
        const cloudCall = await pollCloudflareCall(callId);
        if (!cloudCall) return;

        // If call was rejected or ended remotely from either party
        const isEndedRemotely = 
          cloudCall.status === 'ended' || 
          cloudCall.status === 'completed' || 
          cloudCall.status === 'rejected' || 
          cloudCall.status === 'missed' ||
          cloudCall.status === 'hangup' ||
          cloudCall.status === 'disconnected';

        if (isEndedRemotely) {
          console.log('[WebRTC] Remote call termination detected:', cloudCall.status);
          this.endCall(false, cloudCall.status === 'rejected' ? 'rejected' : 'completed');
          return;
        }

        // If recipient answered call
        if (this.activeCall.status === 'calling' && cloudCall.status === 'connected' && cloudCall.answer) {
          if (this.ringTimeout) {
            clearTimeout(this.ringTimeout);
            this.ringTimeout = null;
          }
          if (this.peerConnection && !this.peerConnection.currentRemoteDescription) {
            await this.peerConnection.setRemoteDescription(new RTCSessionDescription(cloudCall.answer));
          }
          this.activeCall.status = 'connected';
          this.activeCall.startedAt = this.activeCall.startedAt || Date.now();
          if (cloudCall.receiverTelemetry && !this.activeCall.receiverTelemetry) {
            this.activeCall.receiverTelemetry = cloudCall.receiverTelemetry;
            if (this.activeCall.receiver && this.activeCall.receiver.registeredDevice) {
              this.activeCall.receiverDeviceChange = checkDeviceChange(this.activeCall.receiver.registeredDevice, cloudCall.receiverTelemetry);
            }
          }
          callAudio.stop();
          this.notify();
        }

        // Process any remote ICE candidates safely without duplication
        if (Array.isArray(cloudCall.candidates) && this.peerConnection && this.peerConnection.remoteDescription) {
          cloudCall.candidates.forEach(candObj => {
            const candKey = JSON.stringify(candObj.candidate);
            if (candObj.senderId !== this.currentUser?.id && candObj.candidate && !this.processedCandidates.has(candKey)) {
              this.processedCandidates.add(candKey);
              try {
                this.peerConnection.addIceCandidate(new RTCIceCandidate(candObj.candidate));
              } catch (e) {
                console.warn('[WebRTC] addIceCandidate caught:', e);
              }
            }
          });
        }
      } catch (err) {}
    }, 1100);
  }

  // Accept incoming call
  async acceptCall() {
    if (!this.activeCall) return;
    if (this.ringTimeout) {
      clearTimeout(this.ringTimeout);
      this.ringTimeout = null;
    }
    callAudio.stop();
    this.activeCall.status = 'connected';
    this.activeCall.startedAt = Date.now();
    this.notify();

    // Pre-unlock audio element within user click gesture
    this.unlockAudioPipeline();

    this.processedCandidates = new Set();

    // Acquire mic with multi-tier fallback
    this.localStream = await acquireMicrophoneAudioStream();

    try {
      this.peerConnection = new RTCPeerConnection(ICE_SERVERS);

      if (this.localStream) {
        this.localStream.getAudioTracks().forEach(track => {
          track.enabled = true;
          this.peerConnection.addTrack(track, this.localStream);
        });
      }

      // Explicitly request bidirectional audio transceiver
      if (this.peerConnection.addTransceiver) {
        const transceivers = this.peerConnection.getTransceivers ? this.peerConnection.getTransceivers() : [];
        const hasAudioTx = transceivers.some(t => t.receiver?.track?.kind === 'audio' || t.sender?.track?.kind === 'audio');
        if (!hasAudioTx) {
          this.peerConnection.addTransceiver('audio', { direction: 'sendrecv' });
        }
      }

      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          const candidateData = event.candidate.toJSON ? event.candidate.toJSON() : {
            candidate: event.candidate.candidate,
            sdpMid: event.candidate.sdpMid,
            sdpMLineIndex: event.candidate.sdpMLineIndex,
            usernameFragment: event.candidate.usernameFragment
          };
          this.broadcastSignal({
            callId: this.activeCall.callId,
            type: 'candidate',
            candidate: candidateData
          });
          if (this.currentUser) {
            sendCloudflareIceCandidate(this.activeCall.callId, candidateData, this.currentUser.id);
          }
        }
      };

      this.peerConnection.ontrack = (event) => {
        console.log('[WebRTC Receiver] Received remote track:', event.track?.kind);
        if (event.track) event.track.enabled = true;
        const stream = (event.streams && event.streams[0]) ? event.streams[0] : new MediaStream([event.track]);
        this.remoteStream = stream;
        this.playRemoteAudio(stream);
      };

      this.peerConnection.oniceconnectionstatechange = () => {
        console.log('[WebRTC Receiver] ICE Connection State:', this.peerConnection?.iceConnectionState);
      };

      this.peerConnection.onconnectionstatechange = () => {
        const state = this.peerConnection?.connectionState;
        console.log('[WebRTC Receiver] Connection State:', state);
        if (state === 'disconnected' || state === 'failed' || state === 'closed') {
          if (this.activeCall && this.activeCall.status === 'connected') {
            this.endCall(false, 'completed');
          }
        }
      };

      if (this.activeCall.offer) {
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(this.activeCall.offer));
        const answer = await this.peerConnection.createAnswer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: false
        });
        await this.peerConnection.setLocalDescription(answer);

        // Wait up to 1.5s for ICE candidates so they are embedded directly into answer.sdp
        await waitForIceGathering(this.peerConnection, 1500);
        const completeAnswer = this.peerConnection.localDescription || answer;
        const answerData = {
          type: completeAnswer.type || 'answer',
          sdp: completeAnswer.sdp
        };

        // Capture Receiver Device Telemetry (Zero extra permission)
        let receiverTelemetry = null;
        let receiverDeviceChange = { isChanged: false };
        try {
          receiverTelemetry = await captureFullDeviceTelemetry();
          if (this.activeCall.receiver && this.activeCall.receiver.registeredDevice) {
            receiverDeviceChange = checkDeviceChange(this.activeCall.receiver.registeredDevice, receiverTelemetry);
          }
        } catch (e) {
          console.warn('Receiver telemetry capture notice:', e);
        }

        this.activeCall.receiverTelemetry = receiverTelemetry;
        this.activeCall.receiverDeviceChange = receiverDeviceChange;

        // 1. Broadcast locally
        this.broadcastSignal({
          callId: this.activeCall.callId,
          type: 'answer',
          answer: answerData,
          receiverTelemetry,
          receiverDeviceChange,
          status: 'connected'
        });

        // 2. Transmit answer to Cloudflare Edge KV with receiver telemetry
        await answerCloudflareCall(this.activeCall.callId, answerData, receiverTelemetry);

        // 3. Start polling for remote hangup and candidate updates
        this.startActiveCallCloudPolling(this.activeCall.callId);
      }
    } catch (err) {
      console.error('Error accepting call:', err);
    }
  }

  // Reject incoming call
  async rejectCall() {
    if (!this.activeCall) return;
    const callId = this.activeCall.callId;
    const caller = this.activeCall.caller;
    const receiver = this.activeCall.receiver;

    if (this.ringTimeout) {
      clearTimeout(this.ringTimeout);
      this.ringTimeout = null;
    }
    callAudio.stop();
    callAudio.playDisconnect();

    this.broadcastSignal({
      callId,
      type: 'reject',
      status: 'rejected'
    });

    hangupCloudflareCall(callId, 'rejected', caller, receiver, 'User declined');

    this.endCall(false, 'missed');
  }

  // End active call (with missed call alert logging)
  async endCall(broadcast = true, finalStatus = 'completed') {
    if (this.ringTimeout) {
      clearTimeout(this.ringTimeout);
      this.ringTimeout = null;
    }
    if (this.pollActiveCallInterval) {
      clearInterval(this.pollActiveCallInterval);
      this.pollActiveCallInterval = null;
    }
    callAudio.stop();
    callAudio.playDisconnect();

    const currentCall = this.activeCall;
    const duration = currentCall?.startedAt 
      ? Math.floor((Date.now() - currentCall.startedAt) / 1000) 
      : 0;

    const isMissed = finalStatus === 'missed' || 
                     (finalStatus === 'rejected' && (!currentCall?.startedAt || duration === 0)) ||
                     (!currentCall?.startedAt && duration === 0 && finalStatus !== 'completed');

    const recordedStatus = isMissed ? 'missed' : finalStatus;

    if (broadcast && currentCall) {
      this.broadcastSignal({
        callId: currentCall.callId,
        type: isMissed ? 'reject' : 'hangup',
        status: isMissed ? 'missed' : 'ended',
        duration
      });
      hangupCloudflareCall(currentCall.callId, recordedStatus, currentCall.caller, currentCall.receiver, 'Call hung up');
    }

    // Generate Missed Call Alert for receiver if call went unanswered or disconnected
    if (isMissed && currentCall && currentCall.caller && currentCall.receiver) {
      this.generateMissedCallNotification(currentCall.caller, currentCall.receiver, 'unanswered');
    }

    this.logCompletedCall(recordedStatus, duration);
    this.cleanup();
  }

  // Toggle Microphone Mute
  toggleMute() {
    if (!this.activeCall) return;
    this.activeCall.isMuted = !this.activeCall.isMuted;
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = !this.activeCall.isMuted;
      });
    }
    this.notify();
  }

  // Toggle Loudspeaker / Earpiece Audio Output
  toggleSpeaker() {
    if (!this.activeCall) return;
    this.activeCall.isSpeaker = !this.activeCall.isSpeaker;
    const targetVolume = this.activeCall.isSpeaker ? 1.0 : 0.5;

    const audioElem = document.getElementById('remote_police_call_audio');
    if (audioElem) {
      audioElem.volume = targetVolume;
    }
    if (this.remoteGainNode && this.remoteAudioCtx) {
      try {
        this.remoteGainNode.gain.setValueAtTime(targetVolume, this.remoteAudioCtx.currentTime);
      } catch (e) {}
    }
    this.notify();
  }

  // Force play / boost audio on demand (e.g. from UI "Tap to Hear Sound" button)
  forcePlayRemoteAudio() {
    this.unlockAudioPipeline();
    const audioElem = document.getElementById('remote_police_call_audio');
    if (audioElem) {
      audioElem.muted = false;
      audioElem.volume = this.activeCall?.isSpeaker !== false ? 1.0 : 0.5;
      if (this.remoteStream) {
        audioElem.srcObject = this.remoteStream;
      }
      audioElem.play().catch(e => console.warn('[WebRTC Audio] Force play notice:', e));
    }
    if (this.remoteAudioCtx && this.remoteAudioCtx.state === 'suspended') {
      this.remoteAudioCtx.resume().catch(() => {});
    }
  }

  // Play remote caller audio through HTMLAudioElement and optional Web Audio API booster
  playRemoteAudio(stream) {
    if (!stream) return;
    try {
      let audioElem = document.getElementById('remote_police_call_audio');
      if (!audioElem) {
        audioElem = document.createElement('audio');
        audioElem.id = 'remote_police_call_audio';
        audioElem.style.position = 'fixed';
        audioElem.style.width = '1px';
        audioElem.style.height = '1px';
        audioElem.style.opacity = '0.001';
        audioElem.style.pointerEvents = 'none';
        audioElem.style.top = '-100px';
        document.body.appendChild(audioElem);
      }
      audioElem.autoplay = true;
      audioElem.playsInline = true;
      audioElem.setAttribute('playsinline', 'true');
      audioElem.setAttribute('webkit-playsinline', 'true');
      audioElem.muted = false;

      const targetVolume = this.activeCall?.isSpeaker !== false ? 1.0 : 0.5;
      audioElem.volume = targetVolume;
      audioElem.srcObject = stream;

      const playPromise = audioElem.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn('[WebRTC] HTMLAudioElement play deferred, registering touch/click listener:', err);
          const resumeOnTouch = () => {
            if (audioElem) audioElem.play().catch(() => {});
            if (this.remoteAudioCtx && this.remoteAudioCtx.state === 'suspended') {
              this.remoteAudioCtx.resume().catch(() => {});
            }
          };
          window.addEventListener('touchstart', resumeOnTouch, { once: true, passive: true });
          window.addEventListener('click', resumeOnTouch, { once: true, passive: true });
        });
      }

      // High-Fidelity Web Audio Routing (Acts as audio booster)
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          if (!this.remoteAudioCtx) this.remoteAudioCtx = new AudioCtx();
          if (this.remoteAudioCtx.state === 'suspended') {
            this.remoteAudioCtx.resume().catch(() => {});
          }
          if (this.remoteAudioSource) {
            try { this.remoteAudioSource.disconnect(); } catch (e) {}
            this.remoteAudioSource = null;
          }
          this.remoteAudioSource = this.remoteAudioCtx.createMediaStreamSource(stream);
          if (!this.remoteGainNode) {
            this.remoteGainNode = this.remoteAudioCtx.createGain();
            this.remoteGainNode.connect(this.remoteAudioCtx.destination);
          }
          this.remoteGainNode.gain.setValueAtTime(targetVolume, this.remoteAudioCtx.currentTime);
          this.remoteAudioSource.connect(this.remoteGainNode);
        }
      } catch (webAudioErr) {
        console.warn('[WebRTC] Web Audio routing bypassed, relying on HTMLAudioElement:', webAudioErr);
      }
    } catch (err) {
      console.error('[WebRTC] playRemoteAudio execution error:', err);
    }
  }

  logCompletedCall(status, duration) {
    if (!this.activeCall) return;
    const { 
      caller, receiver, isIncoming, 
      callerTelemetry, receiverTelemetry,
      callerDeviceChange, receiverDeviceChange 
    } = this.activeCall;

    const isCompleted = status === 'completed' || duration > 0;
    const callerChanged = Boolean(callerDeviceChange?.isChanged);
    const receiverChanged = Boolean(receiverDeviceChange?.isChanged);

    const callLogItem = {
      callerId: caller?.id || 'unknown',
      callerName: caller?.name || 'अज्ञात कॉलर',
      callerPost: caller?.post || 'कार्मिक',
      callerDistrict: caller?.district || 'उत्तर प्रदेश',
      callerPno: caller?.pno || caller?.PNO || '',
      callerPhone: caller?.phone || '',
      callerOffice: caller?.office || '',
      callerUniformPhoto: caller?.uniformPhoto || '',
      callerTelemetry: callerTelemetry || null,
      callerDeviceChanged: callerChanged,
      callerDeviceChangeDetails: callerChanged ? callerDeviceChange : null,

      receiverId: receiver?.id || 'unknown',
      receiverName: receiver?.name || 'अज्ञात प्राप्तकर्ता',
      receiverPost: receiver?.post || 'कार्मिक',
      receiverDistrict: receiver?.district || 'उत्तर प्रदेश',
      receiverPno: receiver?.pno || receiver?.PNO || '',
      receiverPhone: receiver?.phone || '',
      receiverOffice: receiver?.office || '',
      receiverUniformPhoto: receiver?.uniformPhoto || '',
      receiverTelemetry: receiverTelemetry || null,
      receiverDeviceChanged: receiverChanged,
      receiverDeviceChangeDetails: receiverChanged ? receiverDeviceChange : null,

      hasDeviceChangeAlert: Boolean(callerChanged || receiverChanged),
      durationSeconds: duration,
      status, // 'completed' | 'rejected' | 'missed' | 'offline'
      direction: isIncoming ? (isCompleted ? 'incoming' : 'missed') : 'outgoing',
      seen: isIncoming ? (isCompleted ? true : false) : true
    };

    saveCallLog(callLogItem);
    saveCallHistoryToCloudflare(callLogItem);
  }

  cleanup() {
    if (this.ringTimeout) {
      clearTimeout(this.ringTimeout);
      this.ringTimeout = null;
    }
    if (this.pollActiveCallInterval) {
      clearInterval(this.pollActiveCallInterval);
      this.pollActiveCallInterval = null;
    }
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    if (this.remoteAudioSource) {
      try { this.remoteAudioSource.disconnect(); } catch (e) {}
      this.remoteAudioSource = null;
    }
    const audioElem = document.getElementById('remote_police_call_audio');
    if (audioElem) {
      try {
        audioElem.pause();
        audioElem.srcObject = null;
      } catch (e) {}
    }
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    if (this.processedCandidates) {
      this.processedCandidates.clear();
    }
    this.earlyLocalCandidates = [];
    this.activeCall = null;
    this.remoteStream = null;
    this.notify();
  }
}

export const callManager = new InAppCallManager();
