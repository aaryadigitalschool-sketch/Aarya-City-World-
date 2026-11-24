# AARYA CITY — 3D Character Art & Rigging Pipeline (Blender → Unity 6 LTS)

## 1. Humanoid FBX Standards
- **Coordinate System**: Blender export FBX with `-Z Forward`, `Y Up`, `Apply Transform` enabled, `Scale: 1.0`.
- **Skeleton**: Unity **Humanoid Avatar** compatible bone naming:
  - `Hips` → `Spine` → `Chest` → `UpperChest` → `Neck` → `Head` (with `Jaw`, `LeftEye`, `RightEye` facial bones)
  - `LeftShoulder/LeftUpperArm/LeftLowerArm/LeftHand` + 5 articulated fingers (`Thumb`, `Index`, `Middle`, `Ring`, `Pinky` 3 phalanges each)
  - `LeftUpperLeg/LeftLowerLeg/LeftFoot/LeftToes` (mirrored `Right*`)
- **Skin Weights**: Max 4 bone influences per vertex (`Skin Weights: Standard (4 Bones)` in Quality Settings for ARM64 mobile).

## 2. Mobile LOD Budgets (ARM64 URP)
| LOD Tier | Distance Range | Triangle Count | Facial / Finger Detail |
|----------|----------------|----------------|------------------------|
| **LOD0** | 0m – 24m       | 14,000 – 18,000 tris | Full facial blendshapes, eyelids, 5-finger hands |
| **LOD1** | 24m – 58m      | 5,500 – 7,500 tris   | Simplified head topology, mitten/merged fingers |
| **LOD2** | 58m – 140m     | 1,800 – 2,500 tris   | Silhouette proxy + culled Animator transforms |

## 3. PBR Material & Texture Calibration
- **URP Lit Shader** (`Universal Render Pipeline/Lit`), `Workflow: Metallic`:
  - **Skin**: Albedo (`1024x1024 sRGB`), Normal Map (`OpenGL/Tangent`), Smoothness `0.38–0.46`, Subsurface-inspired warm rim tint.
  - **Clothing (Nepali Daura Suruwal, Dhaka Topi, Urban Parka, Police/Security Uniforms)**:
    - Woven cotton / Dhaka diamond weave Albedo (`2048x2048` hero / `512x512` crowd), Normal, Ambient Occlusion, Metallic `0.02–0.12`, Smoothness `0.15–0.32`.
  - **Leather Footwear & Accessories**: Smoothness `0.48–0.65`, Metallic `0.10–0.20`.

## 4. Character Role Catalog
- **Players (Male / Female)**: Full customization (`CharacterCustomizationData` + `CharacterAppearanceController`).
- **Police & Security**: Metro Police Interceptor officers, Skyport security personnel, tactical badges & caps.
- **Shopkeepers & Story Cast**: Maya Thapa, Bikram Shrestha, Dr. Sita Gurung, Tenzing Sherpa, Durbar & Terai merchants.
- **Vehicle Drivers & Passengers**: Seated inside `DriverMount` / `PassengerMount` sockets across sedans, buses, motorcycles, helicopters, and Phewa boats.
