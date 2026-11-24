using Unity.Collections;
using Unity.Netcode;
using UnityEngine;
using AaryaCity.Player;

namespace AaryaCity.Online
{
    /// <summary>
    /// Synchronizes remote 3D player avatars across the network:
    /// movement speed, animation state, vehicle seating, and server-validated appearance.
    /// </summary>
    public class NetworkedCharacterSync : NetworkBehaviour
    {
        [SerializeField] private CharacterAppearanceController appearanceController;
        [SerializeField] private CharacterAnimationDriver animationDriver;

        public readonly NetworkVariable<float> NetSpeed = new(0f, NetworkVariableReadPermission.Everyone, NetworkVariableWritePermission.Owner);
        public readonly NetworkVariable<byte> NetAnimState = new(0, NetworkVariableReadPermission.Everyone, NetworkVariableWritePermission.Owner);
        public readonly NetworkVariable<bool> NetIsFemale = new(false, NetworkVariableReadPermission.Everyone, NetworkVariableWritePermission.Server);
        public readonly NetworkVariable<byte> NetHairStyle = new(0, NetworkVariableReadPermission.Everyone, NetworkVariableWritePermission.Server);
        public readonly NetworkVariable<byte> NetClothingStyle = new(0, NetworkVariableReadPermission.Everyone, NetworkVariableWritePermission.Server);
        public readonly NetworkVariable<byte> NetAccessory = new(0, NetworkVariableReadPermission.Everyone, NetworkVariableWritePermission.Server);
        public readonly NetworkVariable<Color32> NetOutfitColor = new(new Color32(217, 119, 6, 255), NetworkVariableReadPermission.Everyone, NetworkVariableWritePermission.Server);
        public readonly NetworkVariable<FixedString64Bytes> NetVehicleId = new(default, NetworkVariableReadPermission.Everyone, NetworkVariableWritePermission.Server);

        public override void OnNetworkSpawn()
        {
            NetHairStyle.OnValueChanged += (_, _) => RefreshRemoteAppearance();
            NetClothingStyle.OnValueChanged += (_, _) => RefreshRemoteAppearance();
            NetAccessory.OnValueChanged += (_, _) => RefreshRemoteAppearance();
            NetOutfitColor.OnValueChanged += (_, _) => RefreshRemoteAppearance();
            RefreshRemoteAppearance();
        }

        private void Update()
        {
            if (IsOwner)
            {
                if (animationDriver != null)
                {
                    NetAnimState.Value = (byte)animationDriver.CurrentState;
                }
            }
            else if (animationDriver != null)
            {
                var state = (CharacterAnimState)NetAnimState.Value;
                animationDriver.SetAnimationState(state, NetSpeed.Value);
            }
        }

        [Rpc(SendTo.Server)]
        public void SubmitAppearanceServerRpc(bool isFemale, byte hairIdx, byte clothIdx, byte accIdx, Color32 outfit)
        {
            // Server validates indices before replicating appearance to all clients
            NetIsFemale.Value = isFemale;
            NetHairStyle.Value = (byte)Mathf.Clamp(hairIdx, 0, 4);
            NetClothingStyle.Value = (byte)Mathf.Clamp(clothIdx, 0, 4);
            NetAccessory.Value = (byte)Mathf.Clamp(accIdx, 0, 4);
            NetOutfitColor.Value = new Color32(outfit.r, outfit.g, outfit.b, 255);
        }

        [Rpc(SendTo.Server)]
        public void SetVehicleSeatServerRpc(FixedString64Bytes vehicleId)
        {
            NetVehicleId.Value = vehicleId;
        }

        private void RefreshRemoteAppearance()
        {
            if (appearanceController == null) return;
            var data = CharacterCustomizationData.CreateDefault();
            data.isFemale = NetIsFemale.Value;
            data.hairStyle = (HairStyle)Mathf.Clamp(NetHairStyle.Value, 0, 4);
            data.clothingStyle = (ClothingStyle)Mathf.Clamp(NetClothingStyle.Value, 0, 4);
            data.accessory = (AccessoryType)Mathf.Clamp(NetAccessory.Value, 0, 4);
            data.outfitColor = NetOutfitColor.Value;
            appearanceController.Apply(data, IsOwner ? CharacterRole.Player : CharacterRole.RemotePlayer);
        }
    }
}
