using System;
using System.IO;
using System.Security.Cryptography;
using System.Text;
using UnityEngine;

namespace AaryaCity.SaveSystem
{
    [Serializable]
    public class PlayerSavePayload
    {
        public int version = 1;
        public string playerName = "Aarya";
        public string gender = "male";
        public int money = 2500;
        public int xp = 0;
        public string[] ownedVehicles = new[] { "kora_gt", "thamel_scooter" };
        public Vector3 position;
        public long savedTimestampUnix;
    }

    [Serializable]
    internal class SignedSaveEnvelope
    {
        public string payloadJson;
        public string sha256;
    }

    public static class LocalSaveManager
    {
        private static string GetSlotPath(string slotId) =>
            Path.Combine(Application.persistentDataPath, $"aarya_save_{slotId}.json");

        private static string GetBackupPath(string slotId) =>
            Path.Combine(Application.persistentDataPath, $"aarya_save_{slotId}.bak.json");

        public static void SaveSlot(string slotId, PlayerSavePayload payload)
        {
            payload.savedTimestampUnix = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
            string json = JsonUtility.ToJson(payload);
            string hash = ComputeSha256(json);
            var env = new SignedSaveEnvelope { payloadJson = json, sha256 = hash };
            string serialized = JsonUtility.ToJson(env);

            File.WriteAllText(GetSlotPath(slotId), serialized, Encoding.UTF8);
            File.WriteAllText(GetBackupPath(slotId), serialized, Encoding.UTF8);
        }

        public static bool TryLoadSlot(string slotId, out PlayerSavePayload payload, out bool recoveredFromBackup)
        {
            recoveredFromBackup = false;
            if (TryReadVerified(GetSlotPath(slotId), out payload)) return true;
            if (TryReadVerified(GetBackupPath(slotId), out payload))
            {
                recoveredFromBackup = true;
                SaveSlot(slotId, payload);
                return true;
            }
            payload = null;
            return false;
        }

        private static bool TryReadVerified(string path, out PlayerSavePayload payload)
        {
            payload = null;
            if (!File.Exists(path)) return false;
            try
            {
                string raw = File.ReadAllText(path, Encoding.UTF8);
                var env = JsonUtility.FromJson<SignedSaveEnvelope>(raw);
                if (env == null || string.IsNullOrEmpty(env.payloadJson)) return false;
                if (!string.Equals(ComputeSha256(env.payloadJson), env.sha256, StringComparison.OrdinalIgnoreCase))
                {
                    return false;
                }
                payload = JsonUtility.FromJson<PlayerSavePayload>(env.payloadJson);
                return payload != null && payload.version >= 1;
            }
            catch
            {
                return false;
            }
        }

        private static string ComputeSha256(string input)
        {
            using var sha = SHA256.Create();
            byte[] bytes = sha.ComputeHash(Encoding.UTF8.GetBytes(input));
            var sb = new StringBuilder(bytes.Length * 2);
            foreach (byte b in bytes) sb.Append(b.ToString("x2"));
            return sb.ToString();
        }
    }
}
