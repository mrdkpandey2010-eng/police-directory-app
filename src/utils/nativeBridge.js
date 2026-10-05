import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';

/**
 * Android Native Bridge & Hardware Integration
 * Handles:
 * 1. Safe Status Bar styling
 * 2. Splash Screen dismissal
 * 3. Hardware / Gesture Back Button handling with modal stack & double-tap to exit
 */

let lastBackPressTime = 0;

export const isNativeAndroid = () => {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
};

export const initNativeApp = async () => {
  if (!Capacitor.isNativePlatform()) return;

  try {
    // 1. Android Status Bar Styling (Dark with Police Navy background)
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#070e1c' });
    await StatusBar.setOverlaysWebView({ overlay: false });
  } catch (err) {
    console.warn('[NativeBridge] StatusBar init note:', err?.message || err);
  }

  try {
    // 2. Hide Native Splash Screen once app renders
    await SplashScreen.hide({ fadeOutDuration: 400 });
  } catch (err) {
    console.warn('[NativeBridge] SplashScreen hide note:', err?.message || err);
  }
};

/**
 * Setup Android Hardware / Gesture Back Button Listener
 * @param {Function} handleBackNavigation - Callback function returning true if an action (like closing a modal) was handled
 * @param {Function} showToast - Callback to show exit warning toast
 */
export const setupHardwareBackButton = (handleBackNavigation, showToast) => {
  if (!Capacitor.isNativePlatform()) return () => {};

  const backListener = App.addListener('backButton', ({ canGoBack }) => {
    // Check if any modal, drawer, or subview is open
    const wasHandled = handleBackNavigation ? handleBackNavigation() : false;
    if (wasHandled) {
      // Handled internally (modal closed), don't exit app
      return;
    }

    // Main view reached: Require double-tap to exit
    const currentTime = Date.now();
    if (currentTime - lastBackPressTime < 2000) {
      // Exit app cleanly
      App.exitApp();
    } else {
      lastBackPressTime = currentTime;
      if (showToast) {
        showToast('ऐप से बाहर निकलने के लिए एक बार और बैक दबाएं');
      }
    }
  });

  return () => {
    backListener.then(sub => sub.remove()).catch(() => {});
  };
};
