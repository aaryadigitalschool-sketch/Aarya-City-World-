using System;
using UnityEngine;

namespace AaryaCity.Player
{
    public enum CharacterRole
    {
        Player,
        Civilian,
        Police,
        Security,
        Shopkeeper,
        Driver,
        Passenger,
        Story,
        Enemy,
        RemotePlayer
    }

    public enum CharacterAnimState
    {
        Idle,
        Walk,
        Run,
        Sprint,
        Jump,
        Fall,
        Crouch,
        Swim,
        Climb,
        Drive,
        EnterVehicle,
        ExitVehicle,
        Combat,
        Interact,
        Talk,
        Sit
    }

    public enum FaceStyle { Oval, Angular, Broad }
    public enum HairStyle { ShortTaper, LayeredLong, TopKnot, SlickBack, Braid }
    public enum ClothingStyle { UrbanParka, NepaliDaura, KathmanduStreet, TrekkingVest, FormalBlazer }
    public enum ShoeStyle { Sneakers, HikingBoots, DressShoes }
    public enum AccessoryType { None, Sunglasses, DhakaTopi, Scarf, Backpack }

    [Serializable]
    public struct CharacterCustomizationData
    {
        public string characterName;
        public bool isFemale;
        public FaceStyle faceStyle;
        public HairStyle hairStyle;
        public ClothingStyle clothingStyle;
        public ShoeStyle shoeStyle;
        public AccessoryType accessory;
        public Color outfitColor;
        public Color hairColor;
        public Color skinColor;
        [Range(0.92f, 1.10f)] public float heightScale;
        [Range(0.88f, 1.14f)] public float buildScale;

        public static CharacterCustomizationData CreateDefault() => new CharacterCustomizationData
        {
            characterName = "Aarya Rai",
            isFemale = false,
            faceStyle = FaceStyle.Oval,
            hairStyle = HairStyle.ShortTaper,
            clothingStyle = ClothingStyle.UrbanParka,
            shoeStyle = ShoeStyle.HikingBoots,
            accessory = AccessoryType.Backpack,
            outfitColor = new Color(0.85f, 0.47f, 0.02f),
            hairColor = new Color(0.12f, 0.11f, 0.09f),
            skinColor = new Color(0.83f, 0.60f, 0.45f),
            heightScale = 1.0f,
            buildScale = 1.0f
        };

        public CharacterCustomizationData Sanitized()
        {
            var copy = this;
            copy.characterName = string.IsNullOrWhiteSpace(copy.characterName)
                ? "Traveler"
                : copy.characterName.Trim().Substring(0, Mathf.Min(20, copy.characterName.Trim().Length));
            copy.heightScale = Mathf.Clamp(copy.heightScale <= 0f ? 1f : copy.heightScale, 0.92f, 1.10f);
            copy.buildScale = Mathf.Clamp(copy.buildScale <= 0f ? 1f : copy.buildScale, 0.88f, 1.14f);
            copy.outfitColor.a = 1f;
            copy.hairColor.a = 1f;
            copy.skinColor.a = 1f;
            return copy;
        }
    }
}
