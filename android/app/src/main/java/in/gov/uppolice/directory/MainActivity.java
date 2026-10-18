package in.gov.uppolice.directory;

import android.os.Bundle;
import android.os.Build;
import android.content.Context;
import android.media.AudioAttributes;
import android.media.AudioDeviceInfo;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import android.content.pm.PackageManager;
import android.Manifest;
import com.getcapacitor.BridgeActivity;
import java.util.List;

public class MainActivity extends BridgeActivity {
    private AudioManager audioManager;
    private AudioFocusRequest audioFocusRequest;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        audioManager = (AudioManager) getSystemService(Context.AUDIO_SERVICE);

        try {
            WebView webView = getBridge().getWebView();
            if (webView != null) {
                WebSettings settings = webView.getSettings();
                // Allow WebRTC audio playback without user gesture blocks
                settings.setMediaPlaybackRequiresUserGesture(false);

                // Attach Native Audio Routing Interface to WebView for WhatsApp-quality voice routing
                webView.addJavascriptInterface(new AndroidAudioInterface(), "AndroidAudioRouting");
            }
        } catch (Exception ignored) {}
    }

    public class AndroidAudioInterface {
        @JavascriptInterface
        public boolean setCommunicationMode(boolean isSpeaker) {
            try {
                if (audioManager == null) {
                    audioManager = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
                }
                if (audioManager == null) return false;

                // 1. Activate Communication Mode (enables Hardware AEC & Noise Suppressor DSP)
                audioManager.setMode(AudioManager.MODE_IN_COMMUNICATION);

                // 2. Request Exclusive Audio Focus for Voice Communication
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    AudioAttributes playbackAttributes = new AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_VOICE_COMMUNICATION)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                        .build();
                    audioFocusRequest = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_EXCLUSIVE)
                        .setAudioAttributes(playbackAttributes)
                        .setAcceptsDelayedFocusGain(true)
                        .build();
                    audioManager.requestAudioFocus(audioFocusRequest);
                } else {
                    audioManager.requestAudioFocus(null, AudioManager.STREAM_VOICE_CALL, AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_EXCLUSIVE);
                }

                // 3. Route to Speaker or Earpiece / Headset
                setSpeakerphone(isSpeaker);
                return true;
            } catch (Exception e) {
                return false;
            }
        }

        @JavascriptInterface
        public boolean setSpeakerphone(boolean isSpeaker) {
            try {
                if (audioManager == null) return false;

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    List<AudioDeviceInfo> availableDevices = audioManager.getAvailableCommunicationDevices();
                    AudioDeviceInfo targetDevice = null;

                    if (isSpeaker) {
                        for (AudioDeviceInfo device : availableDevices) {
                            if (device.getType() == AudioDeviceInfo.TYPE_BUILTIN_SPEAKER) {
                                targetDevice = device;
                                break;
                            }
                        }
                    } else {
                        // Check for Bluetooth or Wired Headset first if user prefers non-speaker
                        for (AudioDeviceInfo device : availableDevices) {
                            if (device.getType() == AudioDeviceInfo.TYPE_BLUETOOTH_SCO ||
                                device.getType() == AudioDeviceInfo.TYPE_WIRED_HEADSET ||
                                device.getType() == AudioDeviceInfo.TYPE_WIRED_HEADPHONES) {
                                targetDevice = device;
                                break;
                            }
                        }
                        // Default to built-in earpiece for normal telephone call
                        if (targetDevice == null) {
                            for (AudioDeviceInfo device : availableDevices) {
                                if (device.getType() == AudioDeviceInfo.TYPE_BUILTIN_EARPIECE) {
                                    targetDevice = device;
                                    break;
                                }
                            }
                        }
                    }

                    if (targetDevice != null) {
                        return audioManager.setCommunicationDevice(targetDevice);
                    }
                }

                // Fallback for Android < 12
                audioManager.setSpeakerphoneOn(isSpeaker);
                return true;
            } catch (Exception e) {
                return false;
            }
        }

        @JavascriptInterface
        public boolean resetAudioMode() {
            try {
                if (audioManager == null) return false;

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    audioManager.clearCommunicationDevice();
                }
                audioManager.setSpeakerphoneOn(false);
                audioManager.setMode(AudioManager.MODE_NORMAL);

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && audioFocusRequest != null) {
                    audioManager.abandonAudioFocusRequest(audioFocusRequest);
                    audioFocusRequest = null;
                } else {
                    audioManager.abandonAudioFocus(null);
                }
                return true;
            } catch (Exception e) {
                return false;
            }
        }

        @JavascriptInterface
        public String getAudioDeviceInfo() {
            try {
                if (audioManager == null) return "{}";
                int mode = audioManager.getMode();
                boolean speakerOn = audioManager.isSpeakerphoneOn();
                boolean bluetoothScoOn = audioManager.isBluetoothScoOn();
                return String.format("{\"mode\":%d,\"isSpeaker\":%b,\"bluetoothSco\":%b}", mode, speakerOn, bluetoothScoOn);
            } catch (Exception e) {
                return "{}";
            }
        }
    }
}
