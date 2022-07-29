(function ()
{

  const I_Input = __import__I_Input();
  const I_GetKeyState = I_Input.I_GetKeyState;
  const I_GetMouseState = I_Input.I_GetMouseState;
  const I_Keys = I_Input.I_Keys;
  const I_Mouse = I_Input.I_Mouse;

  const PLAYER = __import__G_Player();
  const PLAYER_H = PLAYER.PLAYER_HEIGHT;

  const G_Const = __import__G_Const();
  const FOV = G_Const.FOV;
  const WALKING_APEX = G_Const.WALKING_APEX;
  const BOB_APEX = G_Const.BOB_APEX;
  const MAX_PITCH = G_Const.MAX_PITCH;
  const STEP_SIZE = G_Const.STEP_SIZE;
  const MARGIN_TO_WALL = G_Const.MARGIN_TO_WALL;
  const WORLD_H = G_Const.WORLD_H;
  const SCREEN_W = G_Const.SCREEN_W;
  const PX_SIZE_Y = G_Const.PX_SIZE_Y;
  const SHOOTING_ANIM_INTERVAL = G_Const.SHOOTING_ANIM_INTERVAL;

  const G_AssetAnimation = __import__G_Asset().G_AssetAnimation;

  const U_StartAnimation = __import__U_Animate().U_StartAnimation;

  const U_GetSprite = __import__U_AssetManager().U_GetSprite;

  const M_Door = __import__M_Door();
  const M_GetDoor = M_Door.M_GetDoor;
  const M_AnimateDoor = M_Door.M_AnimateDoor;

  const C_PlayerAABBVsMap = __import__C_Collision().C_PlayerAABBVsMap;

  let playerX = PLAYER.PLAYER_START_X, playerY = PLAYER.PLAYER_START_Y;
  let playerRotation = PLAYER.PLAYER_START_ANGLE;
  let playerPitch = 0;
  let viewportElev = PLAYER.PLAYER_START_ELEV;
  let playerElev = viewportElev + PLAYER_H;

  let weaponDrawn = PLAYER.PLAYER_START_WEAPON;
  let shooting = 0, weaponSpriteIdx = -1;
  let walkIndex = 0, walkReverse = 0;
  let bobIndex = 0, bobReverse = 0;

  function A_GetCurrentWeaponSpriteIndex ()
  {
    return weaponSpriteIdx;
  }

  function A_GetWalkingPlayerElev ()
  {
    walkIndex += (walkReverse ? 1 : -1);
    if (walkIndex + WALKING_APEX <= 0) walkReverse = 1;
    else if (walkIndex >= 0) walkReverse = 0;
    return viewportElev + PLAYER_H + walkIndex;
  }

  function A_GetWalkingPlayerBob ()
  {
    bobIndex += (bobReverse ? 0 - 0.5 : 0.5);
    if (bobIndex >= BOB_APEX) bobReverse = 1;
    else if (bobIndex + BOB_APEX <= 0) bobReverse = 0;
    return bobIndex * bobIndex * (0 - 0.75);
  }

  function A_AnimateShoot ()
  {
    if ((I_GetKeyState(I_Keys.SPC) || I_GetMouseState(I_Mouse.LEFT))
        && shooting === 0)
    {
      const animationFrames = G_AssetAnimation[weaponDrawn];
      const nAnimationFrames = animationFrames.length;
      // prevent launching simultaneous instances of the shooting animation
      shooting = 1;
      // start shooting animation
      U_StartAnimation(
        // onFrame
        function (iFrame)
        {
          U_GetSprite(weaponDrawn).activeFrames = [animationFrames[iFrame]];
          // needed to lighten up the floor during shooting frames
          weaponSpriteIdx = iFrame;
        },
        SHOOTING_ANIM_INTERVAL,
        // shouldEnd
        function (iFrame)
        {
          return iFrame === nAnimationFrames;
        },
        // onEnd
        function ()
        {
          weaponSpriteIdx = -1; shooting = 0;
        }
      );
    }
  }

  function A_AnimateWalk (oldX, oldY)
  {
    const defaultWeaponFrame = U_GetSprite(weaponDrawn).frames[0];
    const defaultLocOnScreen = defaultWeaponFrame.defaultLocOnScreen;
    if (playerX !== oldX || playerY !== oldY)
    {
      playerElev = A_GetWalkingPlayerElev(); // animate head pitch
      if (weaponSpriteIdx < 0) // if currently not shooting
      {
        // animate weapon bob
        const bobY = A_GetWalkingPlayerBob(), bobX = 4 * bobIndex;
        defaultWeaponFrame.locOnScreen.x = defaultLocOnScreen.x + bobX;
        defaultWeaponFrame.locOnScreen.y = defaultLocOnScreen.y + bobY;
      }
    }
    else
    {
      playerElev = viewportElev + PLAYER_H;
      walkIndex = 0; walkReverse = 0;
      bobIndex = 0; bobReverse = 0;
      defaultWeaponFrame.locOnScreen.x = defaultLocOnScreen.x;
      defaultWeaponFrame.locOnScreen.y = defaultLocOnScreen.y;
    }
  }

  function A_UpdatePlayerPitch (increaseBy)
  {
    playerPitch += increaseBy;
    if (playerPitch > MAX_PITCH) playerPitch = MAX_PITCH;
    else if (playerPitch + MAX_PITCH < 0) playerPitch = 0 - MAX_PITCH;
  }

  function A_UpdateViewportElev (increaseBy)
  {
    viewportElev += increaseBy;
    const hPlayerCrouch = WALKING_APEX;
    const playerHeadElev = viewportElev + PLAYER_H;
    if (playerHeadElev > WORLD_H - hPlayerCrouch)
      viewportElev = WORLD_H - hPlayerCrouch - PLAYER_H;
    else if (playerHeadElev < hPlayerCrouch)
      viewportElev = hPlayerCrouch - PLAYER_H;
    // update player elevation based on viewport elevation
    playerElev = viewportElev + PLAYER_H;
  }

  function A_UpdatePlayer (mult)
  {
    const memoPosX = playerX, memoPosY = playerY; // memoize current position
    // calculate displacement vector
    const dirX = Math.cos(playerRotation), dirY = Math.sin(playerRotation);
    let displacementX = 0, displacementY = 0;
    if (I_GetKeyState(I_Keys.W))
    {
      displacementX += dirX;
      displacementY += dirY;
    }
    if (I_GetKeyState(I_Keys.S))
    {
      displacementX -= dirX;
      displacementY -= dirY;
    }
    if (I_GetKeyState(I_Keys.A))
    {
      displacementX += dirY;
      displacementY -= dirX;
    }
    if (I_GetKeyState(I_Keys.D))
    {
      displacementX -= dirY;
      displacementY += dirX;
    }
    // rotate player in-place
    const magRot = 0.075 * mult;
    if (I_GetKeyState(I_Keys.ARW_RIGHT)) playerRotation += magRot;
    if (I_GetKeyState(I_Keys.ARW_LEFT)) playerRotation -= magRot;
    // tilt player's player's view
    const magTilt = 5 * mult;
    if (I_GetKeyState(I_Keys.ARW_UP)) A_UpdatePlayerPitch(magTilt);
    if (I_GetKeyState(I_Keys.ARW_DOWN)) A_UpdatePlayerPitch(0 - magTilt);
    // tilt & rotate player's view in-place with mouse controls
    if (I_GetMouseState(I_Mouse.MOVING))
    {
      const deltaX = I_GetMouseState(I_Mouse.MOVEMENT_X);
      const deltaY = I_GetMouseState(I_Mouse.MOVEMENT_Y);
      A_UpdatePlayerPitch(0 - deltaY / PX_SIZE_Y);
      playerRotation += deltaX * FOV / SCREEN_W;
    }
    // update viewport elevation
    if (I_GetKeyState(I_Keys.E)) A_UpdateViewportElev(magTilt);
    if (I_GetKeyState(I_Keys.Q)) A_UpdateViewportElev(0 - magTilt);
    // update the player elevation using the change in the mouse scroll
    if (I_GetMouseState(I_Mouse.WHEELING))
    {
      const deltaY = I_GetMouseState(I_Mouse.DELTA_WHEEL);
      A_UpdateViewportElev(0 - deltaY / 5);
    }
    // calculate the update to the player position vector
    const paceX = displacementX * STEP_SIZE * mult;
    const paceY = displacementY * STEP_SIZE * mult;
    const collnX = C_PlayerAABBVsMap(playerX, playerY, paceX, 1);
    // update player position unless a collision has occurred
    if (isNaN(collnX)) playerX += paceX;
    // if collided with a solid geometry, resolve it accordingly
    else
    {
      const resolve = MARGIN_TO_WALL * (0 - Math.sign(paceX));
      playerX = collnX + (resolve > 0 ? 1 : 0) + resolve;
    }
    const collnY = C_PlayerAABBVsMap(playerX, playerY, paceY);
    // update player position unless a collision has occurred
    if (isNaN(collnY)) playerY += paceY;
    // if collided with a solid geometry, resolve it accordingly
    else
    {
      const resolve = MARGIN_TO_WALL * (0 - Math.sign(paceY));
      playerY = collnY + (resolve > 0 ? 1 : 0) + resolve;
    }
    // walking animation
    A_AnimateWalk(memoPosX, memoPosY);
  }

  // FIXME: fix with regard to the new DDA
  function A_PlayerInteractDoor ()
  {
    if (I_GetKeyState(I_Keys.RTN))
    {
      const dirX = Math.cos(playerRotation), dirY = Math.sin(playerRotation);
      const lookingUp = dirY < 0, lookingRight = dirX > 0;
      const slope = dirY / dirX;
      let traceVX, traceVY, mapVX, mapVY, traceHX, traceHY, mapHX, mapHY;
      // look for a door in vertical grid lines
      traceVX = lookingRight ? Math.ceil(playerX) : Math.floor(playerX);
      traceVY = playerY + (traceVX - playerX) * slope;
      mapVX = Math.floor(traceVX - (lookingRight ? 0 : 1));
      mapVY = Math.floor(traceVY);
      const doorV = M_GetDoor(mapVX, mapVY);
      // look for a door in horizontal grid lines
      traceHY = lookingUp ? Math.floor(playerY) : Math.ceil(playerY);
      traceHX = playerX + (traceHY - playerY) / slope;
      mapHX = Math.floor(traceHX);
      mapHY = Math.floor(traceHY - (lookingUp ? 1 : 0));
      const doorH = M_GetDoor(mapHX, mapHY);
      // interact with the door, if encountered any
      if (doorV) M_AnimateDoor(A_GetPlayerState(), doorV);
      else if (doorH) M_AnimateDoor(A_GetPlayerState(), doorH);
    }
  }

  function A_GetPlayerState ()
  {
    return {
      x: playerX,
      y: playerY,
      elev: playerElev,
      viewportElev: viewportElev,
      pitch: playerPitch,
      rotation: playerRotation,
      weaponDrawn: weaponDrawn,
      shooting: shooting,
      spriteIdx: weaponSpriteIdx,
      walkIndex: walkIndex,
      walkReverse: walkReverse,
      bobIndex: bobIndex,
      bobReverse: bobReverse,
    };
  }

  window.__import__A_Player = function ()
  {
    return {
      A_GetCurrentWeaponSpriteIndex: A_GetCurrentWeaponSpriteIndex,
      A_UpdatePlayer: A_UpdatePlayer,
      A_AnimateShoot: A_AnimateShoot,
      A_PlayerInteractDoor: A_PlayerInteractDoor,
      A_GetPlayerState: A_GetPlayerState,
    };
  };

})();
