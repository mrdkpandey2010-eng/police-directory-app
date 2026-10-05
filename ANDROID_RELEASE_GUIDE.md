# उत्तर प्रदेश पुलिस डायरेक्टरी - Android App Release Guide (Play Store .aab)

यह दस्तावेज़ उत्तर प्रदेश पुलिस टेलीफोन डायरेक्टरी प्रोजेक्ट को **Google Play Store** पर आधिकारिक रूप से अपलोड करने हेतु प्रोडक्शन रेडी **.aab (Android App Bundle)** तैयार करने की संपूर्ण प्रक्रिया का विवरण देता है।

---

## 📌 प्रोजेक्ट की मुख्य विशिष्टताएं (Capacitor Android Engine)

| पैरामीटर | मान / विवरण |
| :--- | :--- |
| **Package ID / App ID** | `in.gov.uppolice.directory` |
| **Application Name** | `UP Police Directory` (उत्तर प्रदेश पुलिस डायरेक्टरी) |
| **Target SDK** | `36` (Google Play Store की न्यूनतम आवश्यकता 34+ से भी अत्याधुनिक) |
| **Minimum SDK** | `24` (Android 7.0 Nougat एवं उससे ऊपर کے 98%+ डिवाइस समर्थित) |
| **Version Code** | `1` |
| **Version Name** | `1.0.0` |
| **Hardware Back Button** | मोडल/ड्रॉवर स्टैक सपोर्ट + सुरक्षित डबल-टैप टू एग्जिट |
| **Security Traffic** | `usesCleartextTraffic="false"` (100% एन्क्रिप्टेड HTTPS संचार) |

---

## 🚀 क्विक कमांड्स (NPM Scripts)

प्रोजेक्ट की `package.json` में निम्नलिखित शॉर्टकट कमांड्स कॉन्फ़िगर किए गए हैं:

```bash
# 1. वेब कोड को बिल्ड करके Android में सिंक करना
npm run cap:sync

# 2. प्रोजेक्ट को सीधे Android Studio में खोलना
npm run cap:open

# 3. प्रोडक्शन रेडी .aab (Play Store बंडल) बनाना
npm run android:build

# 4. टेस्टिंग हेतु सीधे .apk फाइल बनाना
npm run android:apk
```

---

## 🛠️ चरणबद्ध रिलीज़ प्रक्रिया (Step-by-Step Guide)

### चरण 1: डिजिटल साइनिंग की (Keystore) बनाना

Google Play Store पर ऐप अपलोड करने के लिए एक डिजिटल क्रिप्टोग्राफ़िक साइनिंग की की आवश्यकता होती है।

हमने आपके लिए स्वचालित स्क्रिप्ट तैयार की है:
```powershell
powershell -ExecutionPolicy Bypass -File scripts\generate_release_key.ps1
```
यह स्क्रिप्ट `android/release-key.jks` और `android/keystore.properties` अपने आप बना देगी।

> **महत्वपूर्ण चेतावनी:** `release-key.jks` फ़ाइल और उसके पासवर्ड को किसी सुरक्षित पेनड्राइव/क्लाउड बैकअप में सहेज कर रखें। यदि यह खो गई, तो भविष्य में Google Play Store पर ऐप को अपडेट नहीं किया जा सकेगा।

---

### चरण 2: प्रोडक्शन .aab फ़ाइल बिल्ड करना

#### विकल्प A: स्वचालित स्क्रिप्ट द्वारा (CLI)
```powershell
powershell -ExecutionPolicy Bypass -File scripts\build_android.ps1 -Target bundle
```
- तैयार फ़ाइल का स्थान:  
  `android/app/build/outputs/bundle/release/app-release.aab`

#### विकल्प B: Android Studio GUI द्वारा
1. टर्मिनल में रन करें: `npm run cap:open`
2. Android Studio खुलने पर मेनू बार में जाएँ:
   `Build` -> `Generate Signed Bundle / APK...`
3. **Android App Bundle** चुनें और Next दबाएं।
4. अपनी Keystore फ़ाइल (`release-key.jks`) चुनें और पासवर्ड दर्ज करें।
5. Destination folder चुनकर **release** वेरिएंट पर क्लिक करके **Create** दबाएं।

---

### चरण 3: अपने मोबाइल पर टेस्टिंग (Debug APK)

Play Store पर अपलोड करने से पहले यदि आप अपने या सहकर्मियों के मोबाइल में चलाकर देखना चाहते हैं:
```powershell
powershell -ExecutionPolicy Bypass -File scripts\build_android.ps1 -Target apk
```
- तैयार फ़ाइल का स्थान:  
  `android/app/build/outputs/apk/debug/app-debug.apk`
- इस `.apk` को आप USB या WhatsApp द्वारा मोबाइल में भेजकर सीधे इंस्टॉल कर सकते हैं।

---

## 🔒 AndroidManifest.xml में शामिल अनुमतियां

| अनुमति | उपयोग / उद्देश्य |
| :--- | :--- |
| `INTERNET` & `ACCESS_NETWORK_STATE` | सर्वर, डायरेक्टरी डेटा व फ़ायरबेस रियल-टाइम सिंक |
| `CALL_PHONE` | डायरेक्टरी से सीधे कॉल लगाने की सुविधा |
| `RECORD_AUDIO` & `MODIFY_AUDIO_SETTINGS` | इन-ऐप सुरक्षित वॉयस कॉलिंग (WebRTC) व वॉयस सर्च |
| `CAMERA` | कार्मिक पहचान पत्र व वर्दी की तस्वीर कैप्चर करने हेतु |
| `READ_MEDIA_IMAGES` / `READ_EXTERNAL_STORAGE` | प्रोफ़ाइल फोटो व विभागीय दस्तावेज़ अपलोड |
| `<queries>` (Package Visibility) | Android 11+ पर फ़ोन डायलर (`tel:`), व्हाट्सएप व वेब ब्राउज़र लिंक खोलने हेतु |

---

## 🎨 एसेट्स (Icons & Splash Screen)

- **Adaptive App Icons:** आधिकारिक यूपी पुलिस रेड-नेवी शील्ड, स्वर्ण स्टार व उत्तर प्रदेश पुलिस ब्रांडिंग के साथ `mdpi`, `hdpi`, `xhdpi`, `xxhdpi`, `xxxhdpi` प्रारूप में तैयार।
- **Splash Screen:** डार्क थीम (`#070E1C`), पुलिस लोगो और आधिकारिक शीर्षक के साथ सभी पोर्ट्रेट स्क्रीन साइज़ में तैयार।
- **Safe Area Insets:** नौच (Notch), पंच-होल कैमरा और बॉटम जेस्चर बार के लिए `env(safe-area-inset-*)` अनुकूलित।

---

## 📤 Google Play Console पर अपलोड करने के चरण

1. [Google Play Console](https://play.google.com/console) में लॉगिन करें।
2. **Create App** पर क्लिक करें:
   - App Name: `UP Police Directory`
   - Default Language: `Hindi - hi` या `English (India) - en-IN`
   - Free / Paid: `Free`
3. **App Integrity / Play App Signing:** Google Play App Signing को डिफ़ॉल्ट रूप से स्वीकार करें।
4. **Production / Internal Testing:**
   - `Create new release` पर क्लिक करें।
   - तैयार की गई `app-release.aab` फ़ाइल को ड्रैग-एंड-ड्रॉप करें।
   - Release Notes (संस्करण 1.0.0) दर्ज करें।
5. **App Content & Privacy Policy:**
   - Privacy Policy URL दर्ज करें (जो ऐप के टॉगल मेनू में पहले से उपलब्ध है)।
   - Government App Declaration: पुलिस विभाग के अधिकृत पत्र या डोमेन ईमेल द्वारा शासकीय सत्यापन पूर्ण करें।
6. **Review and roll out:** समीक्षा हेतु भेजें (Review submission)।
