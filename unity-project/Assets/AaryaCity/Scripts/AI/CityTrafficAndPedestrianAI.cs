using System.Collections.Generic;
using UnityEngine;
using UnityEngine.AI;

namespace AaryaCity.AI
{
    public class CityTrafficAndPedestrianAI : MonoBehaviour
    {
        [SerializeField] private float simulationRadius = 110f;
        [SerializeField] private Transform playerTransform;
        [SerializeField] private List<NavMeshAgent> pooledAgents = new();

        private int updateCursor;

        private void Update()
        {
            if (pooledAgents.Count == 0 || playerTransform == null) return;

            // Distance-based staggered AI updates for mobile CPU efficiency
            int batchSize = Mathf.Min(6, pooledAgents.Count);
            for (int i = 0; i < batchSize; i++)
            {
                updateCursor = (updateCursor + 1) % pooledAgents.Count;
                var agent = pooledAgents[updateCursor];
                if (agent == null) continue;

                float dist = Vector3.Distance(agent.transform.position, playerTransform.position);
                bool active = dist <= simulationRadius;
                if (agent.gameObject.activeSelf != active)
                {
                    agent.gameObject.SetActive(active);
                }
            }
        }
    }
}
