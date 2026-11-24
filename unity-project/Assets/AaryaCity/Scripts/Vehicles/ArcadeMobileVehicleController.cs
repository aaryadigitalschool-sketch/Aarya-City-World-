using UnityEngine;

namespace AaryaCity.Vehicles
{
    public enum VehicleClass { Sports, Supercar, Sedan, SUV, Pickup, Motorcycle, Scooter, Bus, Truck, Jeep, Helicopter, Boat, Police }

    [RequireComponent(typeof(Rigidbody))]
    public class ArcadeMobileVehicleController : MonoBehaviour
    {
        [Header("Vehicle Config")]
        [SerializeField] private VehicleClass vehicleClass = VehicleClass.Sports;
        [SerializeField] private float motorTorque = 1600f;
        [SerializeField] private float maxSteerAngle = 32f;
        [SerializeField] private float brakeTorque = 2800f;
        [SerializeField] private float maxSpeedKmh = 145f;
        [SerializeField] private float wetGripMultiplier = 0.85f;

        [Header("Wheel Colliders")]
        [SerializeField] private WheelCollider frontLeft;
        [SerializeField] private WheelCollider frontRight;
        [SerializeField] private WheelCollider rearLeft;
        [SerializeField] private WheelCollider rearRight;

        private Rigidbody rb;
        public float ThrottleInput { get; set; }
        public float SteerInput { get; set; }
        public bool HandbrakeHeld { get; set; }
        public bool IsWetWeather { get; set; }
        public float FuelPercent { get; private set; } = 100f;
        public float SpeedKmh => rb != null ? rb.linearVelocity.magnitude * 3.6f : 0f;

        private void Awake()
        {
            rb = GetComponent<Rigidbody>();
            rb.centerOfMass = new Vector3(0f, -0.45f, 0f);
        }

        private void FixedUpdate()
        {
            if (frontLeft == null || frontRight == null || rearLeft == null || rearRight == null) return;

            float steer = SteerInput * maxSteerAngle;
            frontLeft.steerAngle = steer;
            frontRight.steerAngle = steer;

            float gripScale = IsWetWeather ? wetGripMultiplier : 1f;
            float appliedMotor = (SpeedKmh < maxSpeedKmh && FuelPercent > 0f) ? ThrottleInput * motorTorque * gripScale : 0f;

            rearLeft.motorTorque = appliedMotor;
            rearRight.motorTorque = appliedMotor;

            float appliedBrake = HandbrakeHeld ? brakeTorque : 0f;
            rearLeft.brakeTorque = appliedBrake;
            rearRight.brakeTorque = appliedBrake;

            if (Mathf.Abs(ThrottleInput) > 0.05f && FuelPercent > 0f)
            {
                FuelPercent = Mathf.Max(0f, FuelPercent - 0.35f * Time.fixedDeltaTime);
            }
        }
    }
}
