using UnityEngine;
using UnityEngine.InputSystem;

namespace AaryaCity.Player
{
    [RequireComponent(typeof(CharacterController))]
    public class ThirdPersonPlayerController : MonoBehaviour
    {
        [Header("Movement Tuning")]
        [SerializeField] private float walkSpeed = 4.8f;
        [SerializeField] private float sprintSpeed = 9.4f;
        [SerializeField] private float crouchSpeed = 2.6f;
        [SerializeField] private float jumpHeight = 1.65f;
        [SerializeField] private float gravity = -22f;
        [SerializeField] private float rotationSmoothTime = 0.1f;

        [Header("Survival & Stamina")]
        [SerializeField] private float maxHealth = 100f;
        [SerializeField] private float maxStamina = 100f;

        private CharacterController controller;
        private Transform mainCamera;
        private Vector2 moveInput;
        private bool sprintHeld;
        private bool crouchActive;
        private float verticalVelocity;
        private float turnSmoothVelocity;
        private float coyoteTimer;

        public float Health { get; private set; }
        public float Stamina { get; private set; }
        public bool IsInVehicle { get; set; }

        private void Awake()
        {
            controller = GetComponent<CharacterController>();
            mainCamera = Camera.main != null ? Camera.main.transform : null;
            Health = maxHealth;
            Stamina = maxStamina;
        }

        public void OnMove(InputValue value) => moveInput = value.Get<Vector2>();
        public void OnSprint(InputValue value) => sprintHeld = value.isPressed;
        public void OnCrouch(InputValue value) { if (value.isPressed) crouchActive = !crouchActive; }
        public void OnJump(InputValue value)
        {
            if (value.isPressed && coyoteTimer > 0f && !IsInVehicle)
            {
                verticalVelocity = Mathf.Sqrt(jumpHeight * -2f * gravity);
                coyoteTimer = 0f;
            }
        }

        private void Update()
        {
            if (IsInVehicle) return;

            if (controller.isGrounded)
            {
                coyoteTimer = 0.14f;
                if (verticalVelocity < 0f) verticalVelocity = -2f;
            }
            else
            {
                coyoteTimer = Mathf.Max(0f, coyoteTimer - Time.deltaTime);
            }

            bool sprinting = sprintHeld && moveInput.sqrMagnitude > 0.05f && !crouchActive && Stamina > 5f;
            Stamina = sprinting
                ? Mathf.Max(0f, Stamina - 18f * Time.deltaTime)
                : Mathf.Min(maxStamina, Stamina + 14f * Time.deltaTime);

            float targetSpeed = crouchActive ? crouchSpeed : (sprinting ? sprintSpeed : walkSpeed);
            Vector3 direction = new Vector3(moveInput.x, 0f, moveInput.y).normalized;

            if (direction.sqrMagnitude >= 0.01f)
            {
                float camYaw = mainCamera != null ? mainCamera.eulerAngles.y : 0f;
                float targetAngle = Mathf.Atan2(direction.x, direction.z) * Mathf.Rad2Deg + camYaw;
                float angle = Mathf.SmoothDampAngle(transform.eulerAngles.y, targetAngle, ref turnSmoothVelocity, rotationSmoothTime);
                transform.rotation = Quaternion.Euler(0f, angle, 0f);

                Vector3 moveDir = Quaternion.Euler(0f, targetAngle, 0f) * Vector3.forward;
                controller.Move(moveDir.normalized * (targetSpeed * Time.deltaTime));
            }

            verticalVelocity += gravity * Time.deltaTime;
            controller.Move(new Vector3(0f, verticalVelocity * Time.deltaTime, 0f));
        }

        public void ApplyDamage(float amount)
        {
            Health = Mathf.Max(0f, Health - amount);
        }
    }
}
