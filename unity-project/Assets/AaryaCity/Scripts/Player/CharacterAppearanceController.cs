using UnityEngine;

namespace AaryaCity.Player
{
    /// <summary>
    /// Controls PBR materials, Humanoid rig proportion limits, facial blendshapes,
    /// modular clothing/hairstyle/accessory sockets, and role uniforms on a 3D character prefab.
    /// </summary>
    public class CharacterAppearanceController : MonoBehaviour
    {
        [Header("Role & Rig Sockets")]
        [SerializeField] private CharacterRole role = CharacterRole.Player;
        [SerializeField] private Transform rigRoot;
        [SerializeField] private SkinnedMeshRenderer bodyRenderer;
        [SerializeField] private Renderer outfitRenderer;
        [SerializeField] private Renderer hairRenderer;

        [Header("Modular Mesh Variants")]
        [SerializeField] private GameObject[] hairVariants = new GameObject[5];
        [SerializeField] private GameObject[] clothingVariants = new GameObject[5];
        [SerializeField] private GameObject[] shoeVariants = new GameObject[3];
        [SerializeField] private GameObject[] accessoryVariants = new GameObject[5];
        [SerializeField] private GameObject policeCapAndBadge;
        [SerializeField] private GameObject securityVestAndBadge;
        [SerializeField] private GameObject shopkeeperApron;

        private static readonly int BaseColorId = Shader.PropertyToID("_BaseColor");
        private MaterialPropertyBlock propBlock;
        public CharacterCustomizationData CurrentData { get; private set; }

        private void Awake()
        {
            propBlock = new MaterialPropertyBlock();
            CurrentData = CharacterCustomizationData.CreateDefault();
        }

        public void Apply(CharacterCustomizationData raw, CharacterRole? overrideRole = null)
        {
            if (overrideRole.HasValue) role = overrideRole.Value;
            var data = raw.Sanitized();
            CurrentData = data;

            if (rigRoot != null)
            {
                rigRoot.localScale = new Vector3(data.buildScale, data.heightScale, data.buildScale);
            }

            ApplyActiveIndex(hairVariants, (int)data.hairStyle);
            ApplyActiveIndex(clothingVariants, (int)data.clothingStyle);
            ApplyActiveIndex(shoeVariants, (int)data.shoeStyle);
            ApplyActiveIndex(accessoryVariants, (int)data.accessory);

            if (policeCapAndBadge != null) policeCapAndBadge.SetActive(role == CharacterRole.Police);
            if (securityVestAndBadge != null) securityVestAndBadge.SetActive(role == CharacterRole.Security);
            if (shopkeeperApron != null) shopkeeperApron.SetActive(role == CharacterRole.Shopkeeper);

            if (bodyRenderer != null && bodyRenderer.sharedMesh != null && bodyRenderer.sharedMesh.blendShapeCount >= 3)
            {
                bodyRenderer.SetBlendShapeWeight(0, data.isFemale ? 100f : 0f);
                bodyRenderer.SetBlendShapeWeight(1, data.faceStyle == FaceStyle.Angular ? 100f : 0f);
                bodyRenderer.SetBlendShapeWeight(2, data.faceStyle == FaceStyle.Broad ? 100f : 0f);
            }

            Color garmentColor = role switch
            {
                CharacterRole.Police => new Color(0.12f, 0.23f, 0.54f),
                CharacterRole.Security => new Color(0.20f, 0.25f, 0.33f),
                CharacterRole.Enemy => new Color(0.50f, 0.11f, 0.11f),
                _ => data.outfitColor
            };

            SetRendererColor(bodyRenderer, data.skinColor);
            SetRendererColor(outfitRenderer, garmentColor);
            SetRendererColor(hairRenderer, data.hairColor);
        }

        private void SetRendererColor(Renderer r, Color color)
        {
            if (r == null) return;
            propBlock ??= new MaterialPropertyBlock();
            r.GetPropertyBlock(propBlock);
            propBlock.SetColor(BaseColorId, color);
            r.SetPropertyBlock(propBlock);
        }

        private static void ApplyActiveIndex(GameObject[] variants, int activeIndex)
        {
            if (variants == null) return;
            for (int i = 0; i < variants.Length; i++)
            {
                if (variants[i] != null)
                {
                    variants[i].SetActive(i == activeIndex);
                }
            }
        }
    }
}
