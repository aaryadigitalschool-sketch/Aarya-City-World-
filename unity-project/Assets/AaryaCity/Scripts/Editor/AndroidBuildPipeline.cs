#if UNITY_EDITOR
using System;
using System.IO;
using UnityEditor;
using UnityEditor.Build.Reporting;
using UnityEngine;

namespace AaryaCity.Build
{
    public static class AndroidBuildPipeline
    {
        private static readonly string[] BuildScenes =
        {
            "Assets/AaryaCity/Scenes/Boot/Boot.unity",
            "Assets/AaryaCity/Scenes/MainMenu/MainMenu.unity",
            "Assets/AaryaCity/Scenes/Kathmandu/Kathmandu.unity",
            "Assets/AaryaCity/Scenes/Pokhara/Pokhara.unity",
            "Assets/AaryaCity/Scenes/Terai/Terai.unity",
            "Assets/AaryaCity/Scenes/Himalaya/Himalaya.unity"
        };

        public static void PerformBuild()
        {
            string mode = GetArg("-buildMode", "debug");
            string outputDir = GetArg("-outputDir", "Builds/Android");
            Directory.CreateDirectory(outputDir);

            PlayerSettings.applicationIdentifier = "com.aaryadigitalworld.aaryacity";
            PlayerSettings.SetScriptingBackend(BuildTargetGroup.Android, ScriptingImplementation.IL2CPP);
            PlayerSettings.Android.targetArchitectures = AndroidArchitecture.ARM64;
            PlayerSettings.defaultInterfaceOrientation = UIOrientation.LandscapeLeft;

            bool isRelease = mode == "release" || mode == "aab";
            EditorUserBuildSettings.buildAppBundle = (mode == "aab");

            if (isRelease)
            {
                PlayerSettings.Android.useCustomKeystore = true;
                PlayerSettings.Android.keystoreName = GetArg("-keystorePath", "");
                PlayerSettings.Android.keystorePass = GetArg("-keystorePass", "");
                PlayerSettings.Android.keyaliasName = GetArg("-keyaliasName", "");
                PlayerSettings.Android.keyaliasPass = GetArg("-keyaliasPass", "");
            }
            else
            {
                PlayerSettings.Android.useCustomKeystore = false;
            }

            string fileName = mode switch
            {
                "aab" => "AARYA_CITY_RELEASE.aab",
                "release" => "AARYA_CITY_RELEASE.apk",
                _ => "AARYA_CITY_DEBUG.apk"
            };

            var options = new BuildPlayerOptions
            {
                scenes = BuildScenes,
                locationPathName = Path.Combine(outputDir, fileName),
                target = BuildTarget.Android,
                options = isRelease ? BuildOptions.None : BuildOptions.Development
            };

            BuildReport report = BuildPipeline.BuildPlayer(options);
            if (report.summary.result != BuildResult.Succeeded)
            {
                throw new Exception($"Android build failed: {report.summary.result}");
            }
            Debug.Log($"AARYA CITY Android build succeeded: {options.locationPathName}");
        }

        private static string GetArg(string name, string fallback)
        {
            string[] args = Environment.GetCommandLineArgs();
            for (int i = 0; i < args.Length - 1; i++)
            {
                if (args[i] == name) return args[i + 1];
            }
            return fallback;
        }
    }
}
#endif
