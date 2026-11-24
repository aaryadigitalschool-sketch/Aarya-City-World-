using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Unity.Netcode;
using Unity.Services.Authentication;
using Unity.Services.Core;
using Unity.Services.Multiplayer;
using UnityEngine;

namespace AaryaCity.Online
{
    /// <summary>
    /// Online Co-op session manager backed by Unity Gaming Services (Authentication,
    /// Multiplayer Services SDK, Relay, and Netcode for GameObjects).
    /// Server-authoritative RPCs validate all mission rewards and progression.
    /// </summary>
    public class AaryaMultiplayerManager : NetworkBehaviour
    {
        public static AaryaMultiplayerManager Instance { get; private set; }

        [SerializeField] private int maxCoOpPlayers = 4;

        private ISession activeSession;
        private readonly Dictionary<ulong, HashSet<string>> serverClaimedMissions = new();
        private static readonly Dictionary<string, (int money, int xp)> ValidMissionRewards = new()
        {
            { "m1_kathmandu_arrival", (1500, 150) },
            { "m2_pokhara_courier", (3200, 300) },
            { "m3_terai_intercept", (5000, 450) },
            { "m4_monsoon_escape", (6500, 600) },
            { "m5_himalayan_rescue", (9500, 900) }
        };

        public string ActiveJoinCode => activeSession?.Code ?? string.Empty;
        public event Action<string> OnConnectionError;

        private void Awake()
        {
            if (Instance != null && Instance != this) { Destroy(gameObject); return; }
            Instance = this;
        }

        public async Task<bool> InitializeServicesAsync()
        {
            if (Application.internetReachability == NetworkReachability.NotReachable)
            {
                OnConnectionError?.Invoke("No internet connection. Use Offline Single Player mode.");
                return false;
            }
            try
            {
                if (UnityServices.State != ServicesInitializationState.Initialized)
                {
                    await UnityServices.InitializeAsync();
                }
                if (!AuthenticationService.Instance.IsSignedIn)
                {
                    await AuthenticationService.Instance.SignInAnonymouslyAsync();
                }
                return true;
            }
            catch (Exception ex)
            {
                OnConnectionError?.Invoke($"Authentication failed: {ex.Message}");
                return false;
            }
        }

        public async Task<string> CreateCoOpRoomAsync(string roomName)
        {
            if (!await InitializeServicesAsync()) return null;
            try
            {
                var options = new SessionOptions
                {
                    Name = string.IsNullOrWhiteSpace(roomName) ? "Aarya Valley Co-op" : roomName,
                    MaxPlayers = maxCoOpPlayers
                }.WithRelayNetwork();

                activeSession = await MultiplayerService.Instance.CreateSessionAsync(options);
                return activeSession.Code;
            }
            catch (Exception ex)
            {
                OnConnectionError?.Invoke($"Failed to create room: {ex.Message}");
                return null;
            }
        }

        public async Task<bool> JoinByCodeAsync(string joinCode)
        {
            if (!await InitializeServicesAsync()) return false;
            try
            {
                activeSession = await MultiplayerService.Instance.JoinSessionByCodeAsync(joinCode.Trim().ToUpperInvariant());
                return true;
            }
            catch (Exception ex)
            {
                OnConnectionError?.Invoke($"Unable to join code {joinCode}: {ex.Message}");
                return false;
            }
        }

        [Rpc(SendTo.Server, InvokePermission = RpcInvokePermission.Everyone)]
        public void RequestMissionRewardServerRpc(string missionId, RpcParams rpcParams = default)
        {
            ulong sender = rpcParams.Receive.SenderClientId;
            if (!ValidMissionRewards.TryGetValue(missionId, out var reward)) return;

            if (!serverClaimedMissions.TryGetValue(sender, out var claimed))
            {
                claimed = new HashSet<string>();
                serverClaimedMissions[sender] = claimed;
            }
            if (!claimed.Add(missionId)) return; // Prevent duplicate claims

            GrantValidatedRewardClientRpc(missionId, reward.money, reward.xp, RpcTarget.Single(sender, RpcTargetUse.Temp));
        }

        [Rpc(SendTo.SpecifiedInParams)]
        private void GrantValidatedRewardClientRpc(string missionId, int money, int xp, RpcParams rpcParams = default)
        {
            Debug.Log($"[AARYA CITY] Server validated {missionId}: +NPR {money}, +{xp} XP");
        }
    }
}
