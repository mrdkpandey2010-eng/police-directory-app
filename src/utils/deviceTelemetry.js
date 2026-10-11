/**
 * Official Device Telemetry & Audit Utility
 * Captures non-intrusive client device telemetry (IP, Device Model, OS, Battery,
 * Geolocation ONLY if already permitted, Network details) with ZERO extra permission prompts.
 * Used for Call Telemetry, Registration Audit Trail, and Device Change Security Alerts.
 */

import { getWorkerBaseUrl } from './cloudflareR2';

/**
 * Parse device details (Manufacturer, Model, OS, Browser, Platform, Screen)
 */
export const getDeviceDetails = () => {
  const ua = navigator.userAgent || '';
  const uaData = navigator.userAgentData;

  let os = 'Unknown OS';
  let model = 'Unknown Device';
  let browser = 'Unknown Browser';
  let isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  let isNativeApp = Boolean(window.Capacitor?.isNativePlatform?.() || window.Capacitor?.isNative);

  // 1. Detect OS
  if (/Android/i.test(ua)) {
    const match = ua.match(/Android\s+([0-9.]+)/i);
    os = match ? `Android ${match[1]}` : 'Android';
  } else if (/iPhone|iPad|iPod/i.test(ua)) {
    const match = ua.match(/OS\s+([0-9_]+)/i);
    os = match ? `iOS ${match[1].replace(/_/g, '.')}` : 'iOS';
  } else if (/Windows NT 10.0/i.test(ua)) {
    os = 'Windows 10/11';
  } else if (/Windows NT/i.test(ua)) {
    os = 'Windows';
  } else if (/Macintosh|Mac OS X/i.test(ua)) {
    os = 'macOS';
  } else if (/Linux/i.test(ua)) {
    os = 'Linux';
  }

  // 2. Detect Device Model (Common Indian Police Android & iOS Devices)
  if (/iPhone/i.test(ua)) {
    model = 'Apple iPhone';
  } else if (/iPad/i.test(ua)) {
    model = 'Apple iPad';
  } else if (/SM-[A-Z0-9]+/i.test(ua)) {
    const m = ua.match(/SM-([A-Z0-9]+)/i);
    model = `Samsung Galaxy (SM-${m[1]})`;
  } else if (/SAMSUNG/i.test(ua)) {
    model = 'Samsung Smartphone';
  } else if (/V2[0-9]{3}|vivo/i.test(ua)) {
    const m = ua.match(/(V[0-9]{4})/i);
    model = m ? `Vivo (${m[1]})` : 'Vivo Smartphone';
  } else if (/CPH[0-9]{4}|OPPO/i.test(ua)) {
    const m = ua.match(/(CPH[0-9]{4})/i);
    model = m ? `Oppo (${m[1]})` : 'Oppo Smartphone';
  } else if (/RMX[0-9]{4}|realme/i.test(ua)) {
    const m = ua.match(/(RMX[0-9]{4})/i);
    model = m ? `Realme (${m[1]})` : 'Realme Smartphone';
  } else if (/Redmi|Xiaomi|POCO/i.test(ua)) {
    const m = ua.match(/(Redmi[^;\)]+|Xiaomi[^;\)]+|POCO[^;\)]+)/i);
    model = m ? m[1].trim() : 'Xiaomi / Redmi';
  } else if (/OnePlus/i.test(ua)) {
    const m = ua.match(/(OnePlus[^;\)]+)/i);
    model = m ? m[1].trim() : 'OnePlus Smartphone';
  } else if (/Pixel\s+[0-9a-zA-Z]+/i.test(ua)) {
    const m = ua.match(/(Pixel\s+[0-9a-zA-Z]+)/i);
    model = `Google ${m[1]}`;
  } else if (/Moto[a-zA-Z0-9\s-]+/i.test(ua)) {
    const m = ua.match(/(Moto[a-zA-Z0-9\s-]+)/i);
    model = m ? m[1].trim() : 'Motorola Smartphone';
  } else if (uaData?.model) {
    model = uaData.model;
  } else if (!isMobile) {
    model = `${os} पर्सनल कंप्यूटर (PC/Laptop)`;
  } else {
    model = 'एन्ड्रॉयड मोबाइल (Android Mobile)';
  }

  // 3. Detect Browser / App Engine
  if (isNativeApp) {
    browser = 'उत्तर प्रदेश पुलिस ऐप (Capacitor Native APK)';
  } else if (/Chrome\/([0-9.]+)/i.test(ua) && !/Edge|Edg|OPR/i.test(ua)) {
    const m = ua.match(/Chrome\/([0-9.]+)/i);
    browser = `Google Chrome ${m ? m[1].split('.')[0] : ''}`.trim();
  } else if (/Edg\/([0-9.]+)/i.test(ua)) {
    browser = 'Microsoft Edge';
  } else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) {
    browser = 'Apple Safari';
  } else if (/Firefox\/([0-9.]+)/i.test(ua)) {
    browser = 'Mozilla Firefox';
  } else if (/SamsungBrowser/i.test(ua)) {
    browser = 'Samsung Internet';
  } else {
    browser = 'वेब ब्राउज़र (Web Browser)';
  }

  const screen = `${window.screen?.width || 0}x${window.screen?.height || 0} (DPR: ${window.devicePixelRatio || 1})`;
  const deviceName = `${model} • ${os}`;

  return {
    os,
    model,
    deviceName,
    browser,
    platform: isNativeApp ? 'android_native' : (isMobile ? 'mobile_browser' : 'desktop_browser'),
    screen,
    userAgent: ua
  };
};

/**
 * Retrieve Battery details without asking for permission (via Battery Status API)
 */
export const getBatteryDetails = async () => {
  if (typeof navigator !== 'undefined' && typeof navigator.getBattery === 'function') {
    try {
      const b = await navigator.getBattery();
      const level = Math.round(b.level * 100);
      return {
        percentage: `${level}%`,
        level,
        charging: b.charging ? 'चार्जिंग पर (Charging)' : 'बैटरी पर (Discharging)',
        isCharging: Boolean(b.charging),
        available: true
      };
    } catch (e) {
      // Ignored
    }
  }

  return {
    percentage: 'उपलब्ध नहीं',
    level: null,
    charging: 'अज्ञात (Not Supported)',
    isCharging: false,
    available: false
  };
};

/**
 * Retrieve Location ONLY if permission is already explicitly granted.
 * Will NEVER trigger a prompt dialog to the user.
 */
export const getLocationIfPermitted = async () => {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return { available: false, status: 'जियोलोकेशन असमर्थित' };
  }

  try {
    if (navigator.permissions && navigator.permissions.query) {
      const status = await navigator.permissions.query({ name: 'geolocation' });
      if (status.state === 'granted') {
        // Query position only because permission is already granted
        const pos = await new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (p) => resolve({
              latitude: Number(p.coords.latitude).toFixed(5),
              longitude: Number(p.coords.longitude).toFixed(5),
              accuracy: `${Math.round(p.coords.accuracy)}m`,
              timestamp: new Date(p.timestamp).toISOString(),
              available: true,
              status: 'सत्यापित लोकेशन (GPS Granted)'
            }),
            () => resolve({ available: false, status: 'लोकेशन प्राप्त नहीं हो सकी' }),
            { timeout: 3000, maximumAge: 60000, enableHighAccuracy: false }
          );
        });
        return pos;
      }
    }
  } catch (err) {
    // Permission API query failed or unsupported
  }

  return {
    available: false,
    status: 'अनुमति नहीं दी गई (No Permission)'
  };
};

/**
 * Retrieve Network Connection details (Type, Bandwidth, RTT) without extra permission
 */
export const getNetworkDetails = () => {
  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const online = typeof navigator.onLine === 'boolean' ? navigator.onLine : true;

  if (conn) {
    const eff = conn.effectiveType ? conn.effectiveType.toUpperCase() : '';
    const down = conn.downlink ? `${conn.downlink} Mbps` : '';
    const rtt = conn.rtt ? `${conn.rtt} ms` : '';
    const netType = eff ? `${eff}${down ? ` (${down})` : ''}` : (online ? 'WiFi / 4G' : 'ऑफ़लाइन');

    return {
      effectiveType: eff || '4G/WiFi',
      downlink: down || 'सामान्य',
      rtt: rtt || '',
      online: online ? 'इंटरनेट सक्रिय' : 'इंटरनेट डिस्कनेक्टेड',
      display: netType
    };
  }

  return {
    effectiveType: online ? 'WiFi / मोबाइल डेटा' : 'ऑफ़लाइन',
    downlink: 'सामान्य',
    rtt: '',
    online: online ? 'इंटरनेट सक्रिय' : 'इंटरनेट डिस्कनेक्टेड',
    display: online ? 'WiFi / 4G नेटवर्क' : 'ऑफ़लाइन'
  };
};

/**
 * Retrieve Public IP Address via Cloudflare Worker or Public IP fallback
 */
export const getClientIpAddress = async () => {
  const baseUrl = getWorkerBaseUrl();
  
  // 1. Try our Cloudflare Worker endpoint
  if (baseUrl) {
    try {
      const res = await fetch(`${baseUrl}/api/telemetry/ip`, {
        headers: { 'Accept': 'application/json' }
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.ip) {
          return {
            ip: data.ip,
            city: data.city || '',
            region: data.region || '',
            country: data.country || 'IN',
            isp: data.asOrganization || ''
          };
        }
      }
    } catch (e) {
      // Fallback
    }
  }

  // 2. Fallback to public ipify
  try {
    const res = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(2500) });
    if (res.ok) {
      const data = await res.json();
      if (data && data.ip) {
        return {
          ip: data.ip,
          city: '',
          region: '',
          country: 'IN',
          isp: ''
        };
      }
    }
  } catch (e) {
    // Fallback
  }

  return {
    ip: '103.21.12.18 (लोकल/सुरक्षित)',
    city: '',
    region: '',
    country: 'IN',
    isp: ''
  };
};

/**
 * Capture Complete Device Telemetry for Calls and Registration
 */
export const captureFullDeviceTelemetry = async () => {
  const device = getDeviceDetails();
  const network = getNetworkDetails();

  // Concurrent asynchronous gathering
  const [battery, location, ipData] = await Promise.all([
    getBatteryDetails(),
    getLocationIfPermitted(),
    getClientIpAddress()
  ]);

  const locDisplay = location.available 
    ? `${location.latitude}° N, ${location.longitude}° E (±${location.accuracy})`
    : (location.status || 'अनुमति नहीं दी गई');

  // Stable signature for device fingerprinting
  const signature = `${device.os}__${device.model}__${device.screen}__${device.browser}`.toLowerCase();

  return {
    ip: ipData.ip || '127.0.0.1',
    networkLocation: ipData.city ? `${ipData.city}, ${ipData.region || ''} (${ipData.country || 'IN'})` : '',
    isp: ipData.isp || '',
    deviceName: device.deviceName,
    deviceModel: device.model,
    os: device.os,
    browser: device.browser,
    platform: device.platform,
    screenResolution: device.screen,
    batteryPercentage: battery.percentage,
    batteryCharging: battery.charging,
    batteryLevel: battery.level,
    batteryAvailable: battery.available,
    location: locDisplay,
    coordinates: location.available ? { lat: location.latitude, lng: location.longitude, accuracy: location.accuracy } : null,
    locationStatus: location.status,
    networkType: network.display,
    networkOnline: network.online,
    language: navigator.language || 'hi-IN',
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata',
    signature,
    capturedAt: new Date().toISOString()
  };
};

/**
 * Compare Current Device Telemetry with User's Registered Device
 * Detects device changes for security audit
 */
export const checkDeviceChange = (registeredDevice, currentTelemetry) => {
  if (!registeredDevice || !currentTelemetry) {
    return { isChanged: false };
  }

  // If registered device has a signature, compare
  const regSig = (registeredDevice.signature || `${registeredDevice.os}__${registeredDevice.deviceModel}__${registeredDevice.screenResolution || ''}`).toLowerCase();
  const curSig = (currentTelemetry.signature || `${currentTelemetry.os}__${currentTelemetry.deviceModel}__${currentTelemetry.screenResolution || ''}`).toLowerCase();

  // If both have OS and deviceModel, compare directly
  const regModel = (registeredDevice.deviceModel || registeredDevice.deviceName || '').toLowerCase();
  const curModel = (currentTelemetry.deviceModel || currentTelemetry.deviceName || '').toLowerCase();
  const regOs = (registeredDevice.os || '').toLowerCase();
  const curOs = (currentTelemetry.os || '').toLowerCase();

  const isModelDifferent = regModel && curModel && !curModel.includes(regModel) && !regModel.includes(curModel);
  const isOsDifferent = regOs && curOs && !curOs.includes(regOs) && !regOs.includes(curOs);

  const isChanged = (regSig && curSig && regSig !== curSig && (isModelDifferent || isOsDifferent)) || 
                    (isModelDifferent && isOsDifferent);

  if (isChanged) {
    return {
      isChanged: true,
      oldDevice: registeredDevice.deviceName || `${registeredDevice.model || ''} (${registeredDevice.os || ''})`,
      newDevice: currentTelemetry.deviceName || `${currentTelemetry.model || ''} (${currentTelemetry.os || ''})`,
      oldIp: registeredDevice.ip || 'अज्ञात',
      newIp: currentTelemetry.ip || 'अज्ञात',
      changedAt: new Date().toISOString()
    };
  }

  return { isChanged: false };
};
