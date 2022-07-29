(function() {

  const WEAPON = __import__D_Weapon();

  const PLAYER_HEIGHT = 120;
  const PLAYER_START_X = 4.5   // 2
  const PLAYER_START_Y = 19.5; // 12
  const PLAYER_START_ELEV = 200;
  const PLAYER_START_ANGLE = 0;
  const PLAYER_START_WEAPON = WEAPON.SHOTGUN;

  window.__import__D_Player = function ()
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
