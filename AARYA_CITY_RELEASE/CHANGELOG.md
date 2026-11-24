# AARYA CITY — Release Changelog

## v1.1.0 — Full 3D Character Artist & Modeling Upgrade
- **Articulated 3D Character Architecture**:
  - Replaced placeholder rigs with full humanoid skeletons (`hips`, `chest`, `head` + facial jaw/cranium/nose/eyes/ears/eyelids, articulated forearms & 5-finger hands, lower legs, and sculpted footwear).
  - Added cultural & urban clothing styles (*Nepali Daura*, *Urban Parka*, *Kathmandu Street*, *Trekking Vest*, *Formal Blazer*), 5 sculpted 3D hairstyles, procedural Dhaka Topi pattern & woven cloth PBR textures, and accessories.
  - Implemented smooth animation blending across `idle`, `walk`, `run`, `sprint`, `jump`, `fall`, `crouch`, `swim`, `climb`, `drive`, `combat`, `interact`, `talk`, and `sit`.
- **Expanded World Roles & Vehicle Occupants**:
  - Added named 3D story characters (*Maya Thapa*, *Bikram Shrestha*, *Dr. Sita Gurung*, *Tenzing Sherpa*), shopkeepers, security personnel, police officers, seated plaza NPCs, and seated 3D drivers & passengers inside AI traffic/police vehicles and player vehicles.
  - Added distance-based LOD0/LOD1 switching and animation throttling for NPCs, plus live 3D Character Studio turntable customization and synchronized multiplayer 3D avatars.
- **Unity 6 LTS C# & Prefab Pipeline**:
  - Added `CharacterCustomizationData.cs`, `CharacterAppearanceController.cs`, `CharacterAnimationDriver.cs`, `NpcPoolAndLodManager.cs`, `NetworkedCharacterSync.cs`, `CHARACTER_PIPELINE.md`, 5 role prefabs, and expanded EditMode unit tests.

## v1.0.0 — Complete Source Export & Release Package
- **Android Packaging Fixes**:
  - Updated `ProjectSettings/ProjectSettings.asset` and `AndroidBuildPipeline.cs` package identifier to `com.aaryadigitalworld.aaryacity` (ARM64, IL2CPP, Landscape, API 26–35).
  - Added `Assets/Plugins/Android/AndroidManifest.xml` with `INTERNET` & `ACCESS_NETWORK_STATE` permissions and `sensorLandscape` activity config.
  - Added `ProjectSettings/EditorBuildSettings.asset` and `ProjectSettings/GraphicsSettings.asset` linked to `AaryaCity_URP_High.asset`.
- **Completed Unity Project Structure**:
  - Added `.asmdef` assembly separation (`AaryaCity.Runtime`, `AaryaCity.Editor`, `AaryaCity.Tests`) so `UnityEditor` build scripts never break Android player compilation.
  - Added all 6 build scenes (`Boot`, `MainMenu`, `Kathmandu`, `Pokhara`, `Terai`, `Himalaya`), `AaryaCityControls.inputactions`, URP material, `PlayerCharacter.prefab`, and `VehicleCatalogSO`.
  - Added `BootstrapLoader.cs`, `MissionManager.cs`, `DynamicWeatherController.cs`, `CityTrafficAndPedestrianAI.cs`, and `PlayerEconomyManager.cs`.
- **Source Export**:
  - Packaged clean editable Unity project into `AARYA_CITY_COMPLETE_SOURCE.zip` (excluding `Library/`, `Temp/`, `Logs/`, `obj/`, and `Builds/`).
- **Build Environment Note**:
  - Native APK/AAB compilation requires Unity 6 LTS + Android SDK/NDK, which are not installed in the cloud web runtime; reproducible build scripts (`build-android.sh`, `build-android.ps1`, GitHub Actions) are included.
