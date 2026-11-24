using System.Collections.Generic;
using UnityEngine;
using UnityEngine.AI;
using AaryaCity.Player;

namespace AaryaCity.AI
{
    /// <summary>
    /// Manages pooled 3D NPCs across Nepal regions with NavMesh navigation,
    /// distance-based LOD selection (LOD0 / LOD1 / LOD2), and Animator culling
    /// so mobile frame times remain steady at 60 FPS.
    /// </summary>
    public class NpcPoolAndLodManager : MonoBehaviour
    {
        [System.Serializable]
        public class NpcEntry
        {
            public GameObject root;
            public NavMeshAgent agent;
            public Animator animator;
            public LODGroup lodGroup;
            public CharacterAppearanceController appearance;
            public CharacterRole role;
            public int frameGroup;
        }

        [Header("Distance LOD & Pooling Budgets")]
        [SerializeField] private float lod0Distance = 24f;
        [SerializeField] private float lod1Distance = 58f;
        [SerializeField] private float cullDistance = 140f;
        [SerializeField] private Transform playerTransform;
        [SerializeField] private List<NpcEntry> pooledNpcs = new();

        private int frameCounter;

        public int EvaluateLodTier(float distanceMeters)
        {
            if (distanceMeters <= lod0Distance) return 0;
            if (distanceMeters <= lod1Distance) return 1;
            if (distanceMeters <= cullDistance) return 2;
            return -1; // Culled beyond horizon budget
        }

        private void Update()
        {
            if (playerTransform == null || pooledNpcs.Count == 0) return;
            frameCounter++;

            Vector3 playerPos = playerTransform.position;
            for (int i = 0; i < pooledNpcs.Count; i++)
            {
                var npc = pooledNpcs[i];
                if (npc == null || npc.root == null) continue;

                // Stagger distant checks across 3 frames
                if (i % 3 != frameCounter % 3 && Vector3.SqrMagnitude(npc.root.transform.position - playerPos) > lod1Distance * lod1Distance)
                {
                    continue;
                }

                float dist = Vector3.Distance(npc.root.transform.position, playerPos);
                int tier = EvaluateLodTier(dist);
                bool shouldBeActive = tier >= 0;

                if (npc.root.activeSelf != shouldBeActive)
                {
                    npc.root.SetActive(shouldBeActive);
                }

                if (!shouldBeActive) continue;

                if (npc.animator != null)
                {
                    npc.animator.cullingMode = tier == 0
                        ? AnimatorCullingMode.AlwaysAnimate
                        : AnimatorCullingMode.CullUpdateTransforms;
                }

                if (npc.agent != null && npc.agent.isOnNavMesh && npc.agent.remainingDistance < 1.2f && !npc.agent.pathPending)
                {
                    Vector3 wanderTarget = npc.root.transform.position + Random.insideUnitSphere * 18f;
                    if (NavMesh.SamplePosition(wanderTarget, out var hit, 6f, NavMesh.AllAreas))
                    {
                        npc.agent.SetDestination(hit.position);
                    }
                }
            }
        }
    }
}
