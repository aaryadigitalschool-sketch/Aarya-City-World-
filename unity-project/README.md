# AARYA CITY — Unity 6 LTS Android Source Project

## Environment Note
This directory contains the editable **Unity 6 LTS (6000.0.28f1) + URP + C# + Android ARM64** source architecture, pinned packages (`Packages/manifest.json`), Android player configuration (`ProjectSettings/ProjectSettings.asset`), modular C# gameplay/multiplayer scripts, NUnit tests, and automated CI/CD build workflows (`build-android.sh`, `build-android.ps1`, `.github/workflows/android-build.yml`).

> **Live Playable Build in This Runtime**: Because Unity Editor and the Android SDK/NDK are not installed in this web container, the full playable 3D open-world AARYA CITY game runs live in the browser via Three.js/WebGL alongside an Express + WebSocket multiplayer backend. To compile native `AARYA_CITY_DEBUG.apk`, `AARYA_CITY_RELEASE.apk`, and `AARYA_CITY_RELEASE.aab` binaries, open `unity-project/` in Unity 6 LTS with Android Build Support or run the GitHub Actions workflow.

## Unity Gaming Services (Multiplayer) Dashboard Setup
1. Open Unity Dashboard -> **Projects** -> Link `unity-project`.
2. Enable **Authentication** (Anonymous / Player Accounts).
3. Enable **Multiplayer Services (Lobby & Relay)**.
4. Configure **Netcode for GameObjects** `UnityTransport` on your NetworkManager prefab.
5. Never commit signing keystores, passwords, or private service keys to source control.

## Building Android APK & AAB Locally
```bash
export UNITY_EDITOR_PATH="/path/to/Unity/6000.0.28f1/Editor/Unity"
./build-android.sh debug     # Generates Builds/Android/AARYA_CITY_DEBUG.apk

export ANDROID_KEYSTORE_PATH="/secure/aarya.keystore"
export ANDROID_KEYSTORE_PASS="***"
export ANDROID_KEYALIAS_NAME="aarya_release"
export ANDROID_KEYALIAS_PASS="***"
./build-android.sh aab       # Generates Builds/Android/AARYA_CITY_RELEASE.aab
```
