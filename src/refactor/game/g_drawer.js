(function ()
{

  const R_Draw = __import__R_Draw();
  const R_FlushBuffer = R_Draw.R_FlushBuffer;
  const R_Print = R_Draw.R_Print;
  const R_FillRect = R_Draw.R_FillRect;
  const R_FillRectAdHoc = R_Draw.R_FillRectAdHoc;
  const R_DrawGlobalSprite = R_Draw.R_DrawGlobalSprite;

  const U_StartAnimation = __import__U_Animate().U_StartAnimation;

  const G_Const = __import__G_Const();
  const SCREEN_W = G_Const.SCREEN_W, SCREEN_H = G_Const.SCREEN_H;

  const N_LOADING_STATES = 4, INTERVAL_LOADING = 375;
  const LOADING_TEXT = "Loading", LOADING_TEXT_COLOR = "#FFFFFF";
  const LOADING_TEXT_SIZE = 36;

  const INTERVAL_TITLE = 375;
  const TITLE_TEXT = "Press any key to start", TITLE_TEXT_COLOR = "#FFFFFF";
  const TITLE_TEXT_SIZE = 16;

  function G_OnLoadingFrame (iFrame)
  {
    R_FillRectAdHoc(0, 0, SCREEN_W, SCREEN_H);
    R_Print(LOADING_TEXT +
              new Array(iFrame % N_LOADING_STATES).fill(".").join(""),
            (SCREEN_W - 150) * 0.5, SCREEN_H * 0.5,
            { size: LOADING_TEXT_SIZE, color: LOADING_TEXT_COLOR });
  }

  function G_LoadingDrawer (onEnd)
  {
    return U_StartAnimation(G_OnLoadingFrame, INTERVAL_LOADING,
                            undefined, onEnd);
  }

  function G_OnTitleScreenFrame (iFrame, decorSprite, anim)
  {
    const i = iFrame % anim.length;
    decorSprite.activeFrames = [anim[i]];
    R_FillRect(0, 0, SCREEN_W, SCREEN_H, [0, 0, 0, 255]);
    R_DrawGlobalSprite(decorSprite);
    R_FlushBuffer();
    if (i === 1)
    {
      R_Print(TITLE_TEXT, (SCREEN_W - 212) * 0.5, (SCREEN_H - 16) * 0.5,
              { size: TITLE_TEXT_SIZE, color: TITLE_TEXT_COLOR });
    }
  }

  function G_TitleScreenDrawer (decorSprite, animFrames, onEnd)
  {
    return U_StartAnimation(function (iFrame)
    {
      G_OnTitleScreenFrame(iFrame, decorSprite, animFrames);
    },
    INTERVAL_TITLE, undefined, onEnd);
  }

  window.__import__G_Drawer = function ()
  {
    return {
      G_LoadingDrawer: G_LoadingDrawer,
      G_TitleScreenDrawer: G_TitleScreenDrawer,
    };
  };

})();
