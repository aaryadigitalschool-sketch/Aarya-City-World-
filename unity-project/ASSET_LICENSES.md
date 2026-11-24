# AARYA CITY — Asset License & Specification Ledger

All assets, architectures, characters, vehicles, textures, audio synthesizers, and story text in AARYA CITY are **100% original** to this project. No copyrighted third-party models, textures, or audio files are included.

## Procedural & Prototype Asset Specifications (Unity Project)
| Domain | Asset Requirement | Current Status |
|---|---|---|
| Characters | Rigged Male & Female humanoid meshes with URP PBR skin/fabric shaders | Procedural prototype rig in WebGL runtime; FBX humanoid slot ready for Blender/Mixamo-free custom rig in `Assets/AaryaCity/Art/Characters/` |
| Vehicles | 13 vehicle classes (Sports, Supercar, Sedan, SUV, Pickup, Moto, Scooter, Bus, Truck, Jeep, Helicopter, Boat, Police) | Multi-part PBR procedural assemblies in WebGL; WheelCollider physics script in `ArcadeMobileVehicleController.cs` |
| Architecture | Newari terracotta pagoda, Durbar plaza, Kathmandu towers, Pokhara lakeside, Himalayan base camp | Procedural CanvasTexture PBR + multi-tier geometry in WebGL; modular prefabs spec ready in `Assets/AaryaCity/Prefabs/` |
| Audio | Engine RPM synth, two-tone siren, horn, footsteps, rain/thunder, Himalayan pentatonic ambient | Procedural Web Audio API synthesis (zero external `.mp3`/`.wav` dependencies) |
