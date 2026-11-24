# AARYA CITY — Android APK & AAB Build Instructions

## Verified Android Build Configuration
- **Package Identifier**: `com.aaryadigitalworld.aaryacity`
- **Target Platform**: Android
- **Architecture**: ARM64 (`IL2CPP`)
- **Orientation**: Landscape (`sensorLandscape`)
- **Render Pipeline**: Universal Render Pipeline (`URP 17.0.3`)
- **Minimum SDK**: Android 8.0 (API 26)
- **Target SDK**: Android 15 (API 35)
- **Included Scenes**:
  1. `Assets/AaryaCity/Scenes/Boot/Boot.unity`
  2. `Assets/AaryaCity/Scenes/MainMenu/MainMenu.unity`
  3. `Assets/AaryaCity/Scenes/Kathmandu/Kathmandu.unity`
  4. `Assets/AaryaCity/Scenes/Pokhara/Pokhara.unity`
  5. `Assets/AaryaCity/Scenes/Terai/Terai.unity`
  6. `Assets/AaryaCity/Scenes/Himalaya/Himalaya.unity`

## Option A: Command-Line Build (Linux / macOS)
```bash
export UNITY_EDITOR_PATH="/path/to/Unity/6000.0.28f1/Editor/Unity"
chmod +x build-android.sh

# 1. Debug APK (Development Build)
./build-android.sh debug
# Output: Builds/Android/AARYA_CITY_DEBUG.apk

# 2. Signed Release APK
export ANDROID_KEYSTORE_PATH="/secure/aarya-release.keystore"
export ANDROID_KEYSTORE_PASS="your-keystore-password"
export ANDROID_KEYALIAS_NAME="aarya_release"
export ANDROID_KEYALIAS_PASS="your-key-password"
./build-android.sh release
# Output: Builds/Android/AARYA_CITY_RELEASE.apk

# 3. Signed Google Play AAB
./build-android.sh aab
# Output: Builds/Android/AARYA_CITY_RELEASE.aab
```

## Option B: Windows PowerShell Build
```powershell
$env:UNITY_EDITOR_PATH = "C:\Program Files\Unity\Hub\Editor\6000.0.28f1\Editor\Unity.exe"
.\build-android.ps1 -Mode debug
```

## Option C: Automated GitHub Actions Workflow
Use `.github/workflows/android-build.yml` with repository secrets:
- `UNITY_LICENSE`, `UNITY_EMAIL`, `UNITY_PASSWORD`
- `ANDROID_KEYSTORE_NAME`, `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASS`, `ANDROID_KEYALIAS_NAME`, `ANDROID_KEYALIAS_PASS`
