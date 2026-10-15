# Routiq — Mobile App & PWA Guide

Routiq is designed as a **mobile-first cab navigation application for Indian truck drivers and fleet operators**. It supports two deployment formats for mobile devices:

1. **Progressive Web App (PWA)** — Instant install via Chrome / Edge / Safari without app store friction, complete with offline tile caching and persistent GPS tracking.
2. **Native Android APK (Capacitor)** — Bundled native Android application with background GPS tracking, wake lock, and signed release APK generation.

---

## 1. Progressive Web App (PWA)

### Features
- **App Shell Pre-caching:** Pre-caches HTML, CSS, fonts, and icons for instant offline booting.
- **Offline Map Tile Caching:** Service worker (`public/sw.js`) automatically intercepts MapLibre raster tile requests (`tile.openstreetmap.org`, `arcgisonline.com`, `cartocdn.com`) and stores them in a local cache (`routiq-map-tiles-v1`).
- **Resilient Fallback:** When offline, the app uses pre-seeded freight corridors (Mumbai-Pune, Mumbai-Nashik, Pune-Nashik, Delhi-Jaipur) and local amenity databases.
- **Install Prompt:** Built-in install banner triggers the native Android/iOS installation prompt to add Routiq to the device home screen.

### How to Install PWA on Android Phone
1. Open https://routiqclearroute.vercel.app/ (or your local IP `http://<LAN-IP>:3000`) in **Google Chrome**.
2. Tap the **Install Routiq Truck App** banner at the top, or tap the three dots menu (`⋮`) in Chrome and select **"Add to Home screen"** / **"Install App"**.
3. Routiq will install as a standalone full-screen application with its own launcher icon, dark status bar, and no browser URL bar.

---

## 2. Building Native Android APK with Capacitor

### Prerequisites
- **Node.js:** v18+ (verified on v24)
- **Android Studio:** Ladybug or newer
- **Android SDK:** API Level 33+ (Android 13+)
- **Java:** JDK 17+

### Step-by-Step Build Instructions

#### Step 1: Build the Web Application
```bash
npm run build
```
This generates the optimized production build in the `dist/` folder.

#### Step 2: Initialize Android Platform (One-Time)
```bash
npx cap add android
```
This generates the native Android project directory structure inside `android/`.

#### Step 3: Synchronize Assets & Plugins
Whenever web code or configuration changes:
```bash
npx cap sync android
```

#### Step 4: Verify Android Permissions in AndroidManifest.xml
Inspect `android/app/src/main/AndroidManifest.xml` to verify required truck navigation permissions are present:

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <!-- Internet & Network State for Real-Time Routing -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

    <!-- High-Precision GPS Navigation for Truck Cab -->
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
    <uses-feature android:name="android.hardware.location.gps" />

    <!-- Screen Wake Lock: Keep Navigation Visible on Dashboard -->
    <uses-permission android:name="android.permission.WAKE_LOCK" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="Routiq"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/AppTheme"
        android:usesCleartextTraffic="true">
        ...
    </application>
</manifest>
```

#### Step 5: Open Project in Android Studio
```bash
npx cap open android
```

#### Step 6: Generate APK
1. In Android Studio, select **Build > Build Bundle(s) / APK(s) > Build APK(s)** for a debug build.
2. The debug APK will be located at:
   `android/app/build/outputs/apk/debug/app-debug.apk`
3. To generate a release APK for distribution:
   Select **Build > Generate Signed Bundle / APK**, configure your keystore, and build the release APK.

---

## 3. Real-World Driver Experience Features
- **High-Contrast Route Polyline:** 10px solid white casing with 6px Royal Blue fill, engineered for visibility under harsh Indian sunlight.
- **Voice Turn Guidance:** Web Speech API announces turn maneuvers and upcoming hazards in both Hindi and English.
- **Screen Wake Lock:** Prevents phone screens from locking or dimming during active trips.
- **Proximity Alerts:** Warns drivers 5km, 1km, and 500m ahead of low-clearance bridges and restrictions.
- **Truck Amenity Discovery:** Interactive markers for ⛽ Diesel Pumps, 🅿️ Truck Parking, 🔧 Workshops, ⚖️ Dharam Kanta (Weighbridges), and 🍲 Dhabas.
