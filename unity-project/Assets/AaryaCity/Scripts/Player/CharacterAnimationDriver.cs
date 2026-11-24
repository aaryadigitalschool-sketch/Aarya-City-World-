using UnityEngine;

namespace AaryaCity.Player
{
    /// <summary>
    /// Smoothly blends Humanoid Animator parameters for all 17 open-world actions:
    /// idle, walk, run, sprint, turn, jump, fall/land, crouch, swim, climb, drive,
    /// enter/exit vehicle, combat, interact, talk, and sit.
    /// </summary>
    public class CharacterAnimationDriver : MonoBehaviour
    {
        [SerializeField] private Animator animator;
        [SerializeField] private float locomotionDampTime = 0.12f;

        private static readonly int SpeedHash = Animator.StringToHash("MoveSpeed");
        private static readonly int TurnHash = Animator.StringToHash("TurnAngle");
        private static readonly int GroundedHash = Animator.StringToHash("IsGrounded");
        private static readonly int CrouchHash = Animator.StringToHash("IsCrouching");
        private static readonly int SwimHash = Animator.StringToHash("IsSwimming");
        private static readonly int ClimbHash = Animator.StringToHash("IsClimbing");
        private static readonly int DriveHash = Animator.StringToHash("IsDriving");
        private static readonly int SitHash = Animator.StringToHash("IsSitting");
        private static readonly int TalkHash = Animator.StringToHash("IsTalking");
        private static readonly int CombatTriggerHash = Animator.StringToHash("CombatAttack");
        private static readonly int InteractTriggerHash = Animator.StringToHash("Interact");
        private static readonly int EnterVehicleTriggerHash = Animator.StringToHash("EnterVehicle");
        private static readonly int ExitVehicleTriggerHash = Animator.StringToHash("ExitVehicle");

        public CharacterAnimState CurrentState { get; private set; } = CharacterAnimState.Idle;

        public void SetAnimationState(CharacterAnimState state, float normalizedSpeed, float turnDeltaDeg = 0f, bool isGrounded = true)
        {
            CurrentState = state;
            if (animator == null) return;

            animator.SetFloat(SpeedHash, normalizedSpeed, locomotionDampTime, Time.deltaTime);
            animator.SetFloat(TurnHash, Mathf.Clamp(turnDeltaDeg / 90f, -1f, 1f), locomotionDampTime, Time.deltaTime);
            animator.SetBool(GroundedHash, isGrounded);
            animator.SetBool(CrouchHash, state == CharacterAnimState.Crouch);
            animator.SetBool(SwimHash, state == CharacterAnimState.Swim);
            animator.SetBool(ClimbHash, state == CharacterAnimState.Climb);
            animator.SetBool(DriveHash, state == CharacterAnimState.Drive);
            animator.SetBool(SitHash, state == CharacterAnimState.Sit);
            animator.SetBool(TalkHash, state == CharacterAnimState.Talk);
        }

        public void TriggerAction(CharacterAnimState action)
        {
            CurrentState = action;
            if (animator == null) return;

            switch (action)
            {
                case CharacterAnimState.Combat:
                    animator.SetTrigger(CombatTriggerHash);
                    break;
                case CharacterAnimState.Interact:
                    animator.SetTrigger(InteractTriggerHash);
                    break;
                case CharacterAnimState.EnterVehicle:
                    animator.SetTrigger(EnterVehicleTriggerHash);
                    break;
                case CharacterAnimState.ExitVehicle:
                    animator.SetTrigger(ExitVehicleTriggerHash);
                    break;
            }
        }
    }
}
