(function ()
{

  const D_Asset = __import__D_Asset();
  const D_AssetId = D_Asset.D_AssetId;
  const D_TextureFile = D_Asset.D_TextureFile;
  const D_VerticalFaceWidth = D_Asset.D_VerticalFaceWidth;
  const D_WorldHeight = D_Asset.D_WorldHeight;
  const D_SpriteFile = D_Asset.D_SpriteFile;
  const D_AudioFile = D_Asset.D_AudioFile;
  const D_AssetAnimation = D_Asset.D_AssetAnimation;
  const D_AssetFrameData = D_Asset.D_AssetFrameData;
  const D_AssetAnimationFps = D_Asset.D_AssetAnimationFps;

  function G_WallTexLookup ()
  {
    return [
      D_AssetId.W_DEFAULT,
      D_AssetId.W_ALT,
      D_AssetId.W_DOOR,
      D_AssetId.W_DOOR_DOCK,
      D_AssetId.W_ALT_1,
      D_AssetId.W_EXIT,
      D_AssetId.W_STAIRS,
      D_AssetId.W_BEAM_STEEL,
    ];
  }

  function G_CeilTexLookup ()
  {
    return [
      D_AssetId.SK_SKYBOX,
      D_AssetId.C_LIGHTS,
      D_AssetId.C_EXIT,
      D_AssetId.C_STONE,
    ];
  }

  function G_FloorTexLookup ()
  {
    return [
      D_AssetId.F_HEX_STONE,
      D_AssetId.F_HEX_STEEL,
      D_AssetId.F_PENTAGRAM,
      D_AssetId.F_MANHOLE,
    ];
  }

  function G_ThingSpriteLookup ()
  {
    return [D_AssetId.SP_DUDE0, D_AssetId.SP_DUDE1];
  }

  window.__import__G_Asset = function ()
  {
    return {
      G_AssetId: D_AssetId,
      G_TextureFile: D_TextureFile,
      G_VerticalFaceWidth: D_VerticalFaceWidth,
      G_WorldHeight: D_WorldHeight,
      G_WallTexLookup: G_WallTexLookup(),
      G_CeilTexLookup: G_CeilTexLookup(),
      G_FloorTexLookup: G_FloorTexLookup(),
      G_SpriteFile: D_SpriteFile,
      G_ThingSpriteLookup: G_ThingSpriteLookup(),
      G_AudioFile: D_AudioFile,
      G_AssetAnimation: D_AssetAnimation,
      G_AssetFramesData: D_AssetFrameData,
      G_AssetAnimationFps: D_AssetAnimationFps,
    };
  };

})();
