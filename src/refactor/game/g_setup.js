(function ()
{

  const U_AssetManager = __import__U_AssetManager();
  const U_TransposeBitmap = U_AssetManager.U_TransposeBitmap;
  const U_LoadTextures = U_AssetManager.U_LoadTextures;
  const U_LoadSprites = U_AssetManager.U_LoadSprites;
  const U_LoadThemes = U_AssetManager.U_LoadThemes;
  const U_GetTexture = U_AssetManager.U_GetTexture;
  const U_GetAsset = U_AssetManager.U_GetAsset;

  const U_Animate = __import__U_Animate();
  const U_CreateAnimation = U_Animate.U_CreateAnimation;

  const R_Draw = __import__R_Draw();
  const R_InitBuffer = R_Draw.R_InitBuffer;
  const R_DrawImage = R_Draw.R_DrawImage;
  const R_GetBuffer = R_Draw.R_GetBuffer;

  const I_Canvas = __import__I_Canvas();
  const I_CanvasElement = I_Canvas.I_CanvasElement;

  const G_Drawer = __import__G_Drawer();
  const G_LoadingDrawer = G_Drawer.G_LoadingDrawer;

  const G_Asset = __import__G_Asset();
  const G_AssetId = G_Asset.G_AssetId;
  const G_TextureFile = G_Asset.G_TextureFile;
  const G_VerticalFaceWidth = G_Asset.G_VerticalFaceWidth;
  const G_WorldHeight = G_Asset.G_WorldHeight;
  const G_SpriteFile = G_Asset.G_SpriteFile;
  const G_AudioFile = G_Asset.G_AudioFile;
  const G_AssetFramesData = G_Asset.G_AssetFramesData;
  const G_AssetAnimationFps = G_Asset.G_AssetAnimationFps;
  const G_AssetAnimation = G_Asset.G_AssetAnimation;

  const G_Const = __import__G_Const();
  const SCREEN_W = G_Const.SCREEN_W, SCREEN_H = G_Const.SCREEN_H;
  const MAX_PITCH = G_Const.MAX_PITCH;
  const PX_SIZE_Y = G_Const.PX_SIZE_Y;

  const M_InitDoors = __import__M_Door().M_InitDoors;

  const I_Input = __import__I_Input();
  const I_InitKeyboard = I_Input.I_InitKeyboard;
  const I_InitMouse = I_Input.I_InitMouse;

  function G_Setup (resolve, reject)
  {
    R_InitBuffer(SCREEN_W, SCREEN_H); // initialize the frame buffer
    // play a loading animation during setup
    const resolution = { loadingAnimId: G_LoadingDrawer() };
    // initialize input devices
    I_InitKeyboard(document);
    I_InitMouse(I_CanvasElement);
    M_InitDoors(); // initialize doors
    // load assets: wall, ceiling & floor textures
    U_LoadTextures(G_TextureFile, G_VerticalFaceWidth, G_WorldHeight,
                   G_AssetFramesData, G_AssetAnimationFps)
      // load assets: menu, player weapon, thing and misc. other sprites
      .then(function ()
      {
        return U_LoadSprites(G_SpriteFile,
                             G_AssetFramesData, G_AssetAnimationFps);
      })
      // load assets: in-game sfx and theme music
      .then(function ()
      {
        return U_LoadThemes(G_AudioFile);
      })
      // adapt skybox texture to current game resolution
      // I know this seems a bit hacky, so don't judge me.
      .then(function ()
      {
        const texSky = U_GetTexture(G_AssetId.SK_SKYBOX);
        const extSkyH = Math.floor(SCREEN_H + MAX_PITCH * PX_SIZE_Y);
        const extSkyW = Math.floor(extSkyH * texSky.width / texSky.height);
        R_InitBuffer(extSkyW, extSkyH);
        R_DrawImage(texSky,
                    0, 0, texSky.width, texSky.height,
                    0, 0, extSkyW, extSkyH);
        const screenBuffer = R_GetBuffer();
        texSky.bitmap = new ImageData(U_TransposeBitmap(screenBuffer.data,
                                                        extSkyW, extSkyH),
                                      extSkyW, extSkyH).data;
        texSky.width = extSkyW;
        texSky.height = extSkyH;
        R_InitBuffer(SCREEN_W, SCREEN_H);
      })
      // setup texture & sprite animations
      .then(function ()
      {
        return Object.keys(G_AssetAnimation)
          .map(function (assetId)
          {
            const animationFrames = G_AssetAnimation[assetId];
            const nFrames = animationFrames.length;
            const asset = U_GetAsset(assetId);
            return U_CreateAnimation(
              function (iFrame)
              {
                asset.activeFrames = [animationFrames[iFrame % nFrames]];
              },
              1000 / asset.fps
            );
          });
      })
      // setup texture animations
      .then(function (thingAnimations)
      {
        resolution.animIds = thingAnimations;
      })
      // resolve the setup routine
      .then(function ()
      {
        resolve(resolution);
      })
      // error handling
      .catch(function (error)
      {
        // TODO: a more reasonable error handling?
        console.log("G_Setup: Error while setting up.");
        reject(error);
      });
  }

  function G_SetupPromise ()
  {
    return new Promise(G_Setup);
  }

  window.__import__G_Setup = function ()
  {
    return { G_Setup: G_SetupPromise };
  };

})();
