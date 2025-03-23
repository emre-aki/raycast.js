(function ()
{

  const G_Const = __import__G_Const();
  const FPS = G_Const.FPS;

  const R_Draw = __import__R_Draw();
  const R_FlushBuffer = R_Draw.R_FlushBuffer;
  const R_DebugStats = R_Draw.R_DebugStats;

  const R_Render = __import__R_Render();
  const R_RenderPlayerView = R_Render.R_RenderPlayerView;

  const U_Animate = __import__U_Animate();
  const U_RunAnimation = U_Animate.U_RunAnimation;
  const U_QuitAnimation = U_Animate.U_QuitAnimation;

  const A_Player = __import__A_Player();
  const A_UpdatePlayer = A_Player.A_UpdatePlayer;
  const A_AnimateShoot = A_Player.A_AnimateShoot;
  const A_PlayerInteractDoor = A_Player.A_PlayerInteractDoor;
  const A_GetPlayerState = A_Player.A_GetPlayerState;

  const G_TitleScreenDrawer = __import__G_Drawer().G_TitleScreenDrawer;

  const G_Asset = __import__G_Asset();
  const G_AssetAnimation = G_Asset.G_AssetAnimation;
  const TITLE_DECOR_ID = G_Asset.G_AssetId.GSP_MENU_SKULL;

  const U_GetSprite = __import__U_AssetManager().U_GetSprite;

  const TICK_DELAY = 1000 / FPS;
  let tickInterval;
  let lastTick;

  function G_UpdateScreen (deltaT, player)
  {
    R_RenderPlayerView(deltaT, player);
    // flush the changes in the screen buffer to the actual canvas
    R_FlushBuffer();
    // TODO: if debug mode
    R_DebugStats(player, deltaT);
  }

  function G_UpdateGame (deltaT)
  {
    A_UpdatePlayer(1);
    A_PlayerInteractDoor();
    A_AnimateShoot();
  }

  function G_Tick (deltaT)
  {
    const player = A_GetPlayerState();
    G_UpdateScreen(deltaT, player); // update screen buffer
    G_UpdateGame(deltaT); // update actors & game state
  }

  function G_AdvanceTick ()
  {
    const currentTick = new Date();
    if (lastTick === undefined) lastTick = currentTick;
    const deltaT = currentTick - lastTick;
    G_Tick(deltaT);
    lastTick = currentTick;
  }

  function G_StartGame (titleScreenAnimId, animIds, onTitleEnd)
  {
    // start in-game animations for animated assets
    animIds.forEach(function (animId)
    {
      U_RunAnimation(animId);
    });
    // kickstart the game ticks
    tickInterval = setInterval(G_AdvanceTick, TICK_DELAY);
    // clear the title screen animation that is running
    U_QuitAnimation(titleScreenAnimId, onTitleEnd);
  }

  function G_Run (setupResolution)
  {
    // first, clear the loading animation that is running
    U_QuitAnimation(setupResolution.loadingAnimId);
    // start the animation for the title screen
    const titleScreenAnimId = G_TitleScreenDrawer(U_GetSprite(TITLE_DECOR_ID),
                                                  G_AssetAnimation[
                                                    TITLE_DECOR_ID
                                                  ]);
    // listen keydown events to kickstart the game ticks
    const startGameWrapped = function ()
    {
      G_StartGame(titleScreenAnimId, setupResolution.animIds, function ()
      {
        document.removeEventListener("keydown", startGameWrapped);
      });
    };
    document.addEventListener("keydown", startGameWrapped);
  }

  window.__import__G_Run = function ()
  {
    return { G_Run: G_Run };
  };

})();
