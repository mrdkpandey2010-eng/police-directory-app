// Unified Notification Permission & Alert Dispatcher for Web & PWA
// Provides reliable permission requests, system push notifications, and sound/vibration alerts

export const getNotificationPermissionStatus = () => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission; // 'granted' | 'denied' | 'default'
};

export const requestAppNotificationPermission = async () => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      console.log('[Notification] Permission granted successfully');
      // If service worker is available, register push handler or test ping
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then(reg => {
          reg.showNotification('उत्तर प्रदेश पुलिस पोर्टल • सूचना अलर्ट', {
            body: 'शासकीय आपातकालीन कॉल एवं संदेश अलर्ट सक्रिय कर दिए गए हैं।',
            icon: '/police-icon.svg',
            badge: '/favicon.ico',
            vibrate: [200, 100, 200]
          }).catch(() => {});
        }).catch(() => {});
      }
    }
    return permission;
  } catch (err) {
    console.warn('[Notification] Permission request error:', err);
    return Notification.permission;
  }
};

export const showSystemCallNotification = (caller) => {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  const title = `🚨 इनकमिंग पुलिस कॉल: ${caller?.name || 'अधिकारी'}`;
  const options = {
    body: `${caller?.post || 'कार्मिक'} (${caller?.district || ''}) से इन-ऐप सुरक्षित कॉल आ रही है। कॉल उठाने हेतु टैप करें।`,
    icon: '/police-icon.svg',
    badge: '/favicon.ico',
    tag: 'incoming_police_call',
    requireInteraction: true,
    vibrate: [500, 250, 500, 250, 500, 250, 500],
    data: {
      type: 'call',
      caller
    }
  };

  try {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then(reg => {
        reg.showNotification(title, options).catch(() => {
          try { new Notification(title, options); } catch(e) {}
        });
      });
    } else {
      new Notification(title, options);
    }
  } catch (err) {
    console.warn('[Notification] System notification display error:', err);
  }
};

export const showSystemMissedCallNotification = (caller, reason = '') => {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  const title = `🔴 मिस्ड कॉल: ${caller?.name || 'अधिकारी'}`;
  const options = {
    body: `${caller?.post || 'कार्मिक'} (${caller?.district || ''}) द्वारा कॉल किया गया था (${reason || 'अनुत्तरित'})।`,
    icon: '/police-icon.svg',
    badge: '/favicon.ico',
    tag: `missed_call_${caller?.id || Date.now()}`,
    vibrate: [300, 150, 300]
  };

  try {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then(reg => {
        reg.showNotification(title, options).catch(() => {
          try { new Notification(title, options); } catch(e) {}
        });
      });
    } else {
      new Notification(title, options);
    }
  } catch (e) {}
};
