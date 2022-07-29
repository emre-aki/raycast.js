(function ()
{

  // TODO: should these be here??
  const PATH_TEXTURES = "/textures/";
  const PATH_SPRITES = "/sprites/";
  const PATH_AUDIO = "/audio/";

  const TEXTURE = {}, SPRITE = {}, THEME = {};

  const AUDIO_STATE = { READY: "READY", PLAYING: "PLAYING", ERROR: "ERROR" };

  function U_TransposeBitmap (bitmap, w, h)
  {
    const bitmapTransposed = new Uint8ClampedArray(4 * w * h);
    for (let x = 0; x < w; x += 1)
    {
      for (let y = 0; y < h; y += 1)
      {
        const idxTransposed = 4 * (w * y + x), idxNormal = 4 * (h * x + y);
        bitmapTransposed[idxNormal] = bitmap[idxTransposed];
        bitmapTransposed[idxNormal + 1] = bitmap[idxTransposed + 1];
        bitmapTransposed[idxNormal + 2] = bitmap[idxTransposed + 2];
        bitmapTransposed[idxNormal + 3] = bitmap[idxTransposed + 3];
      }
    }
    return bitmapTransposed;
  }

  function U_ToBitmap (img, transposed)
  {
    const imgWidth = img.width, imgHeight = img.height;
    const tmpCnv = document.createElement("canvas");
    const tmpCtx = tmpCnv.getContext("2d");
    tmpCnv.width = imgWidth; tmpCnv.height = imgHeight;
    tmpCtx.drawImage(img, 0, 0);
    return transposed
      ? U_TransposeBitmap(tmpCtx.getImageData(0, 0, imgWidth, imgHeight).data,
                          imgWidth, imgHeight)
      : tmpCtx.getImageData(0, 0, imgWidth, imgHeight).data;
  }

  function U_LoadSingleTexture (textures, ids, idx, length,
                                verticalFaceWidths, worldHeights,
                                frames, fps,
                                resolve, reject)
  {
    const id = ids[idx], file = textures[id];
    const verticalFaceWidth = verticalFaceWidths[id];
    const worldHeight = worldHeights[id];
    const texFrames = frames[id], texFps = fps[id];
    if (idx === length) resolve();
    else
    {
      const img = new Image();
      img.onload = function ()
      {
        TEXTURE[id] = {
          bitmap: U_ToBitmap(img, true),
          width: img.width,
          height: img.height,
        };
        if (verticalFaceWidth !== undefined)
        {
          TEXTURE[id].dimensions = [
            {
              width: verticalFaceWidth > 0 ? verticalFaceWidth : img.width,
              height: img.height,
              offset: 0
            },
            {
              width: verticalFaceWidth > 0
                ? img.width - verticalFaceWidth
                : img.width,
              height: img.height,
              offset: verticalFaceWidth > 0 ? verticalFaceWidth : 0,
            }
          ];
        }
        if (worldHeight !== undefined) TEXTURE[id].worldHeight = worldHeight;
        if (texFrames !== undefined)
        {
          TEXTURE[id].frames = texFrames;
          TEXTURE[id].activeFrames = [0];
          if (texFps !== undefined) TEXTURE[id].fps = texFps;
        }
        U_LoadSingleTexture(textures, ids, idx + 1, length,
                            verticalFaceWidths, worldHeights,
                            frames, fps,
                            resolve, reject);
      };
      img.onerror = reject;
      img.src = PATH_TEXTURES + file;
    }
  }

  function U_LoadTextures (textures, verticalFaceWidths, worldHeights,
                           frames, fps)
  {
    const textureIds = Object.keys(textures), nTextures = textureIds.length;
    return new Promise(function (resolve, reject)
    {
      U_LoadSingleTexture(textures, textureIds, 0, nTextures,
                          verticalFaceWidths, worldHeights,
                          frames, fps,
                          resolve, reject);
    });
  }

  function U_LoadSingleSprite (sprites, ids, idx, length, frames, fps,
                               resolve, reject)
  {
    const id = ids[idx], file = sprites[id];
    const spFrames = frames[id], spFps = fps[id];
    if (idx === length) resolve();
    else
    {
      const img = new Image();
      img.onload = function ()
      {
        SPRITE[id] = {
          bitmap: U_ToBitmap(img, true),
          width: img.width,
          height: img.height,
        };
        if (spFrames !== undefined)
        {
          SPRITE[id].frames = spFrames;
          SPRITE[id].activeFrames = [0];
          if (spFps !== undefined) SPRITE[id].fps = spFps;
        }
        U_LoadSingleSprite(sprites, ids, idx + 1, length, frames, fps,
                           resolve, reject);
      };
      img.onerror = reject;
      img.src = PATH_SPRITES + file;
    }
  }

  function U_LoadSprites (sprites, frames, fps)
  {
    const spriteIds = Object.keys(sprites), nSprites = spriteIds.length;
    return new Promise (function (resolve, reject)
    {
      U_LoadSingleSprite(sprites, spriteIds, 0, nSprites, frames, fps,
                         resolve, reject);
    });
  }

  function U_LoadSingleTheme (themes, ids, idx, length, resolve, reject)
  {
    const id = ids[idx], file = themes[id];
    if (idx === length) resolve();
    else
    {
      const audio = new Audio();
      audio.onerror = function ()
      {
        if (THEME[id]) THEME[id].state = AUDIO_STATE.ERROR;
        reject(THEME[id]);
      };
      audio.onended = function ()
      {
        THEME[id].state = AUDIO_STATE.READY;
        this.currentTime = 0;
        U_PlayAudio(id);
      };
      audio.oncanplaythrough = function ()
      {
        THEME[id] = { audio: audio, state: AUDIO_STATE.READY };
        U_LoadSingleTheme(themes, ids, idx + 1, length, resolve, reject);
      };
      audio.src = PATH_AUDIO + file;
    }
  }

  function U_LoadThemes (themes)
  {
    const themeIds = Object.keys(themes), nThemes = themeIds.length;
    return new Promise(function (resolve, reject)
    {
      U_LoadSingleTheme(themes, themeIds, 0, nThemes, resolve, reject);
    });
  }

  function U_PlayAudio (id)
  {
    const theme = THEME[id];
    if (theme && theme.state === AUDIO_STATE.READY)
    {
      theme.state = AUDIO_STATE.PLAYING;
      theme.audio.play();
    }
  }

  function U_GetTexture (id)
  {
    return TEXTURE[id];
  }

  function U_GetSprite (id)
  {
    return SPRITE[id];
  }

  function U_GetAudio (id)
  {
    return THEME[id];
  }

  function U_GetAsset (id)
  {
    return U_GetTexture(id) || U_GetSprite(id) || U_GetAudio(id);
  }

  window.__import__U_AssetManager = function ()
  {
    return {
      U_TransposeBitmap: U_TransposeBitmap,
      U_LoadTextures: U_LoadTextures,
      U_LoadSprites: U_LoadSprites,
      U_LoadThemes: U_LoadThemes,
      U_PlayAudio: U_PlayAudio,
      U_GetTexture: U_GetTexture,
      U_GetSprite: U_GetSprite,
      U_GetAsset: U_GetAsset,
    };
  };

})();
