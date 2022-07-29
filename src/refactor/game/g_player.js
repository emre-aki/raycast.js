(function ()
{

  const D_Player = __import__D_Player();
  const PLAYER_HEIGHT = D_Player.PLAYER_HEIGHT;
  const PLAYER_START_X = D_Player.PLAYER_START_X;
  const PLAYER_START_Y = D_Player.PLAYER_START_Y;
  const PLAYER_START_ELEV = D_Player.PLAYER_START_ELEV;
  const PLAYER_START_ANGLE = D_Player.PLAYER_START_ANGLE;
  const PLAYER_START_WEAPON = D_Player.PLAYER_START_WEAPON;

  window.__import__G_Player = function ()
  {
    return {
      PLAYER_HEIGHT: PLAYER_HEIGHT,
      PLAYER_START_X: PLAYER_START_X,
      PLAYER_START_Y: PLAYER_START_Y,
      PLAYER_START_ELEV: PLAYER_START_ELEV,
      PLAYER_START_ANGLE: PLAYER_START_ANGLE,
      PLAYER_START_WEAPON: PLAYER_START_WEAPON,
    };
  };

})();
