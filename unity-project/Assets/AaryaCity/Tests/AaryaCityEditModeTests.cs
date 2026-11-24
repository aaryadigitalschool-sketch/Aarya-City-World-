using NUnit.Framework;
using UnityEngine;
using AaryaCity.AI;
using AaryaCity.Player;
using AaryaCity.Police;
using AaryaCity.SaveSystem;

namespace AaryaCity.Tests
{
    public class AaryaCityEditModeTests
    {
        [Test]
        public void PoliceWantedSystem_EscalatesToHelicopterAtLevelThree()
        {
            var go = new GameObject("PoliceSystemTest");
            var police = go.AddComponent<PoliceWantedSystem>();

            police.RegisterCrime(55f);
            Assert.AreEqual(3, police.WantedStars);
            Assert.IsTrue(police.HelicopterAuthorized);

            police.ClearAtStation();
            Assert.AreEqual(0, police.WantedStars);
            Object.DestroyImmediate(go);
        }

        [Test]
        public void LocalSaveManager_RecoversFromCorruptedPrimarySlot()
        {
            var payload = new PlayerSavePayload
            {
                playerName = "AaryaTest",
                money = 9200,
                xp = 450
            };
            LocalSaveManager.SaveSlot("unit_test_slot", payload);

            string primaryPath = System.IO.Path.Combine(Application.persistentDataPath, "aarya_save_unit_test_slot.json");
            System.IO.File.WriteAllText(primaryPath, "{CORRUPTED_DATA");

            bool ok = LocalSaveManager.TryLoadSlot("unit_test_slot", out var loaded, out bool recovered);
            Assert.IsTrue(ok);
            Assert.IsTrue(recovered);
            Assert.AreEqual(9200, loaded.money);
        }

        [Test]
        public void CharacterCustomizationData_ClampsProportionsWithinRigLimits()
        {
            var custom = CharacterCustomizationData.CreateDefault();
            custom.heightScale = 2.5f;
            custom.buildScale = 0.2f;
            custom.characterName = "   ";

            var sanitized = custom.Sanitized();
            Assert.AreEqual(1.10f, sanitized.heightScale, 0.001f);
            Assert.AreEqual(0.88f, sanitized.buildScale, 0.001f);
            Assert.AreEqual("Traveler", sanitized.characterName);
        }

        [Test]
        public void CharacterAnimationDriver_TracksActiveActionState()
        {
            var go = new GameObject("AnimDriverTest");
            var driver = go.AddComponent<CharacterAnimationDriver>();

            driver.SetAnimationState(CharacterAnimState.Drive, 0f, 0f, true);
            Assert.AreEqual(CharacterAnimState.Drive, driver.CurrentState);

            driver.TriggerAction(CharacterAnimState.Combat);
            Assert.AreEqual(CharacterAnimState.Combat, driver.CurrentState);
            Object.DestroyImmediate(go);
        }

        [Test]
        public void NpcPoolAndLodManager_AssignsDistanceLodTiers()
        {
            var go = new GameObject("LodTest");
            var manager = go.AddComponent<NpcPoolAndLodManager>();

            Assert.AreEqual(0, manager.EvaluateLodTier(12f));
            Assert.AreEqual(1, manager.EvaluateLodTier(40f));
            Assert.AreEqual(2, manager.EvaluateLodTier(95f));
            Assert.AreEqual(-1, manager.EvaluateLodTier(180f));
            Object.DestroyImmediate(go);
        }
    }
}
