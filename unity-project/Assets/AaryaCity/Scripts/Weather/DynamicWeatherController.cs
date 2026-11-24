using AaryaCity.Core;
using UnityEngine;

namespace AaryaCity.Weather
{
    public class DynamicWeatherController : MonoBehaviour
    {
        [SerializeField] private Light sunLight;
        [SerializeField] private ParticleSystem rainParticles;
        [SerializeField] private ParticleSystem snowParticles;
        [SerializeField] [Range(0f, 24f)] private float timeOfDay = 10.5f;
        [SerializeField] private float daySpeedMultiplier = 0.04f;
        [SerializeField] private WeatherCondition currentWeather = WeatherCondition.Sunny;

        public WeatherCondition CurrentWeather => currentWeather;
        public float TimeOfDay => timeOfDay;

        private void Update()
        {
            timeOfDay = (timeOfDay + Time.deltaTime * daySpeedMultiplier) % 24f;
            if (sunLight != null)
            {
                float angle = ((timeOfDay - 6f) / 24f) * 360f;
                sunLight.transform.rotation = Quaternion.Euler(angle, 145f, 0f);
            }
        }

        public void SetWeather(WeatherCondition weather)
        {
            currentWeather = weather;
            bool isRain = weather == WeatherCondition.Rain || weather == WeatherCondition.HeavyRain || weather == WeatherCondition.Thunderstorm;
            bool isSnow = weather == WeatherCondition.Snow;

            if (rainParticles != null)
            {
                if (isRain && !rainParticles.isPlaying) rainParticles.Play();
                else if (!isRain && rainParticles.isPlaying) rainParticles.Stop();
            }
            if (snowParticles != null)
            {
                if (isSnow && !snowParticles.isPlaying) snowParticles.Play();
                else if (!isSnow && snowParticles.isPlaying) snowParticles.Stop();
            }

            RenderSettings.fog = true;
            RenderSettings.fogDensity = weather == WeatherCondition.Fog ? 0.014f : (isRain ? 0.007f : 0.0028f);
        }
    }
}
