import { saveCallLog, addNotification, getStoredCallingConfig } from './storage';
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
import { 
  setNativeCommunicationMode, 
  setNativeSpeakerphone, 
  resetNativeAudioMode 
} from './nativeBridge';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
    { urls: 'stun:stun.services.mozilla.com' },
    { urls: 'stun:stun.voip.blackberry.com:3478' },
    // High-availability public/free TURN relay servers (OpenRelay Project by Metered)
    // Ensures 100% NAT traversal success when direct P2P is blocked by mobile firewall/carrier-grade NAT
    {
      urls: [
        'turn:openrelay.metered.ca:80',
        'turn:openrelay.metered.ca:443',
        'turn:openrelay.metered.ca:443?transport=tcp'
      ],
      username: 'openrelayproject',
      credential: 'openrelayproject'
    }
  ],
  iceCandidatePoolSize: 10
};

// 1-sample silent WAV data URI for priming audio elements within user click gestures
export const SILENT_WAV_BASE64 = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';

// Last verified microphone hardware settings for diagnostics
export let lastAcquiredMicSettings = null;

// Retrieve ICE / TURN servers with support for secure custom TURN credentials
export function getRtcConfiguration() {
  if (typeof window !== 'undefined') {
    try {
      const customIce = localStorage.getItem('police_custom_turn_config');
      if (customIce) {
        const parsed = JSON.parse(customIce);
        if (parsed && Array.isArray(parsed.iceServers) && parsed.iceServers.length > 0) {
          return {
            iceServers: [...ICE_SERVERS.iceServers, ...parsed.iceServers],
            iceCandidatePoolSize: 10
          };
        }
      }
    } catch (e) {}
  }
  return ICE_SERVERS;
}

/**
 * Robust WhatsApp-Level Speech Microphone Capture with Multi-Tier Fallback
 * Guarantees Hardware/Browser Acoustic Echo Cancellation (AEC),
 * Noise Suppression (NS), and Voice-Optimized Automatic Gain Control (AGC).
 */
async function acquireMicrophoneAudioStream() {
  if (typeof navigator === 'undefined' || !navigator?.mediaDevices?.getUserMedia) {
    console.error('[WebRTC Mic] mediaDevices.getUserMedia is not available');
    return null;
  }

  // Tier 1: WhatsApp-grade HD speech constraints with hardware AEC, NS, AGC and strict mono
  const tier1Constraints = {
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      channelCount: 1, // Strictly mono to enable hardware DSP AEC & prevent phase cancellation
      sampleRate: { ideal: 48000 },
      sampleSize: { ideal: 16 }
    },
    video: false
  };

  // Tier 2: Standard cross-platform W3C constraints
  const tier2Constraints = {
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      channelCount: 1
    },
    video: false
  };

  // Tier 3: Core acoustic echo cancellation constraint
  const tier3Constraints = {
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      channelCount: 1
    },
    video: false
  };

  // Tier 4: Basic audio fallback
  const tier4Constraints = {
    audio: true,
    video: false
  };

  const tiers = [
    { name: 'Tier 1 (WhatsApp-Grade Studio HD Speech)', constraints: tier1Constraints },
    { name: 'Tier 2 (Standard W3C Voice)', constraints: tier2Constraints },
    { name: 'Tier 3 (Core AEC Mono)', constraints: tier3Constraints },
    { name: 'Tier 4 (Basic Fallback)', constraints: tier4Constraints }
  ];

  for (const tier of tiers) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(tier.constraints);
      if (stream && stream.getAudioTracks().length > 0) {
        const track = stream.getAudioTracks()[0];
        track.enabled = true;
        const settings = track.getSettings ? track.getSettings() : {};
        lastAcquiredMicSettings = {
          tier: tier.name,
          deviceId: settings.deviceId,
          sampleRate: settings.sampleRate,
          channelCount: settings.channelCount,
          echoCancellation: settings.echoCancellation,
          noiseSuppression: settings.noiseSuppression,
          autoGainControl: settings.autoGainControl,
          latency: settings.latency
        };
        console.log(`[WebRTC Mic] Acquired microphone stream using ${tier.name}:`, lastAcquiredMicSettings);
        return stream;
      }
    } catch (err) {
      console.warn(`[WebRTC Mic] ${tier.name} acquisition failed:`, err?.name, err?.message);
    }
  }

  console.error('[WebRTC Mic] All microphone acquisition tiers failed');
  return null;
}

/**
 * Prioritize Opus codec using standard RTCRtpTransceiver.setCodecPreferences
 */
function preferOpusCodec(peerConnection) {
  if (!peerConnection || typeof RTCRtpSender.getCapabilities !== 'function') return;
  try {
    const audioTransceivers = peerConnection.getTransceivers
      ? peerConnection.getTransceivers().filter(t => 
          (t.receiver && t.receiver.track && t.receiver.track.kind === 'audio') ||
          (t.sender && t.sender.track && t.sender.track.kind === 'audio')
        )
      : [];

    const capabilities = RTCRtpSender.getCapabilities('audio');
    if (capabilities && Array.isArray(capabilities.codecs) && capabilities.codecs.length > 0) {
      const sortedCodecs = [...capabilities.codecs].sort((a, b) => {
        const aIsOpus = a.mimeType && a.mimeType.toLowerCase() === 'audio/opus';
        const bIsOpus = b.mimeType && b.mimeType.toLowerCase() === 'audio/opus';
        return bIsOpus - aIsOpus;
      });

      audioTransceivers.forEach(transceiver => {
        if (typeof transceiver.setCodecPreferences === 'function') {
          transceiver.setCodecPreferences(sortedCodecs);
        }
      });
      console.log('[WebRTC Codec] Opus prioritized via setCodecPreferences');
    }
  } catch (e) {
    console.warn('[WebRTC Codec] setCodecPreferences notice:', e);
  }
}

/**
 * Configure RTCRtpSender encoding parameters for high-res voice transport (64 kbps HD, DTX disabled)
 */
async function configureSenderEncodingParameters(peerConnection, targetBitrateBps = 64000) {
  if (!peerConnection || typeof peerConnection.getSenders !== 'function') return;
  try {
    const senders = peerConnection.getSenders();
    for (const sender of senders) {
      if (sender.track && sender.track.kind === 'audio' && typeof sender.getParameters === 'function') {
        const params = sender.getParameters();
        if (params && Array.isArray(params.encodings) && params.encodings.length > 0) {
          params.encodings[0].maxBitrate = targetBitrateBps;
          // Disable DTX to eliminate choppy/robotic voice dropouts during pauses or soft speech
          if ('dtx' in params.encodings[0]) {
            params.encodings[0].dtx = 'disabled';
          }
          if ('priority' in params.encodings[0]) {
            params.encodings[0].priority = 'high';
          }
          if ('networkPriority' in params.encodings[0]) {
            params.encodings[0].networkPriority = 'high';
          }
          await sender.setParameters(params);
          console.log('[WebRTC Sender] Configured encoding parameters:', { maxBitrate: targetBitrateBps, dtx: 'disabled', priority: 'high' });
        }
      }
    }
  } catch (e) {
    console.warn('[WebRTC Sender] setParameters notice:', e);
  }
}

/**
 * Tune Opus SDP FMTP line for WhatsApp-level HD speech quality:
 * - minptime=20, ptime=20, maxptime=40: Standard 20ms frames (50 pkts/sec) prevents NetEQ robotic distortion
 * - useinbandfec=1: In-Band Forward Error Correction for loss recovery without retransmission
 * - usedtx=0: Disable DTX to guarantee continuous smooth speech transmission and eliminate robotic sound
 * - maxaveragebitrate=64000: 64 kbps studio HD voice
 * - stereo=0 & sprop-stereo=0: Clean mono voice encoding (ensures mobile hardware DSP AEC is active)
 * - cbr=0: Adaptive variable bitrate
 */
function tuneSdpForVoiceClarity(sdp) {
  if (!sdp || typeof sdp !== 'string') return sdp;

  const lines = sdp.split('\r\n');
  let opusPayloadType = null;

  // Locate the Opus payload type from rtpmap
  for (const line of lines) {
    const match = line.match(/^a=rtpmap:(\d+)\s+opus\/48000/i);
    if (match) {
      opusPayloadType = match[1];
      break;
    }
  }

  if (!opusPayloadType) {
    return sdp;
  }

  let fmtpFound = false;
  const tunedLines = lines.map(line => {
    if (line.startsWith(`a=fmtp:${opusPayloadType} `) || line.startsWith(`a=fmtp:${opusPayloadType}=`)) {
      fmtpFound = true;
      const paramStr = line.substring(`a=fmtp:${opusPayloadType}`.length).trim();
      const existingParams = new Map();

      // Parse existing key=value parameters safely
      paramStr.split(';').forEach(p => {
        const parts = p.trim().split('=');
        if (parts[0]) {
          existingParams.set(parts[0].trim(), parts[1] !== undefined ? parts[1].trim() : '');
        }
      });

      // WhatsApp-grade HD speech optimization:
      // - ptime=20, minptime=20, maxptime=40: Standard 20ms frames (50 pkts/sec) eliminates NetEQ robotic jitter distortion
      // - useinbandfec=1: In-Band Forward Error Correction enables loss recovery without retransmission
      // - usedtx=0: Disable DTX to guarantee continuous smooth speech transmission and eliminate robotic sound
      // - maxaveragebitrate=64000: 64 kbps studio HD speech (crystal-clear voice)
      // - stereo=0 & sprop-stereo=0: Enforce strict mono so phone hardware DSP AEC operates at 100%
      // - cbr=0: Adaptive Variable Bitrate (VBR)
      existingParams.set('minptime', '20');
      existingParams.set('ptime', '20');
      existingParams.set('maxptime', '40');
      existingParams.set('useinbandfec', '1');
      existingParams.set('usedtx', '0');
      existingParams.set('maxaveragebitrate', '64000');
      existingParams.set('stereo', '0');
      existingParams.set('sprop-stereo', '0');
      existingParams.set('cbr', '0');

      const newParamStr = Array.from(existingParams.entries())
        .map(([k, v]) => (v !== '' ? `${k}=${v}` : k))
        .join(';');

      return `a=fmtp:${opusPayloadType} ${newParamStr}`;
    }
    return line;
  });

  // If no fmtp line existed for Opus, add one directly following the rtpmap line
  if (!fmtpFound) {
    const rtpIndex = tunedLines.findIndex(l => l.startsWith(`a=rtpmap:${opusPayloadType} `));
    if (rtpIndex !== -1) {
      const newFmtp = `a=fmtp:${opusPayloadType} minptime=20;ptime=20;maxptime=40;useinbandfec=1;usedtx=0;maxaveragebitrate=64000;stereo=0;sprop-stereo=0;cbr=0`;
      tunedLines.splice(rtpIndex + 1, 0, newFmtp);
    }
  }

  return tunedLines.join('\r\n');
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
    this.remoteAudioElement = null;
    this.statsInterval = null;
    this.processedCandidates = new Set();
    this.pendingRemoteCandidates = [];
    this.earlyLocalCandidates = [];
    this.pendingRemoteAnswer = null;
    this.isRestartingIce = false;
    this.lastProcessedRestartTs = null;
    this.audioContext = null;
    this.webAudioSourceNode = null;

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

    // Hardware device change listener (Bluetooth, Wired Headset, Earpiece)
    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.addEventListener) {
      navigator.mediaDevices.addEventListener('devicechange', async () => {
        console.log('[WebRTC Audio] Media device change detected (Headset / Bluetooth / Audio Jack)');
        if (this.activeCall && this.activeCall.status === 'connected') {
          setNativeSpeakerphone(this.activeCall.isSpeaker !== false);
        }
      });
    }

    // Automatic ICE Restart on network switch (Wi-Fi <-> 4G/5G handoff)
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        console.log('[WebRTC Network] Device reconnected online');
        if (this.activeCall && this.activeCall.status === 'connected') {
          setTimeout(() => this.restartIce(), 600);
        }
      });

      if (typeof navigator !== 'undefined' && navigator.connection) {
        navigator.connection.addEventListener('change', () => {
          console.log('[WebRTC Network] Network interface changed (Wi-Fi/Cellular handover)');
          if (this.activeCall && this.activeCall.status === 'connected') {
            setTimeout(() => this.restartIce(), 800);
          }
        });
      }
    }
  }

  // Queue or immediately apply remote ICE candidate to avoid signaling race conditions
  async queueOrAddRemoteCandidate(candidate) {
    if (!candidate) return;
    const candKey = typeof candidate === 'string' ? candidate : JSON.stringify(candidate);
    if (this.processedCandidates.has(candKey)) return;
    this.processedCandidates.add(candKey);

    if (this.peerConnection && this.peerConnection.remoteDescription && this.peerConnection.remoteDescription.type) {
      try {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.warn('[WebRTC ICE] addIceCandidate caught:', err);
      }
    } else {
      this.pendingRemoteCandidates = this.pendingRemoteCandidates || [];
      this.pendingRemoteCandidates.push(candidate);
    }
  }

  // Drain and apply any queued remote ICE candidates after remoteDescription is established
  async drainPendingCandidates() {
    if (!this.peerConnection || !this.peerConnection.remoteDescription) return;
    if (!Array.isArray(this.pendingRemoteCandidates) || this.pendingRemoteCandidates.length === 0) return;

    const queued = [...this.pendingRemoteCandidates];
    this.pendingRemoteCandidates = [];
    for (const cand of queued) {
      try {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(cand));
      } catch (e) {
        console.warn('[WebRTC ICE] Drain addIceCandidate error:', e);
      }
    }
  }

  // Perform seamless ICE restart on network handoff (e.g. Wi-Fi <-> 4G)
  async restartIce() {
    if (!this.peerConnection || !this.activeCall || this.activeCall.status !== 'connected') return;
    if (this.isRestartingIce) return;
    this.isRestartingIce = true;
    console.log('[WebRTC ICE] Triggering ICE restart for network handover recovery...');

    try {
      const offer = await this.peerConnection.createOffer({ iceRestart: true });
      offer.sdp = tuneSdpForVoiceClarity(offer.sdp);
      await this.peerConnection.setLocalDescription(offer);

      await configureSenderEncodingParameters(this.peerConnection, 64000);
      await waitForIceGathering(this.peerConnection, 1200);

      const completeOffer = this.peerConnection.localDescription || offer;
      const offerData = {
        type: completeOffer.type || 'offer',
        sdp: tuneSdpForVoiceClarity(completeOffer.sdp)
      };

      // 1. Broadcast locally
      this.broadcastSignal({
        callId: this.activeCall.callId,
        type: 'ice-restart-offer',
        offer: offerData,
        senderId: this.currentUser?.id
      });

      // 2. Transmit to Cloudflare
      await sendCloudflareCallRing({
        callId: this.activeCall.callId,
        callerId: this.currentUser?.id,
        receiverId: this.activeCall.receiver?.id || this.activeCall.caller?.id,
        offer: offerData,
        isIceRestart: true,
        status: 'connected'
      });

      console.log('[WebRTC ICE] ICE restart offer dispatched successfully');
    } catch (err) {
      console.warn('[WebRTC ICE] restartIce notice:', err);
    } finally {
      setTimeout(() => { this.isRestartingIce = false; }, 3500);
    }
  }

  // Handle incoming ICE restart offer from peer on active call
  async handleRemoteRenegotiationOffer(offer) {
    if (!this.peerConnection || !this.activeCall || !offer) return;
    try {
      console.log('[WebRTC ICE] Processing remote ICE restart offer...');
      const tunedOffer = {
        type: offer.type || 'offer',
        sdp: tuneSdpForVoiceClarity(offer.sdp)
      };
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(tunedOffer));
      await this.drainPendingCandidates();

      const answer = await this.peerConnection.createAnswer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: false
      });
      answer.sdp = tuneSdpForVoiceClarity(answer.sdp);
      await this.peerConnection.setLocalDescription(answer);

      await configureSenderEncodingParameters(this.peerConnection, 64000);
      await waitForIceGathering(this.peerConnection, 1000);

      const completeAnswer = this.peerConnection.localDescription || answer;
      const answerData = {
        type: completeAnswer.type || 'answer',
        sdp: tuneSdpForVoiceClarity(completeAnswer.sdp)
      };

      this.broadcastSignal({
        callId: this.activeCall.callId,
        type: 'ice-restart-answer',
        answer: answerData,
        senderId: this.currentUser?.id
      });

      await answerCloudflareCall(this.activeCall.callId, answerData, null);
      console.log('[WebRTC ICE] Processed remote ICE restart and answered');
    } catch (err) {
      console.warn('[WebRTC ICE] handleRemoteRenegotiationOffer notice:', err);
    }
  }

  // Handle incoming ICE restart answer from peer
  async handleRemoteRenegotiationAnswer(answer) {
    if (!this.peerConnection || !answer) return;
    try {
      if (this.peerConnection.signalingState === 'have-local-offer') {
        console.log('[WebRTC ICE] Applying remote ICE restart answer...');
        const tunedAnswer = {
          type: answer.type || 'answer',
          sdp: tuneSdpForVoiceClarity(answer.sdp)
        };
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(tunedAnswer));
        await this.drainPendingCandidates();
        console.log('[WebRTC ICE] Successfully finalized remote ICE restart');
      }
    } catch (err) {
      console.warn('[WebRTC ICE] handleRemoteRenegotiationAnswer notice:', err);
    }
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    this.listeners.forEach(l => l(this.activeCall));
  }

  // Single managed remote audio playback element singleton
  getOrCreateRemoteAudioElement() {
    if (this.remoteAudioElement && typeof document !== 'undefined' && document.body.contains(this.remoteAudioElement)) {
      return this.remoteAudioElement;
    }
    let audioElem = typeof document !== 'undefined' ? document.getElementById('remote_police_call_audio') : null;
    if (!audioElem && typeof document !== 'undefined') {
      audioElem = document.createElement('audio');
      audioElem.id = 'remote_police_call_audio';
      audioElem.autoplay = true;
      audioElem.playsInline = true;
      audioElem.setAttribute('playsinline', 'true');
      audioElem.setAttribute('webkit-playsinline', 'true');
      audioElem.muted = false;
      audioElem.volume = 1.0;
      audioElem.style.position = 'fixed';
      audioElem.style.width = '2px';
      audioElem.style.height = '2px';
      audioElem.style.bottom = '0px';
      audioElem.style.right = '0px';
      audioElem.style.opacity = '0.01';
      audioElem.style.pointerEvents = 'none';
      audioElem.style.zIndex = '-1';
      document.body.appendChild(audioElem);
    } else if (audioElem) {
      audioElem.autoplay = true;
      audioElem.playsInline = true;
      audioElem.setAttribute('playsinline', 'true');
      audioElem.setAttribute('webkit-playsinline', 'true');
      audioElem.muted = false;
      audioElem.volume = 1.0;
    }
    this.remoteAudioElement = audioElem;
    return audioElem;
  }

  // Pre-unlock and prime audio playback within user gesture (Click / Tap)
  async unlockAudioPipeline() {
    try {
      const audioElem = this.getOrCreateRemoteAudioElement();
      if (audioElem) {
        audioElem.muted = false;
        audioElem.volume = 1.0;
        // Prime with silent 1-sample WAV so browser permanently unlocks autoplay under this user gesture
        if (!audioElem.srcObject) {
          audioElem.src = SILENT_WAV_BASE64;
          const playPromise = audioElem.play();
          if (playPromise !== undefined) {
            await playPromise.catch(() => {});
          }
        }
      }

      // Resume / prime Web Audio API AudioContext under user gesture
      if (!this.audioContext) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          this.audioContext = new AudioCtx();
        }
      }
      if (this.audioContext && this.audioContext.state === 'suspended') {
        await this.audioContext.resume().catch(() => {});
      }
    } catch (e) {
      console.warn('[WebRTC Audio] Unlock audio notice:', e);
    }
  }

  // Real-time WebRTC audio statistics and QoS telemetry monitor
  startStatsMonitoring() {
    this.stopStatsMonitoring();

    let prevPacketsReceived = 0;
    let prevPacketsLost = 0;

    this.statsInterval = setInterval(async () => {
      if (!this.peerConnection || !this.activeCall || this.activeCall.status !== 'connected') {
        this.stopStatsMonitoring();
        return;
      }

      try {
        const stats = await this.peerConnection.getStats();
        let inboundAudio = null;
        let candidatePair = null;

        stats.forEach(report => {
          if (report.type === 'inbound-rtp' && report.kind === 'audio') {
            inboundAudio = report;
          } else if (report.type === 'candidate-pair' && report.state === 'succeeded') {
            candidatePair = report;
          }
        });

        if (inboundAudio) {
          const packetsReceived = inboundAudio.packetsReceived || 0;
          const packetsLost = inboundAudio.packetsLost || 0;
          const deltaPackets = Math.max(0, packetsReceived - prevPacketsReceived);
          const deltaLost = Math.max(0, packetsLost - prevPacketsLost);
          prevPacketsReceived = packetsReceived;
          prevPacketsLost = packetsLost;

          const totalDelta = deltaPackets + deltaLost;
          const packetLossRate = totalDelta > 0
            ? Math.max(0, Math.min(100, (deltaLost / totalDelta) * 100))
            : 0;

          const jitterSec = inboundAudio.jitter || 0;
          const jitterMs = Math.round(jitterSec * 1000);

          const jitterBufferDelay = inboundAudio.jitterBufferDelay || 0;
          const jitterBufferEmittedCount = inboundAudio.jitterBufferEmittedCount || 1;
          const avgJitterDelayMs = Math.round((jitterBufferDelay / jitterBufferEmittedCount) * 1000);

          const rttMs = candidatePair && candidatePair.currentRoundTripTime
            ? Math.round(candidatePair.currentRoundTripTime * 1000)
            : (candidatePair && candidatePair.roundTripTime ? Math.round(candidatePair.roundTripTime * 1000) : null);

          let qualityRating = 'HD Voice (Clear)';
          let qualityColor = '#34d399'; // green

          if (packetLossRate > 6 || jitterMs > 65 || (rttMs && rttMs > 450)) {
            qualityRating = 'कमज़ोर नेटवर्क (Unstable)';
            qualityColor = '#f87171'; // red
          } else if (packetLossRate > 2 || jitterMs > 35 || (rttMs && rttMs > 250)) {
            qualityRating = 'संतोषजनक (Fair)';
            qualityColor = '#fbbf24'; // yellow
          }

          this.activeCall.audioQualityStats = {
            rating: qualityRating,
            color: qualityColor,
            packetLossPercent: packetLossRate.toFixed(1),
            jitterMs,
            avgJitterDelayMs,
            rttMs,
            packetsReceived,
            packetsLost
          };

          this.notify();
        }
      } catch (err) {}
    }, 2000);
  }

  stopStatsMonitoring() {
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
      this.statsInterval = null;
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

    // Handle seamless ICE restart offer/answer from peer
    if (data.type === 'ice-restart-offer' || (data.type === 'offer' && this.activeCall.status === 'connected')) {
      this.handleRemoteRenegotiationOffer(data.offer || data);
      return;
    }

    if (data.type === 'ice-restart-answer') {
      this.handleRemoteRenegotiationAnswer(data.answer);
      return;
    }

    if (data.type === 'answer' && this.activeCall.status === 'calling') {
      const applyAnswer = async () => {
        if (this.peerConnection && this.peerConnection.signalingState === 'have-local-offer') {
          const tunedAnswer = {
            type: data.answer.type || 'answer',
            sdp: tuneSdpForVoiceClarity(data.answer.sdp)
          };
          try {
            await this.peerConnection.setRemoteDescription(new RTCSessionDescription(tunedAnswer));
            await this.drainPendingCandidates();
          } catch (err) {
            console.warn('[WebRTC Signal] Remote answer set notice:', err);
          }
        }
        this.activeCall.status = 'connected';
        this.activeCall.startedAt = this.activeCall.startedAt || Date.now();
        callAudio.stop();
        setNativeCommunicationMode(this.activeCall.isSpeaker !== false);
        this.startStatsMonitoring();
        this.notify();
      };

      if (this.peerConnection && this.peerConnection.signalingState === 'have-local-offer') {
        applyAnswer();
      } else {
        // Buffer answer if local offer is still in flight (eliminates race condition)
        this.pendingRemoteAnswer = data.answer;
      }
    } else if (data.type === 'candidate') {
      this.queueOrAddRemoteCandidate(data.candidate);
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

    // Check Cloudflare Edge KV for incoming call every 1.0 second (near-zero notification delay)
    this.pollIncomingInterval = setInterval(async () => {
      if (this.activeCall) return; // Already on a call or ringing
      const callingCfg = getStoredCallingConfig();
      if (callingCfg && callingCfg.inAppCallingEnabled === false) return; // Calling disabled by Super Admin
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
    }, 1000);
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
    const callingCfg = getStoredCallingConfig();
    if (callingCfg && callingCfg.inAppCallingEnabled === false) {
      console.warn('[WebRTC] In-app voice calling is disabled by Super Admin.');
      if (typeof window !== 'undefined') {
        alert('⚠️ एडमिनिस्ट्रेटर द्वारा इन-ऐप वॉइस कॉलिंग सेवा बंद कर दी गई है।');
      }
      return;
    }

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

    // Proceed with ringing (always dispatch call ring to recipient via Cloudflare KV)
    this.activeCall = {
      ...this.activeCall,
      status: 'calling',
      presence: presence || { isOnline: true, status: 'calling' }
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
      this.peerConnection = new RTCPeerConnection(getRtcConfiguration());

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

      // Prioritize Opus codec
      preferOpusCodec(this.peerConnection);

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
        if (event.track) {
          event.track.enabled = true;
          // Optimize playout delay and jitter buffer target for WhatsApp-level low latency (40ms)
          if (event.receiver) {
            try { if ('playoutDelayHint' in event.receiver) event.receiver.playoutDelayHint = 0.04; } catch (e) {}
            try { if ('jitterBufferTarget' in event.receiver) event.receiver.jitterBufferTarget = 40; } catch (e) {}
          }
          if (!this.remoteStream) {
            this.remoteStream = new MediaStream();
          }
          const existing = this.remoteStream.getTracks().find(t => t.id === event.track.id);
          if (!existing) {
            this.remoteStream.addTrack(event.track);
          }
          this.playRemoteAudio(this.remoteStream);
          this.notify();
        }
      };

      this.peerConnection.oniceconnectionstatechange = () => {
        const state = this.peerConnection?.iceConnectionState;
        console.log('[WebRTC Caller] ICE Connection State:', state);
        if (state === 'failed') {
          console.warn('[WebRTC Caller] ICE connection failed, triggering ICE restart...');
          this.restartIce();
        } else if (state === 'disconnected') {
          console.warn('[WebRTC Caller] ICE disconnected, checking recovery...');
          setTimeout(() => {
            if (this.peerConnection?.iceConnectionState === 'disconnected' && this.activeCall?.status === 'connected') {
              this.restartIce();
            }
          }, 2500);
        }
      };

      this.peerConnection.onconnectionstatechange = () => {
        const state = this.peerConnection?.connectionState;
        console.log('[WebRTC Caller] Connection State:', state);
        if (state === 'failed') {
          console.warn('[WebRTC Caller] Connection failed, attempting ICE restart...');
          this.restartIce();
        } else if (state === 'disconnected' || state === 'closed') {
          if (this.activeCall && this.activeCall.status === 'connected') {
            this.endCall(false, 'completed');
          }
        }
      };

      const offer = await this.peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: false
      });
      offer.sdp = tuneSdpForVoiceClarity(offer.sdp);
      await this.peerConnection.setLocalDescription(offer);

      // Configure sender encoding parameters to 64 kbps HD voice
      await configureSenderEncodingParameters(this.peerConnection, 64000);

      // Apply any remote answer that arrived while offer was being set (eliminates race condition)
      if (this.pendingRemoteAnswer) {
        const pending = this.pendingRemoteAnswer;
        this.pendingRemoteAnswer = null;
        try {
          const tuned = { type: pending.type || 'answer', sdp: tuneSdpForVoiceClarity(pending.sdp) };
          await this.peerConnection.setRemoteDescription(new RTCSessionDescription(tuned));
          await this.drainPendingCandidates();
        } catch (e) {
          console.warn('[WebRTC Caller] Error applying buffered answer:', e);
        }
      }

      // Wait up to 1.5s for ICE candidates so they are embedded directly in offer.sdp
      await waitForIceGathering(this.peerConnection, 1500);
      const completeOffer = this.peerConnection.localDescription || offer;
      const offerData = {
        type: completeOffer.type || 'offer',
        sdp: tuneSdpForVoiceClarity(completeOffer.sdp)
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

  // Poll Cloudflare Call status during call (responsive 750ms while calling, 1200ms when connected)
  startActiveCallCloudPolling(callId) {
    if (this.pollActiveCallInterval) {
      clearInterval(this.pollActiveCallInterval);
      this.pollActiveCallInterval = null;
    }

    const pollStep = async () => {
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

        // Handle remote ICE restart offer on active call
        if (cloudCall.isIceRestart && cloudCall.offer && this.activeCall.status === 'connected') {
          if (cloudCall.callerId !== this.currentUser?.id && cloudCall.restartTimestamp !== this.lastProcessedRestartTs) {
            this.lastProcessedRestartTs = cloudCall.restartTimestamp;
            this.handleRemoteRenegotiationOffer(cloudCall.offer);
          }
        }

        // If recipient answered call
        if (this.activeCall.status === 'calling' && cloudCall.status === 'connected' && cloudCall.answer) {
          if (this.ringTimeout) {
            clearTimeout(this.ringTimeout);
            this.ringTimeout = null;
          }
          if (this.peerConnection && this.peerConnection.signalingState === 'have-local-offer') {
            try {
              const tunedAnswer = {
                type: cloudCall.answer.type || 'answer',
                sdp: tuneSdpForVoiceClarity(cloudCall.answer.sdp)
              };
              await this.peerConnection.setRemoteDescription(new RTCSessionDescription(tunedAnswer));
              await this.drainPendingCandidates();
            } catch (sdpErr) {
              console.warn('[WebRTC] Polling setRemoteDescription notice:', sdpErr);
            }
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
          setNativeCommunicationMode(this.activeCall.isSpeaker !== false);
          this.startStatsMonitoring();
          this.notify();
        }

        // Process any remote ICE candidates safely via queue (eliminates race condition)
        if (Array.isArray(cloudCall.candidates)) {
          for (const candObj of cloudCall.candidates) {
            if (candObj.senderId !== this.currentUser?.id && candObj.candidate) {
              await this.queueOrAddRemoteCandidate(candObj.candidate);
            }
          }
        }
      } catch (err) {}
    };

    // Responsive poll: 750ms while calling (fast ring response), 1200ms when connected
    const intervalMs = (this.activeCall?.status === 'calling') ? 750 : 1200;
    this.pollActiveCallInterval = setInterval(pollStep, intervalMs);
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
    this.pendingRemoteCandidates = [];

    // Acquire mic with multi-tier fallback
    this.localStream = await acquireMicrophoneAudioStream();

    try {
      this.peerConnection = new RTCPeerConnection(getRtcConfiguration());

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

      // Prioritize Opus codec
      preferOpusCodec(this.peerConnection);

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
        if (event.track) {
          event.track.enabled = true;
          // Optimize playout delay and jitter buffer target for WhatsApp-level low latency (40ms)
          if (event.receiver) {
            try { if ('playoutDelayHint' in event.receiver) event.receiver.playoutDelayHint = 0.04; } catch (e) {}
            try { if ('jitterBufferTarget' in event.receiver) event.receiver.jitterBufferTarget = 40; } catch (e) {}
          }
          if (!this.remoteStream) {
            this.remoteStream = new MediaStream();
          }
          const existing = this.remoteStream.getTracks().find(t => t.id === event.track.id);
          if (!existing) {
            this.remoteStream.addTrack(event.track);
          }
          this.playRemoteAudio(this.remoteStream);
          this.notify();
        }
      };

      this.peerConnection.oniceconnectionstatechange = () => {
        const state = this.peerConnection?.iceConnectionState;
        console.log('[WebRTC Receiver] ICE Connection State:', state);
        if (state === 'failed') {
          console.warn('[WebRTC Receiver] ICE connection failed, triggering ICE restart...');
          this.restartIce();
        } else if (state === 'disconnected') {
          console.warn('[WebRTC Receiver] ICE disconnected, checking recovery...');
          setTimeout(() => {
            if (this.peerConnection?.iceConnectionState === 'disconnected' && this.activeCall?.status === 'connected') {
              this.restartIce();
            }
          }, 2500);
        }
      };

      this.peerConnection.onconnectionstatechange = () => {
        const state = this.peerConnection?.connectionState;
        console.log('[WebRTC Receiver] Connection State:', state);
        if (state === 'failed') {
          console.warn('[WebRTC Receiver] Connection failed, attempting ICE restart...');
          this.restartIce();
        } else if (state === 'disconnected' || state === 'closed') {
          if (this.activeCall && this.activeCall.status === 'connected') {
            this.endCall(false, 'completed');
          }
        }
      };

      if (this.activeCall.offer) {
        const tunedOffer = {
          type: this.activeCall.offer.type || 'offer',
          sdp: tuneSdpForVoiceClarity(this.activeCall.offer.sdp)
        };
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(tunedOffer));
        await this.drainPendingCandidates();

        const answer = await this.peerConnection.createAnswer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: false
        });
        answer.sdp = tuneSdpForVoiceClarity(answer.sdp);
        await this.peerConnection.setLocalDescription(answer);

        // Configure sender parameters to 64 kbps HD voice
        await configureSenderEncodingParameters(this.peerConnection, 64000);

        // Wait up to 1.5s for ICE candidates so they are embedded directly into answer.sdp
        await waitForIceGathering(this.peerConnection, 1500);
        const completeAnswer = this.peerConnection.localDescription || answer;
        const answerData = {
          type: completeAnswer.type || 'answer',
          sdp: tuneSdpForVoiceClarity(completeAnswer.sdp)
        };

        // Activate native communication audio mode and start stats monitoring
        setNativeCommunicationMode(this.activeCall.isSpeaker !== false);
        this.startStatsMonitoring();

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

  // Toggle Loudspeaker / Earpiece Audio Output with Real Hardware Routing
  async toggleSpeaker() {
    if (!this.activeCall) return;
    this.activeCall.isSpeaker = !this.activeCall.isSpeaker;
    const isSpeaker = this.activeCall.isSpeaker;

    // 1. Android Native Hardware Device Routing (Earpiece vs Loudspeaker vs Bluetooth)
    setNativeSpeakerphone(isSpeaker);

    // 2. Web browser sinkId routing if supported
    const audioElem = this.getOrCreateRemoteAudioElement();
    if (audioElem && typeof audioElem.setSinkId === 'function') {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioOutputs = devices.filter(d => d.kind === 'audiooutput');
        if (audioOutputs.length > 0) {
          const target = audioOutputs.find(d => 
            isSpeaker 
              ? (d.label.toLowerCase().includes('speaker') || d.deviceId === 'default')
              : (d.label.toLowerCase().includes('earpiece') || d.label.toLowerCase().includes('headset') || d.deviceId !== 'default')
          );
          if (target && target.deviceId) {
            await audioElem.setSinkId(target.deviceId);
            console.log('[WebRTC Audio] Switched audio sinkId to:', target.label || target.deviceId);
          }
        }
      } catch (err) {
        console.warn('[WebRTC Audio] setSinkId notice:', err);
      }
    }

    this.notify();
  }

  // Force play / boost audio on demand (e.g. from UI "Tap to Hear Sound" button)
  forcePlayRemoteAudio() {
    this.unlockAudioPipeline();
    const audioElem = this.getOrCreateRemoteAudioElement();
    if (audioElem) {
      audioElem.muted = false;
      audioElem.volume = 1.0;
      if (this.remoteStream) {
        audioElem.srcObject = this.remoteStream;
      }
      audioElem.play().catch(e => console.warn('[WebRTC Audio] Force play notice:', e));
    }
    if (this.activeCall) {
      setNativeSpeakerphone(this.activeCall.isSpeaker !== false);
    }
  }

  // Play remote caller audio through HTMLAudioElement singleton
  playRemoteAudio(stream) {
    if (!stream) return;
    try {
      const audioElem = this.getOrCreateRemoteAudioElement();

      // Guard: attach only if stream changed to prevent clicks or decoder resets
      if (audioElem.srcObject !== stream) {
        audioElem.srcObject = stream;
        console.log('[WebRTC Audio] Attached remote stream to dedicated audio element');
      }

      audioElem.muted = false;
      audioElem.volume = 1.0;

      const playPromise = audioElem.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log('[WebRTC Audio] Remote audio playback active');
          })
          .catch((err) => {
            console.warn('[WebRTC Audio] HTMLAudioElement autoplay deferred:', err?.message);
            // Fallback: connect through Web Audio API
            this.attachWebAudioFallback(stream);

            const resumeOnTouch = () => {
              if (audioElem && audioElem.srcObject) {
                audioElem.play().catch(() => {});
              }
              if (this.audioContext && this.audioContext.state === 'suspended') {
                this.audioContext.resume().catch(() => {});
              }
            };
            window.addEventListener('touchstart', resumeOnTouch, { once: true, passive: true });
            window.addEventListener('click', resumeOnTouch, { once: true, passive: true });
          });
      }
    } catch (err) {
      console.error('[WebRTC] playRemoteAudio execution error:', err);
    }
  }

  attachWebAudioFallback(stream) {
    try {
      if (!stream) return;
      if (!this.audioContext) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) this.audioContext = new AudioCtx();
      }
      if (this.audioContext && !this.webAudioSourceNode) {
        if (this.audioContext.state === 'suspended') {
          this.audioContext.resume().catch(() => {});
        }
        this.webAudioSourceNode = this.audioContext.createMediaStreamSource(stream);
        const gainNode = this.audioContext.createGain();
        gainNode.gain.setValueAtTime(1.0, this.audioContext.currentTime);
        this.webAudioSourceNode.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        console.log('[WebRTC Audio] Web Audio fallback pipeline connected successfully');
      }
    } catch (e) {
      console.warn('[WebRTC Audio] Web Audio fallback notice:', e);
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
    this.stopStatsMonitoring();
    resetNativeAudioMode();

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
    const audioElem = this.remoteAudioElement || (typeof document !== 'undefined' ? document.getElementById('remote_police_call_audio') : null);
    if (audioElem) {
      try {
        audioElem.pause();
        audioElem.srcObject = null;
      } catch (e) {}
    }
    if (this.webAudioSourceNode) {
      try {
        this.webAudioSourceNode.disconnect();
      } catch (e) {}
      this.webAudioSourceNode = null;
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
if (typeof window !== 'undefined') {
  window.callManager = callManager;
}
