(function ()
{

  const G_Const = __import__G_Const();
  const MARGIN_TO_WALL = G_Const.MARGIN_TO_WALL;
  const KNEE_HEIGHT = G_Const.KNEE_HEIGHT;
  const WALKING_APEX = G_Const.WALKING_APEX;
  const WORLD_H = G_Const.WORLD_H;

  const G_Map = __import__G_Map();
  const G_CellLegend = G_Map.G_CellLegend;
  const G_NCols = G_Map.G_NCols, G_NRows = G_Map.G_NRows;
  const G_ReadCell = G_Map.G_ReadCell;
  const G_ReadCellData = G_Map.G_ReadCellData;
  const TYPE_TILE = G_Map.G_TypeTile;
  const IDX_TYPE_TILE = G_Map.G_CellLegend.TYPE_TILE;

  const G_Player = __import__G_Player();
  const PLAYER_HEIGHT = G_Player.PLAYER_HEIGHT;

  const U_Math = __import__U_Math(); ;
  const CLOCKWISE = U_Math.U_V_Clockwise;
  const U_EucDist = U_Math.U_EucDist;
  const U_ToFixed = U_Math.U_ToFixed
  const U_Vec2dCross = U_Math.U_Vec2dCross;
  const U_Clamp = U_Math.U_Clamp;

  const M_GetDoor = __import__M_Door().M_GetDoor;

  const OFFSET_DIAG_WALLS = [ [[0, 1], [1, 0]],   // #/
                              [[0, 0], [1, 1]],   // \#
                              [[1, 0], [0, 1]],   // /#
                              [[1, 1], [0, 0]] ]; // #\

  function C_IsPointOnLeft (x0, y0, x1, y1, x, y)
  {
    return U_ToFixed((x1 - x0) * (y - y0) - (y1 - y0) * (x - x0), 5) < 0;
  }

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

  function C_PointVsTileHeight (x, y, tx, ty, tw, th)
  {
    /* */
    const tile = G_ReadCell(tx, ty);
    if (tile[G_CellLegend.TYPE_TILE] !== TYPE_TILE.FREEFORM) return [0, 0];
    /* */
    const H_MAX_WORLD_10 = WORLD_H * 0.1;
    const isVerticalSlope = tile[G_CellLegend.FFT_SLOPE_DIR];
    const floorStart = tile[G_CellLegend.H_FFT_LOWER_SLOPE_START];
    const floorEnd = tile[G_CellLegend.H_FFT_LOWER_SLOPE_END];
    const deltaFloor = floorEnd - floorStart;
    const ceilStart = tile[G_CellLegend.H_FFT_UPPER_SLOPE_START];
    const ceilEnd = tile[G_CellLegend.H_FFT_UPPER_SLOPE_END];
    const deltaCeil = ceilEnd - ceilStart;
    const offset = isVerticalSlope
      ? U_Clamp((y - ty) / th, 0, 1)
      : U_Clamp((x - tx) / tw, 0, 1);
    return [(floorStart + offset * deltaFloor) * H_MAX_WORLD_10,
            (ceilStart + offset * deltaCeil) * H_MAX_WORLD_10];
  }

  function C_RectVsRect (x0, y0, w0, h0, x1, y1, w1, h1)
  {
    /* TODO: could there have been a better way so that we could avoid
     * `toFixedNum`ing every step of the way?
     */
    const X0 = U_ToFixed(x0, 5), Y0 = U_ToFixed(y0, 5);
    const X1 = U_ToFixed(x1, 5), Y1 = U_ToFixed(y1, 5);
    return X1 < X0 + w0 && X0 < X1 + w1 && Y1 < Y0 + h0 && Y0 < Y1 + h1;
  }

  function C_RectVsMapHeight (x, y, w, h)
  {
    /* */
    let maxHeight = 0;
    for (let i = 0; i < 4; ++i)
    {
      const vx = x + ((CLOCKWISE[i] & 1) ? w : 0);
      const vy = y + ((CLOCKWISE[i] & 2) ? h : 0);
      /* */
      const tx = Math.floor(vx), ty = Math.floor(vy);
      const tile = G_ReadCell(tx, ty);
      //
      if (tile[G_CellLegend.TYPE_TILE] !== TYPE_TILE.FREEFORM) continue;
      /* */
      const tX = tx + tile[G_CellLegend.MARGIN_FFT_X] * 0.1;
      const tY = ty + tile[G_CellLegend.MARGIN_FFT_Y] * 0.1;
      const tW = tile[G_CellLegend.LEN_FFT_X] * 0.1;
      const tH = tile[G_CellLegend.LEN_FFT_Y] * 0.1;
      if (!C_RectVsRect(x, y, w, h, tX, tY, tW, tH)) continue;
      /* */
      const height = C_PointVsTileHeight(vx, vy, tX, tY, tW, tH)[0];
      maxHeight = Math.max(height, maxHeight);
    }
    return maxHeight;
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

  function C_VectorVsMap (px, py, sx, sy, dx, dy, feet)
  {
    /* calculate the properties for the movement ray */
    const deltaX = dx - sx, deltaY = dy - sy;
    const rayDirX = Math.sign(deltaX), rayDirY = Math.sign(deltaY);
    const raySlope = deltaY / deltaX, raySlope_ = deltaX / deltaY;
    // start casting the movement ray from the starting position
    let hitX = sx, hitY = sy;
    let tileX = Math.floor(hitX), tileY = Math.floor(hitY);
    /* vertical & horizontal tracers:
     * iterate over vertical and horizontal grid lines that intersect
     * with the movement ray
     */
    let vTraceX = rayDirX > 0 ? Math.floor(sx + 1) : tileX;
    let vTraceY = sy + (vTraceX - sx) * raySlope;
    let hTraceY = rayDirY > 0 ? Math.floor(sy + 1) : tileY;
    let hTraceX = sx + (hTraceY - sy) * raySlope_;
    /* how much each tracer will advance at each iteration */
    const vStepX = rayDirX, vStepY = vStepX * raySlope;
    const hStepY = rayDirY, hStepX = hStepY * raySlope_;
    let distCovered = 0; // the distance covered by the "closer" tracer
    let hitSolid = 0; // whether we hit a solid geometry or not
    let isVerticalHit;
    // how much distance the step the player took will cover
    const distanceToCover = U_EucDist(sx, sy, dx, dy, 1);
    /* the tile data we are currently inspecting */
    let tile = G_ReadCell(tileX, tileY);
    let typeTile = tile[G_CellLegend.TYPE_TILE];
    while (!hitSolid && distCovered < distanceToCover &&
           C_PointVsRect(-1, -1, G_NCols + 1, G_NRows + 1, tileX, tileY))
    {
      hitSolid = C_IsBlockingCell(tileX, tileY) ? 1 : 0;
      if (typeTile === TYPE_TILE.WALL_DIAG)
      {
        const dOffsets = OFFSET_DIAG_WALLS[tile[G_CellLegend.FACE_DIAG]];
        const x0 = tileX + dOffsets[0][0], y0 = tileY + dOffsets[0][1];
        const x1 = tileX + dOffsets[1][0], y1 = tileY + dOffsets[1][1];
        /* check all 4 vertices of the player AABB against collisions with
         * the diagonal wall when moving towards the goal
         */
        let iGX, iGY, distTrespassEarlistHit;
        for (let i = 0; i < 4; ++i)
        {
          const offsetX = MARGIN_TO_WALL * ((CLOCKWISE[i] & 1) ? 1 : -1);
          const offsetY = MARGIN_TO_WALL * ((CLOCKWISE[i] & 2) ? 1 : -1);
          const iDX = px + deltaX + offsetX, iDY = py + deltaY + offsetY;
          const isDInside = C_IsPointOnLeft(x0, y0, x1, y1, iDX, iDY);
          /* is the player attempting to clip through the diagonal wall? */
          if (isDInside)
          {
            const iSX = iDX - deltaX, iSY = iDY - deltaY;
            const isect = C_LineVsLine(x0, y0, x1, y1, iSX, iSY, iDX, iDY);
            /* FIXME: do not skip resolving, maybe, come up with a better
             * resolution approach??
             */
            // if the movement vector and the diagonal wall are parallel
            if (!isect) continue;
            const isectX = isect[0], isectY = isect[1];
            // how far did the current vertex clipped through (trespassed)
            // the diagonal wall
            const distTrespass = U_EucDist(isectX, isectY, iDX, iDY);
            /* we need to resolve the collision for the vertex that had
             * clipped the farthest through the diagonal wall, as the
             * farther a vertex has trespassed the diagonal wall, the
             * earlier it must have collided with it
             */
            if ((distTrespassEarlistHit || 0) < distTrespass)
            {
              distTrespassEarlistHit = distTrespass;
              hitX = isectX; hitY = isectY;
              iGX = iDX; iGY = iDY;
            }
          }
        }
        /* if a valid collision has been found, calculate the normal
         * on the surface of the diagonal wall, and return immediately
         */
        if (distTrespassEarlistHit)
          // TODO: generalize for other rotations of non-axis-aligned walls
          return [Math.SQRT1_2 * (y0 - y1), Math.SQRT1_2 * (x1 - x0),
                  hitX, hitY, iGX, iGY];
        // no collisions has been found, continue with the ray-casting
        hitSolid = 0;
      }
      else if (typeTile === TYPE_TILE.FREEFORM)
      {
        /* calculate the "virtual" bounds of the free-form tile */
        const tX = tileX + tile[G_CellLegend.MARGIN_FFT_X] * 0.1 - MARGIN_TO_WALL;
        const tY = tileY + tile[G_CellLegend.MARGIN_FFT_Y] * 0.1 - MARGIN_TO_WALL;
        const tW = tile[G_CellLegend.LEN_FFT_X] * 0.1 + 2 * MARGIN_TO_WALL;
        const tH = tile[G_CellLegend.LEN_FFT_Y] * 0.1 + 2 * MARGIN_TO_WALL;
        /* is the player (potentially) attempting to clip through the
         * free-form tile?
         */
        const gx = px + deltaX, gy = py + deltaY;
        let isXTrespassing, isYTrespassing;
        if (rayDirX > 0) isXTrespassing = gx > tX;
        else if (rayDirX < 0) isXTrespassing = gx < tX + tW;
        else isXTrespassing = gx > tX && gx < tX + tW;
        if (rayDirY > 0) isYTrespassing = gy > tY;
        else if (rayDirY < 0) isYTrespassing = gy < tY + tH;
        else isYTrespassing = gy > tY && gy < tY + tH;
        /* */
        if (isXTrespassing && isYTrespassing)
        {
          /* */
          let vX, vSY, vEY;
          if (rayDirX > 0) { vX = tX; vSY = tY; vEY = tY + tH; }
          else if (rayDirX < 0) { vX = tX + tW; vSY = tY + tH; vEY = tY; }
          /* */
          let hSX, hEX, hY;
          if (rayDirY > 0) { hSX = tX + tW; hEX = tX; hY = tY; }
          else if (rayDirY < 0) { hSX = tX; hEX = tX + tW; hY = tY + tH; }
          /* */
          let horizontalHit, verticalHit, fftHit, isVerticalFFTHit = 0;
          if (rayDirX)
            verticalHit = C_LineVsLine(vX, vSY, vX, vEY,
                                       px, py, gx, gy, 1);
          if (rayDirY)
            horizontalHit = C_LineVsLine(hSX, hY, hEX, hY,
                                         px, py, gx, gy, 1);
          /* corner case */
          if (verticalHit && horizontalHit)
          {
            // FIXME: `C_IsBlockingCell` may not cut it here unless the tile
            // being tested against is a solid tile
            if (C_IsBlockingCell(px + rayDirX, py))
            {
              fftHit = verticalHit;
              isVerticalFFTHit = 1;
            }
            else
              fftHit = horizontalHit;
          }
          else if (verticalHit)
          {
            fftHit = verticalHit;
            isVerticalFFTHit = 1;
          }
          else if (horizontalHit)
            fftHit = horizontalHit;
          /* */
          if (fftHit)
          {
            // const adjX = vX + rayDirX * MARGIN_TO_WALL;
            // const adjY = hY + rayDirY * MARGIN_TO_WALL;
            // fftHit = isVerticalFFTHit
            //   ? C_LineVsLine(sx, sy, dx, dy, adjX, vSY, adjX, vEY)
            //   : C_LineVsLine(sx, sy, dx, dy, hSX, adjY, hEX, adjY);
            const heights = C_PointVsTileHeight(fftHit[0], fftHit[1],
                                                tX + MARGIN_TO_WALL,
                                                tY + MARGIN_TO_WALL,
                                                tW - 2 * MARGIN_TO_WALL,
                                                tH - 2 * MARGIN_TO_WALL);
            const yFloor = heights[0];
            const yCeil = WORLD_H - heights[1];
            /* */
            if (yFloor - feet > KNEE_HEIGHT ||
                PLAYER_HEIGHT + WALKING_APEX > yCeil - yFloor)
              return isVerticalFFTHit
                ? [-rayDirX, 0, fftHit[0], fftHit[1], gx, gy]
                : [0, -rayDirY, fftHit[0], fftHit[1], gx, gy];
                // ? [-rayDirX, 0, fftHit[0], fftHit[1]]
                // : [0, -rayDirY, fftHit[0], fftHit[1]];
          }
        }
        // no collisions has been found, continue with the ray-casting
        hitSolid = 0;
      }
      /* advance tracers unless a solid geometry has been already hit */
      if (!hitSolid)
      {
        /* calculate the distances covered on the ray by each tracer */
        const vDist = U_EucDist(sx, sy, vTraceX, vTraceY, 1);
        const hDist = U_EucDist(sx, sy, hTraceX, hTraceY, 1);
        /* determine whether the hit is on the vertical axis */
        isVerticalHit = Number.isNaN(vDist) || vDist > hDist
          ? 0
          : vDist === hDist ? isVerticalHit : 1;
        distCovered = isVerticalHit ? vDist : hDist;
        if (isVerticalHit)
        {
          hitX = vTraceX; hitY = vTraceY; // hit by vertical tracer
          vTraceX += vStepX; vTraceY += vStepY; // advance the tracer
          tileX += rayDirX; // advance vertically to the next tile
        }
        else
        {
          hitX = hTraceX; hitY = hTraceY; // hit by horizontal tracer
          hTraceX += hStepX; hTraceY += hStepY; // advance the tracer
          tileY += rayDirY; // advance horizontally to the next tile
        }
        tile = G_ReadCell(tileX, tileY);
        typeTile = tile[G_CellLegend.TYPE_TILE];
      }
    }
    if (!hitSolid) return; // early return if there was no collision
    /* the ray hit a solid wall, calculate the unit normal of the
     * collided geometry
     */
    let normalX = 0, normalY = 0;
    const testX = U_ToFixed(hitX, 5), testY = U_ToFixed(hitY, 5);
    const isHitOnVertical = (testX === tileX || testX === tileX + 1) &&
                            (px - testX) * rayDirX <= 0;
    const isHitOnHorizontal = (testY === tileY || testY === tileY + 1) &&
                              (py - testY) * rayDirY <= 0;
    if (isHitOnVertical && rayDirX)
    {
      /* CORNER CASE: if the movement vector collides with a corner of the
       * tile, resolve the collision against the other axis of the
       * movement vector unless that would cause another collision
       */
      // FIXME: `C_IsBlockingCell` may not cut it here unless the tile
      // being tested against is a solid tile
      if (isHitOnHorizontal && !C_IsBlockingCell(px + rayDirX, py))
        normalY -= rayDirY;
      // EDGE CASE: resolve collision against the vertical edge of the
      // tile that has been hit
      else normalX -= rayDirX;
    }
    else if (isHitOnHorizontal && rayDirY)
    {
      /* CORNER CASE: the same as above */
      // FIXME: `C_IsBlockingCell` may not cut it here unless the tile
      // being tested against is a solid tile
      if (isHitOnVertical && !C_IsBlockingCell(px, py + rayDirY))
        normalX -= rayDirX;
      // EDGE CASE: resolve collision against the horizontal edge of the
      // tile that has been hit
      else normalY -= rayDirY;
    }
    // return `undefined` if the normal vector is of zero length, as that
    // means there's actually no collisions to resolve
    if (!(normalX || normalY)) return;
    return [normalX, normalY, testX, testY];
  }

  window.__import__C_Collision = function ()
  {
    return {
      C_IsBlockingCell: C_IsBlockingCell,
      C_IsPointOnLeft: C_IsPointOnLeft,
      C_LineVsLine: C_LineVsLine,
      C_PointVsRect: C_PointVsRect,
      C_PointVsPoly: C_PointVsPoly,
      C_RectVsRect: C_RectVsRect,
      C_RectVsMapHeight: C_RectVsMapHeight,
      C_VectorVsMap: C_VectorVsMap,
    };
  };

})();
