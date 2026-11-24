using System;
using System.Collections.Generic;
using UnityEngine;
using AaryaCity.Vehicles;

namespace AaryaCity.Data
{
    [Serializable]
    public struct VehicleCatalogEntry
    {
        public string vehicleId;
        public string displayName;
        public VehicleClass vehicleClass;
        public int priceNpr;
        public float maxSpeedKmh;
        public Color defaultPaint;
    }

    [CreateAssetMenu(fileName = "VehicleCatalog", menuName = "AaryaCity/Vehicle Catalog")]
    public class VehicleCatalogSO : ScriptableObject
    {
        public List<VehicleCatalogEntry> vehicles = new();
    }
}
