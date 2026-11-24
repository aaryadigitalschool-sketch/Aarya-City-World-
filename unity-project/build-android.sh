#!/usr/bin/env bash
set -euo pipefail

# AARYA CITY — Reproducible Unity 6 LTS Android Build Script
UNITY_BIN="${UNITY_EDITOR_PATH:-/opt/unity/Editor/Unity}"
PROJECT_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUILD_DIR="${PROJECT_PATH}/Builds/Android"
MODE="${1:-debug}" # debug | release | aab

mkdir -p "${BUILD_DIR}"

if [ ! -x "${UNITY_BIN}" ]; then
  echo "ERROR: Unity Editor binary not found at ${UNITY_BIN}."
  echo "Set UNITY_EDITOR_PATH to your Unity 6000.0 LTS executable with Android Build Support."
  exit 1
fi

EXTRA_ARGS=""
if [ "${MODE}" = "release" ] || [ "${MODE}" = "aab" ]; then
  if [ -z "${ANDROID_KEYSTORE_PATH:-}" ] || [ -z "${ANDROID_KEYSTORE_PASS:-}" ] || [ -z "${ANDROID_KEYALIAS_NAME:-}" ] || [ -z "${ANDROID_KEYALIAS_PASS:-}" ]; then
    echo "ERROR: Release/AAB builds require ANDROID_KEYSTORE_PATH, ANDROID_KEYSTORE_PASS, ANDROID_KEYALIAS_NAME, ANDROID_KEYALIAS_PASS."
    exit 1
  fi
  EXTRA_ARGS="-keystorePath ${ANDROID_KEYSTORE_PATH} -keystorePass ${ANDROID_KEYSTORE_PASS} -keyaliasName ${ANDROID_KEYALIAS_NAME} -keyaliasPass ${ANDROID_KEYALIAS_PASS}"
fi

"${UNITY_BIN}" -batchmode -quit \
  -projectPath "${PROJECT_PATH}" \
  -buildTarget Android \
  -executeMethod AaryaCity.Build.AndroidBuildPipeline.PerformBuild \
  -buildMode "${MODE}" \
  -outputDir "${BUILD_DIR}" \
  ${EXTRA_ARGS} \
  -logFile "${BUILD_DIR}/build-${MODE}.log"

echo "Build finished. Inspect ${BUILD_DIR}/build-${MODE}.log"
