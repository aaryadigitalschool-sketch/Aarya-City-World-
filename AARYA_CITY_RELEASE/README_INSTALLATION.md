# AARYA CITY — Installation Guide

## 1. Opening the Complete Unity Source Project
1. Download `AARYA_CITY_COMPLETE_SOURCE.zip`.
2. Extract it into a clean folder (e.g. `~/Projects/AARYA_CITY/`).
3. Open **Unity Hub** and install **Unity 6000.0.28f1 (Unity 6 LTS)** with **Android Build Support** (Android SDK, NDK, and OpenJDK).
4. Click **Add -> Add project from disk** and select the extracted root folder containing `Assets/`, `Packages/`, and `ProjectSettings/`.
5. On first open, Unity will resolve pinned UPM packages (`URP 17.0.3`, `Input System 1.11.2`, `Netcode for GameObjects 2.1.1`, `Multiplayer Services 1.0.2`, `Authentication 3.3.3`) and compile assemblies (`AaryaCity.Runtime`, `AaryaCity.Editor`, `AaryaCity.Tests`).

## 2. Installing Android APK on Device (Once Built Locally or via CI)
> **Note**: Pre-compiled `.apk` / `.aab` binaries are **not** included in this release archive because Unity Editor and the Android SDK are unavailable inside the browser cloud build environment. Follow `BUILD_INSTRUCTIONS.md` to compile `AARYA_CITY_DEBUG.apk` or `AARYA_CITY_RELEASE.apk`.

Once `AARYA_CITY_DEBUG.apk` is built on your machine or GitHub Actions:
1. Enable **Developer Options -> USB Debugging** on your ARM64 Android phone (Android 8.0 / API 26 or newer).
2. Connect via USB and install using ADB:
   ```bash
   adb install -r Builds/Android/AARYA_CITY_DEBUG.apk
   ```
3. Or copy `AARYA_CITY_DEBUG.apk` to your phone's `Downloads` folder and open it in the Android file manager (allow "Install unknown apps").
4. **Offline Mode**: Launch AARYA CITY without Wi-Fi or mobile data—single-player story, vehicles, police AI, weather, and local saves work 100% offline.
