(function ()
{

  const G_Map = __import__G_Map();
  const N_COLS = G_Map.G_NCols, N_ROWS = G_Map.G_NRows;
  const IDX_TYPE_TILE = G_Map.G_CellLegend.TYPE_TILE;
  const TYPE_TILE = G_Map.G_TypeTile;

  const G_ReadCellData = __import__G_Map().G_ReadCellData;

  const U_StartAnimation = __import__U_Animate().U_StartAnimation;

  const G_Const = __import__G_Const();
  const DOOR_ANIM_INTERVAL = G_Const.DOOR_ANIM_INTERVAL;
  const DOOR_RESET_DELAY = G_Const.DOOR_RESET_DELAY;

  const DOOR_CLOSED = 10, DOOR_OPEN = 0;

  // state: 0=open, 10=closed
  function M_Door (x, y, state, animating, timeout)
  {
    this.x = x; this.y = y;
    this.state = state; this.animating = animating;
    this.timeout = timeout;
  }

  const DOORS = {};

  function M_CoordToDoorKey (x, y)
  {
    return Math.floor(x) + "_" + Math.floor(y);
  }

  function M_InitDoors ()
  {
    for (let y = 0; y < N_ROWS; y += 1)
    {
      for (let x = 0; x < N_COLS; x += 1)
      {
        const typeTile = G_ReadCellData(x, y, IDX_TYPE_TILE);
        if (typeTile === TYPE_TILE.V_DOOR || typeTile === TYPE_TILE.H_DOOR)
          DOORS[M_CoordToDoorKey(x, y)] = new M_Door(x, y, 10, 0);
      }
    }
  }

  function M_GetDoor (x, y) // TODO: im/mutable??
  {
    return DOORS[M_CoordToDoorKey(x, y)];
  }

  function M_TryCloseDoor (player)
  {
    const door = this;
    const playerX = player.x, playerY = player.y;
    if (Math.floor(playerX) !== door.x || Math.floor(playerY) !== door.y)
      M_AnimateDoor(player, door);
    else
    {
      clearTimeout(door.timeout);
      door.timeout = setTimeout(M_TryCloseDoor.bind(door, getPlayerPos),
                                DOOR_RESET_DELAY);
    }
  }

  function M_AnimateDoor (player, door)
  {
    if (!door.animating)
    {
      door.animating = 1;
      let reverse = door.state > DOOR_OPEN ? 0 : 1;
      U_StartAnimation(
         // onFrame
        function ()
        {
          door.state += (reverse ? 1 : 0 - 1);
        },
        DOOR_ANIM_INTERVAL,
        // shouldEnd
        function()
        {
          return (reverse && door.state === DOOR_CLOSED)
            || (reverse === 0 && door.state === DOOR_OPEN);
        },
        // onEnd
        function()
        {
          door.animating = 0;
          if (door.state === DOOR_OPEN)
          {
            door.timeout = setTimeout(M_TryCloseDoor.bind(door, player),
                                      DOOR_RESET_DELAY);
          }
          else
          {
            clearTimeout(door.timeout);
            door.timeout = undefined;
          }
        }
      );
    }
  }

  window.__import__M_Door = function ()
  {
    return {
      M_InitDoors: M_InitDoors,
      M_GetDoor: M_GetDoor,
      M_AnimateDoor: M_AnimateDoor,
    };
  };

})();
