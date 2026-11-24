using System;
using System.Collections.Generic;
using UnityEngine;

namespace AaryaCity.Missions
{
    [Serializable]
    public class MissionCheckpointData
    {
        public string label;
        public Vector3 worldPosition;
        public float triggerRadius = 6f;
        public float timeLimitSeconds;
    }

    [Serializable]
    public class MissionDefinition
    {
        public string missionId;
        public int chapterNumber;
        public string title;
        public int rewardMoney;
        public int rewardXp;
        public List<MissionCheckpointData> checkpoints = new();
    }

    public class MissionManager : MonoBehaviour
    {
        [SerializeField] private List<MissionDefinition> missions = new();

        public MissionDefinition ActiveMission { get; private set; }
        public int CurrentCheckpointIndex { get; private set; }
        public float RemainingTime { get; private set; }

        public event Action<MissionDefinition> OnMissionStarted;
        public event Action<MissionDefinition> OnMissionCompleted;
        public event Action<string> OnMissionFailed;

        public void StartMission(string missionId)
        {
            var found = missions.Find(m => m.missionId == missionId);
            if (found == null || found.checkpoints.Count == 0) return;
            ActiveMission = found;
            CurrentCheckpointIndex = 0;
            RemainingTime = found.checkpoints[0].timeLimitSeconds;
            OnMissionStarted?.Invoke(ActiveMission);
        }

        public void UpdatePlayerPosition(Vector3 playerPos, float deltaTime)
        {
            if (ActiveMission == null) return;
            var cp = ActiveMission.checkpoints[CurrentCheckpointIndex];
            if (cp.timeLimitSeconds > 0f)
            {
                RemainingTime -= deltaTime;
                if (RemainingTime <= 0f)
                {
                    string title = ActiveMission.title;
                    ActiveMission = null;
                    OnMissionFailed?.Invoke($"Time expired on {title}");
                    return;
                }
            }

            if (Vector3.Distance(playerPos, cp.worldPosition) <= cp.triggerRadius)
            {
                CurrentCheckpointIndex++;
                if (CurrentCheckpointIndex >= ActiveMission.checkpoints.Count)
                {
                    var completed = ActiveMission;
                    ActiveMission = null;
                    OnMissionCompleted?.Invoke(completed);
                }
                else
                {
                    RemainingTime = ActiveMission.checkpoints[CurrentCheckpointIndex].timeLimitSeconds;
                }
            }
        }
    }
}
