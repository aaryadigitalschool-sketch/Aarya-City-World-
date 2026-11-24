# AARYA CITY — Online Co-op Multiplayer Setup (Unity Gaming Services)

AARYA CITY keeps Offline Single Player and Online Co-op strictly separated:
- **Offline Single Player**: Runs immediately with zero network calls via `LocalSaveManager` and `PlayerEconomyManager`.
- **Online Co-op**: Uses **Unity Authentication**, **Unity Multiplayer Services SDK (Sessions + Relay)**, and **Netcode for GameObjects (`UnityTransport`)** in `Assets/AaryaCity/Scripts/Online/AaryaMultiplayerManager.cs`.

## Unity Dashboard Setup Steps
1. Sign in to [Unity Cloud Dashboard](https://cloud.unity.com/) and create or link your project **AARYA CITY**.
2. In Unity Editor: **Edit -> Project Settings -> Services** -> Link Project ID.
3. Enable **Authentication**:
   - Turn on **Anonymous Sign-In** (required for zero-friction mobile quick-join).
   - Optionally enable Unity Player Accounts or Google Play Games sign-in.
4. Enable **Multiplayer Services (Lobby + Relay)**:
   - Configure max co-op session size (`2–8` players, default `4`).
   - Relay automatically handles NAT traversal for mobile carrier networks without exposing host IP addresses.
5. **Server-Authoritative Validation**:
   - `AaryaMultiplayerManager.RequestMissionRewardServerRpc` validates mission IDs and enforces one-time reward claims per session on the server before calling `GrantValidatedRewardClientRpc`.
   - Never commit UGS secret keys or admin tokens into `Assets/`.
