using UnityEngine;
using UnityEngine.SceneManagement;

namespace AaryaCity.Core
{
    public class BootstrapLoader : MonoBehaviour
    {
        [SerializeField] private string mainMenuSceneName = "MainMenu";

        private void Start()
        {
            SceneManager.LoadSceneAsync(mainMenuSceneName, LoadSceneMode.Single);
        }
    }
}
