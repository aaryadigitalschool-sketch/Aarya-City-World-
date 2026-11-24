using System.Collections.Generic;
using UnityEngine;

namespace AaryaCity.Economy
{
    public class PlayerEconomyManager : MonoBehaviour
    {
        public int OfflineMoney { get; private set; } = 2500;
        public int OfflineXp { get; private set; } = 0;
        public int PlayerLevel => 1 + (OfflineXp / 500);
        public HashSet<string> OwnedVehicleIds { get; } = new() { "kora_gt", "thamel_scooter" };

        public void GrantOfflineReward(int money, int xp)
        {
            OfflineMoney += Mathf.Max(0, money);
            OfflineXp += Mathf.Max(0, xp);
        }

        public bool TryPurchaseVehicle(string vehicleId, int cost)
        {
            if (OwnedVehicleIds.Contains(vehicleId) || OfflineMoney < cost) return false;
            OfflineMoney -= cost;
            OwnedVehicleIds.Add(vehicleId);
            return true;
        }
    }
}
