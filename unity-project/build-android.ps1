param(
  [ValidateSet("debug", "release", "aab")]
  [string]$Mode = "debug",
  [string]$UnityPath = "$env:UNITY_EDITOR_PATH"
)

$ErrorActionPreference = "Stop"
if (-not $UnityPath) {
  $UnityPath = "C:\Program Files\Unity\Hub\Editor\6000.0.28f1\Editor\Unity.exe"
}

$ProjectPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$BuildDir = Join-Path $ProjectPath "Builds\Android"
New-Item -ItemType Directory -Force -Path $BuildDir | Out-Null

if (-not (Test-Path $UnityPath)) {
  Write-Error "Unity Editor not found at $UnityPath. Set UNITY_EDITOR_PATH or install Unity 6 LTS Android Build Support."
}

$argsList = @(
  "-batchmode", "-quit",
  "-projectPath", $ProjectPath,
  "-buildTarget", "Android",
  "-executeMethod", "AaryaCity.Build.AndroidBuildPipeline.PerformBuild",
  "-buildMode", $Mode,
  "-outputDir", $BuildDir,
  "-logFile", (Join-Path $BuildDir "build-$Mode.log")
)

if ($Mode -eq "release" -or $Mode -eq "aab") {
  if (-not $env:ANDROID_KEYSTORE_PATH -or -not $env:ANDROID_KEYSTORE_PASS) {
    Write-Error "Release/AAB builds require ANDROID_KEYSTORE_PATH, ANDROID_KEYSTORE_PASS, ANDROID_KEYALIAS_NAME, and ANDROID_KEYALIAS_PASS."
  }
  $argsList += @(
    "-keystorePath", $env:ANDROID_KEYSTORE_PATH,
    "-keystorePass", $env:ANDROID_KEYSTORE_PASS,
    "-keyaliasName", $env:ANDROID_KEYALIAS_NAME,
    "-keyaliasPass", $env:ANDROID_KEYALIAS_PASS
  )
}

& $UnityPath @argsList
exit $LASTEXITCODE
