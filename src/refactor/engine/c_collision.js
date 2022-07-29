(function ()
{

  const G_Map = __import__G_Map();
  const TYPE_TILE = G_Map.G_TypeTile;
  const IDX_TYPE_TILE = G_Map.G_CellLegend.TYPE_TILE;

  const G_ReadCellData = __import__G_Map().G_ReadCellData;

  const MARGIN_TO_WALL = __import__G_Const().MARGIN_TO_WALL;

  const U_Math = __import__U_Math();
  const U_ToFixed = U_Math.U_ToFixed;
  const U_Vec2dCross = U_Math.U_Vec2dCross;

  const M_GetDoor = __import__M_Door().M_GetDoor;

  // TODO: vector struct??
  function C_LineVsLine (l0x0, l0y0, l0x1, l0y1, l1x0, l1y0, l1x1, l1y1, isSeg)
  {
    const vX = l0x1 - l0x0, vY = l0y1 - l0y0;
    const uX = l1x1 - l1x0, uY = l1y1 - l1y0
    const denom = U_Vec2dCross(vX, vY, uX, uY);
    const numerX = l1x0 - l0x0, numerY = l1y0 - l0y0;
    const X = U_Vec2dCross(numerX, numerY, uX, uY) / denom;
    if (isSeg)
    {
        const Y = U_Vec2dCross(numerX, numerY, vX, vY) / denom;
        // if given vectors l0 and l1 are line segments, their intersection
        // parameters X and Y must be within the range [0, 1], that is,
        // the point of intersection must be sitting on both line segments
        if (X < 0 || X > 1 || Y < 0 || Y > 1) return;
    }
    return [l0x0 + X * vX, l0y0 + X * vY];
  }

  function C_PointVsRect (xr, yr, w, h, x, y)
  {
    return x >= xr && x < xr + w && y >= yr && y < yr + h;
  }

  function C_PointVsPoly (x, y, linedefs) // NOTE: unused
  {
    const nLines = linedefs.length;
    let nColls = 0;
    for (let i = 0; i < nLines; i += 1)
    {
      const v = linedefs[i][0], u = linedefs[i][1];
      const x0 = v[0], y0 = v[1], x1 = u[0], y1 = u[1];
      const colln = C_LineVsLine(x, y, 0, y, x0, y0, x1, y1, 1);
      if (
        // if the ray intersects with an edge of the polygon
        colln && isFinite(colln[0]) && (
          // if the intersection is on either one of the vertices of the
          // polygon edge, the other vertex of the edge should be situated
          // below the ray
          colln[0] === x0 && colln[1] === y0 && y0 < y1
          || colln[0] === x1 && colln[1] === y1 && y0 > y1
          // if the intersection is on neither one of the vertices of the
          // polygon edge
          || (colln[0] !== x0 || colln[1] !== y0)
              && (colln[0] !== x1 || colln[1] !== y1)
        )
      ) nColls += 1;
    }
    return nColls % 2 > 0;
  }

  function C_IsBlockingCell (x, y)
  {
    const X = Math.floor(x), Y = Math.floor(y);
    const typeCell = G_ReadCellData(X, Y, IDX_TYPE_TILE);
    return typeCell === TYPE_TILE.WALL
      || typeCell === TYPE_TILE.WALL_DIAG
      || typeCell === TYPE_TILE.THING
      || (typeCell === TYPE_TILE.V_DOOR || typeCell === TYPE_TILE.H_DOOR)
          && M_GetDoor(X, Y).state;
  }

  function C_PlayerAABBVsMap (playerX, playerY, pace, movingAlongX)
  {
    const PACE = U_ToFixed(pace, 5);
    const DIR = Math.sign(PACE);
    // if the movement is along the x-axis
    if (PACE && movingAlongX)
    {
      const newX = playerX + PACE;
      const vX = newX + MARGIN_TO_WALL * DIR;
      const vNorth = U_ToFixed(playerY - MARGIN_TO_WALL, 5);
      const vSouth = U_ToFixed(playerY + MARGIN_TO_WALL, 5);
      const northBlocked = C_IsBlockingCell(vX, vNorth);
      const southBlocked = C_IsBlockingCell(vX, vSouth);
      const southEdgeTouching = Math.floor(vSouth) === vSouth;
      // a collision must have occurred if either the northern or the
      // the non-touching southern edge of the player bounding-box
      // is blocked
      if (northBlocked || southBlocked && !southEdgeTouching)
        return Math.floor(vX);
    }
    // if the movement is along the y-axis
    else if (PACE)
    {
      const newY = playerY + PACE;
      const vY = newY + MARGIN_TO_WALL * DIR;
      const vWest = U_ToFixed(playerX - MARGIN_TO_WALL, 5);
      const vEast = U_ToFixed(playerX + MARGIN_TO_WALL, 5);
      const westBlocked = C_IsBlockingCell(vWest, vY);
      const eastBlocked = C_IsBlockingCell(vEast, vY);
      const eastEdgeTouching = Math.floor(vEast) === vEast;
      // a collision must have occurred if either the western or the
      // the non-touching eastern edge of the player bounding-box
      // is blocked
      if (westBlocked || eastBlocked && !eastEdgeTouching)
        return Math.floor(vY);
    }
  }

  window.__import__C_Collision = function ()
  {
    return {
      C_LineVsLine: C_LineVsLine,
      C_PointVsRect: C_PointVsRect,
      C_PointVsPoly: C_PointVsPoly,
      C_IsBlockingCell: C_IsBlockingCell,
      C_PlayerAABBVsMap: C_PlayerAABBVsMap,
    };
  };

})();
