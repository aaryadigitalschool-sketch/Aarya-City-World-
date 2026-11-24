using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;

namespace AaryaCity.Core
{
    public enum GraphicsTier { Low, Medium, High, Ultra }
    public enum NepalRegion { Kathmandu, Pokhara, Terai, Himalaya, Rural }
    public enum WeatherCondition { Sunny, Cloudy, Rain, HeavyRain, Fog, Thunderstorm, Snow }

    public class GameManager : MonoBehaviour
    {
        public static GameManager Instance { get; private set; }

        [Header("Mobile Performance")]
        [SerializeField] private GraphicsTier currentGraphicsTier = GraphicsTier.High;
        [SerializeField] private UniversalRenderPipelineAsset[] urpTierAssets;

        public GraphicsTier CurrentTier => currentGraphicsTier;
        public bool IsOfflineMode { get; private set; } = true;

        private void Awake()
        {
            if (Instance != null && Instance != this)
            {
                Destroy(gameObject);
                return;
            }
            Instance = this;
            DontDestroyOnLoad(gameObject);
            ApplyGraphicsTier(currentGraphicsTier);
        }

        public void SetMode(bool offline)
        {
            IsOfflineMode = offline;
        }

        public void ApplyGraphicsTier(GraphicsTier tier)
        {
            currentGraphicsTier = tier;
            Application.targetFrameRate = (tier == GraphicsTier.High || tier == GraphicsTier.Ultra) ? 60 : 30;
            QualitySettings.vSyncCount = 0;

            int idx = (int)tier;
            if (urpTierAssets != null && idx >= 0 && idx < urpTierAssets.Length && urpTierAssets[idx] != null)
            {
                GraphicsSettings.defaultRenderPipeline = urpTierAssets[idx];
                QualitySettings.renderPipeline = urpTierAssets[idx];
            }
        }
    }
}
