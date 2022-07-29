(function ()
{

  const WEAPON = __import__D_Weapon();

  const G_Const = __import__G_Const();
  const SCREEN_W = G_Const.SCREEN_W, SCREEN_H = G_Const.SCREEN_H;

  function D_AssetId ()
  {
    return {
      // ceiling textures
      SK_SKYBOX: "SK_SKYBOX",
      C_LIGHTS: "C_LIGHTS",
      C_EXIT: "C_EXIT",
      C_STONE: "C_STONE",
      // floor textures
      F_HEX_STONE: "F_HEX_STONE",
      F_HEX_STEEL: "F_HEX_STEEL",
      F_PENTAGRAM: "F_PENTAGRAM",
      F_MANHOLE: "F_MANHOLE",
      F_SLIME: "F_SLIME",
      // wall textures
      W_DEFAULT: "W_DEFAULT",
      W_ALT: "W_ALT",
      W_DOOR: "W_DOOR",
      W_DOOR_DOCK: "W_DOOR_DOCK",
      W_ALT_1: "W_ALT_1",
      W_EXIT: "W_EXIT",
      W_STAIRS: "W_STAIRS",
      W_BEAM_STEEL: "W_BEAM_STEEL",
      W_SLIME: "W_SLIME",
      // global sprites
      GSP_MENU_SKULL: "GSP_MENU_SKULL",
      [WEAPON.SHOTGUN]: WEAPON.SHOTGUN,
      // thing sprites
      SP_DUDE0: "SP_DUDE0",
      SP_DUDE1: "SP_DUDE1",
      // audio
      A_MAIN: "A_MAIN",
    };
  }
  const ASSET_ID = D_AssetId();

  function D_TextureFile ()
  {
    return {
      [ASSET_ID.SK_SKYBOX]: "s_mounts.png",
      [ASSET_ID.C_LIGHTS]: "f_lights.png",
      [ASSET_ID.C_EXIT]: "f_exit.png",
      [ASSET_ID.C_STONE]: "f_stone.png",
      [ASSET_ID.F_HEX_STONE]: "f_hexstone.png",
      [ASSET_ID.F_HEX_STEEL]: "f_hexsteel.png",
      [ASSET_ID.F_PENTAGRAM]: "f_tporter.png",
      [ASSET_ID.F_MANHOLE]: "f_manhole.png",
      [ASSET_ID.F_SLIME]: "f_slime.png",
      [ASSET_ID.W_DEFAULT]: "w_temple.png",
      [ASSET_ID.W_ALT]: "w_door.png",
      [ASSET_ID.W_DOOR]: "w_doordock.png",
      [ASSET_ID.W_DOOR_DOCK]: "w_wood.png",
      [ASSET_ID.W_ALT_1]: "w_tech.png",
      [ASSET_ID.W_EXIT]: "w_exit.png",
      [ASSET_ID.W_STAIRS]: "w_stairs.png",
      [ASSET_ID.W_BEAM_STEEL]: "w_beamsteel.png",
      [ASSET_ID.W_SLIME]: "w_slime.png",
    };
  }

  function D_VerticalFaceWidth ()
  {
    return {
      [ASSET_ID.W_DEFAULT]: 64,
      [ASSET_ID.W_ALT]: 64,
      [ASSET_ID.W_DOOR]: 64,
      [ASSET_ID.W_DOOR_DOCK]: -1,
      [ASSET_ID.W_ALT_1]: 64,
      [ASSET_ID.W_EXIT]: 32,
      [ASSET_ID.W_STAIRS]: 64,
      [ASSET_ID.W_BEAM_STEEL]: 64,
      [ASSET_ID.W_SLIME]: -1,
    };
  }

  function D_WorldHeight ()
  {
    return {
      [ASSET_ID.W_DEFAULT]: 10,
      [ASSET_ID.W_ALT]: 10,
      [ASSET_ID.W_DOOR]: 10,
      [ASSET_ID.W_DOOR_DOCK]: 10,
      [ASSET_ID.W_ALT_1]: 10,
      [ASSET_ID.W_EXIT]: 1,
      [ASSET_ID.W_STAIRS]: 1,
      [ASSET_ID.W_BEAM_STEEL]: 10,
      [ASSET_ID.W_SLIME]: 4,
    };
  }

  function D_SpriteFile ()
  {
    return {
      [WEAPON.SHOTGUN]: "shotgun.png",
      [ASSET_ID.GSP_MENU_SKULL]: "menu_skull.png",
      [ASSET_ID.SP_DUDE0]: "SP_DUDE0.png",
      [ASSET_ID.SP_DUDE1]: "SP_DUDE1.png",
    };
  }

  function D_AudioFile ()
  {
    return { [ASSET_ID.A_MAIN]: "theme.mp3" };
  }

  function D_AssetAnimation ()
  {
    return {
      [WEAPON.SHOTGUN]: [1, 2, 0, 3, 4, 5, 4, 3, 0],
      [ASSET_ID.GSP_MENU_SKULL]: [0, 1],
      [ASSET_ID.SP_DUDE0]: [0, 1, 2, 3, 4],
      [ASSET_ID.W_SLIME]: [0, 1, 2, 1, 0],
      [ASSET_ID.F_SLIME]: [0, 1, 2, 1, 0],
    };
  }

  function D_AssetFrameData ()
  {
    return {
      [ASSET_ID.GSP_MENU_SKULL]: [
        {
          offset: 0,
          width: 30,
          height: 34,
          locOnScreen: [
            { x: SCREEN_W * 0.5 - 150, y: (SCREEN_H - 56) * 0.5 },
            { x: SCREEN_W * 0.5 + 120, y: (SCREEN_H - 56) * 0.5 }
          ],
        },
        {
          offset: 30,
          width: 30,
          height: 34,
          locOnScreen: [
            { x: SCREEN_W * 0.5 - 150, y: (SCREEN_H - 56) * 0.5 },
            { x: SCREEN_W * 0.5 + 120, y: (SCREEN_H - 56) * 0.5 }
          ],
        },
      ],
      [WEAPON.SHOTGUN]: [
        {
          width: 237,
          height: 180,
          offset: 0,
          locOnScreen: { x: (SCREEN_W - 237) * 0.5, y: SCREEN_H - 180 * 0.75 },
          defaultLocOnScreen: {
            x: (SCREEN_W - 237) * 0.5,
            y: SCREEN_H - 180 * 0.75,
          },
        },
        {
          width: 237,
          height: 219,
          offset: 237,
          locOnScreen: { x: (SCREEN_W - 237) * 0.5, y: SCREEN_H - 219 * 0.75 },
        },
        {
          width: 237,
          height: 246,
          offset: 474,
          locOnScreen: { x: (SCREEN_W - 237) * 0.5, y: SCREEN_H - 246 * 0.75 },
        },
        {
          width: 357,
          height: 363,
          offset: 711,
          locOnScreen: { x: 0, y: SCREEN_H - 363 },
        },
        {
          width: 261,
          height: 453,
          offset: 1068,
          locOnScreen: { x: 0, y: SCREEN_H - 453 },
        },
        {
          width: 339,
          height: 393,
          offset: 1329,
          locOnScreen: { x: 0, y: SCREEN_H - 393 },
        }
      ],
      [ASSET_ID.SP_DUDE0]: [
        { width: 64, height: 128, offset: 0 },
        { width: 64, height: 128, offset: 64 },
        { width: 64, height: 128, offset: 128 },
        { width: 64, height: 128, offset: 192 },
        { width: 64, height: 128, offset: 256 },
      ],
      [ASSET_ID.W_SLIME]: [
        { height: 128, offset: 0 },
        { height: 128, offset: 128 },
        { height: 128, offset: 256 },
      ],
      [ASSET_ID.F_SLIME]: [
        { width: 63, height: 63, offset: 0 },
        { width: 63, height: 63, offset: 63 },
        { width: 63, height: 63, offset: 126 },
      ],
    };
  }

  function D_AssetAnimationFps ()
  {
    return {
      [ASSET_ID.SP_DUDE0]: 7,
      [ASSET_ID.W_SLIME]: 5,
      [ASSET_ID.F_SLIME]: 5,
    };
  }

  window.__import__D_Asset = function ()
  {
    return {
      D_AssetId: D_AssetId(),
      D_TextureFile: D_TextureFile(),
      D_VerticalFaceWidth: D_VerticalFaceWidth(),
      D_WorldHeight: D_WorldHeight(),
      D_SpriteFile: D_SpriteFile(),
      D_AudioFile: D_AudioFile(),
      D_AssetAnimation: D_AssetAnimation(),
      D_AssetFrameData: D_AssetFrameData(),
      D_AssetAnimationFps: D_AssetAnimationFps(),
    };
  };

})();
