using UnityEngine;

namespace AaryaCity.Police
{
    public class PoliceWantedSystem : MonoBehaviour
    {
        [SerializeField] private float cooldownRatePerSecond = 5.5f;
        [SerializeField] private float spottingRadius = 42f;

        public float WantedHeat { get; private set; }
        public int WantedStars => Mathf.Clamp(Mathf.CeilToInt(WantedHeat / 20f), 0, 5);
        public bool HelicopterAuthorized => WantedStars >= 3;

        public void RegisterCrime(float heatDelta)
        {
            WantedHeat = Mathf.Clamp(WantedHeat + Mathf.Max(0f, heatDelta), 0f, 100f);
        }

        public void TickCooldown(bool isSpottedByPatrol, float deltaTime)
        {
            if (WantedHeat <= 0f) return;
            float rate = isSpottedByPatrol ? 0.5f : cooldownRatePerSecond;
            WantedHeat = Mathf.Max(0f, WantedHeat - rate * deltaTime);
        }

        public void ClearAtStation()
        {
            WantedHeat = 0f;
        }

        public float SpottingRadius => spottingRadius;
    }
}
