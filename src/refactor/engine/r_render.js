(function ()
{

  const G_Const = __import__G_Const();
  const WORLD_H = G_Const.WORLD_H;
  const MAP_TILE_SIZE = G_Const.MAP_TILE_SIZE;

  const G_Map = __import__G_Map();
  const G_CellLegend = G_Map.G_CellLegend;
  const LEGEND_TYPE_TILE = G_CellLegend.TYPE_TILE;
  const LEGEND_MARGIN_FFT_X = G_CellLegend.MARGIN_FFT_X;
  const LEGEND_MARGIN_FFT_Y = G_CellLegend.MARGIN_FFT_Y;
  const LEGEND_LEN_FFT_X = G_CellLegend.LEN_FFT_X;
  const LEGEND_LEN_FFT_Y = G_CellLegend.LEN_FFT_Y;
  const LEGEND_H_FFT_UPPER = G_CellLegend.H_FFT_UPPER;
  const LEGEND_H_FFT_LOWER = G_CellLegend.H_FFT_LOWER;
  const LEGEND_TEX_FFT_CEIL = G_CellLegend.TEX_FFT_CEIL;
  const LEGEND_TEX_FFT_WALL = G_CellLegend.TEX_FFT_WALL;
  const LEGEND_TEX_FFT_FLOOR = G_CellLegend.TEX_FFT_FLOOR;
  const TYPE_TILE = G_Map.G_TypeTile;
  const G_ReadCellData = G_Map.G_ReadCellData;

  const G_Asset = __import__G_Asset();
  const WALL_TEX_LOOKUP = G_Asset.G_WallTexLookup;
  const CEIL_TEX_LOOKUP = G_Asset.G_CeilTexLookup;
  const FLOOR_TEX_LOOKUP = G_Asset.G_FloorTexLookup;

  const U_AssetManager = __import__U_AssetManager();
  const U_GetTexture = U_AssetManager.U_GetTexture;

  const C_Collision = __import__C_Collision();
  const C_PointVsRect = C_Collision.C_PointVsRect;

  const U_Math = __import__U_Math();
  const U_EucDist = U_Math.U_EucDist;

  const HIT_HORIZ = 1, HIT_VERT = 0, HIT_NONE = undefined;

  const DEPTH_BUFFER = [];

  function R_DepthBufferPush (buffer, data)
  {
    buffer.push(data);
  }

  function R_DepthBufferSort (buffer, sortDesc)
  {
    const currentLen = buffer.length;
    if (currentLen === 1) return buffer;
    const lenHalf = Math.floor(currentLen * 0.5);
    const upper = sort(buffer.slice(0, lenHalf));
    const lower = sort(buffer.slice(lenHalf, currentLen));
    const sorted = [];
    let i = 0, j = 0;
    while (i < upper.length && j < lower.length) {
      const valU = upper[i].pseudoDist_F;
      const valL = lower[j].pseudoDist_F;
      if (sortDesc && (valU >= valL) || !sortDesc && (valU <= valL))
      {
        sorted.push(upper[i]);
        i += 1;
      }
      else
      {
        sorted.push(lower[j]);
        j += 1;
      }
    }
    for (; i < upper.length; i += 1) sorted.push(upper[i]);
    for (; j < lower.length; j += 1) sorted.push(lower[j]);
    return sorted;
  }

  function R_Ray (angle)
  {
    this.x = Math.cos(angle); this.y = Math.sin(angle);
    this.slope = this.y / this.x; this.angle = angle;
  }

  // FIXME: refactor & dissect this function into reasonable sub-routines
  function R_GetFFTData (player, ray, tileX, tileY)
  {
    const playerX = player.x, playerY = player.y;
    // read tile data
    const tMargX = G_ReadCellData(tileX, tileY, LEGEND_MARGIN_FFT_X) * 0.1;
    const tMargY = G_ReadCellData(tileX, tileY, LEGEND_MARGIN_FFT_Y) * 0.1;
    const tLenX = G_ReadCellData(tileX, tileY, LEGEND_LEN_FFT_X) * 0.1;
    const tLenY = G_ReadCellData(tileX, tileY, LEGEND_LEN_FFT_Y) * 0.1;
    const tHUpper = G_ReadCellData(tileX, tileY, LEGEND_H_FFT_UPPER) * 0.1;
    const tHLower = G_ReadCellData(tileX, tileY, LEGEND_H_FFT_LOWER) * 0.1;
    // check for collisions with the 4 edges of the freeform tile
    const intersections = [];
    const collNY = tileY + tMargY;
    const collNX = playerX + (collNY - playerY) / ray.slope;
    const collEX = tileX + tMargX + tLenX;
    const collEY = playerY + (collEX - playerX) * ray.slope;
    const collSY = tileY + tMargY + tLenY;
    const collSX = playerX + (collSY - playerY) / ray.slope;
    const collWX = tileX + tMargX;
    const collWY = playerY + (collWX - playerX) * ray.slope;
    if (collNX >= tileX + tMargX && collNX < tileX + tMargX + tLenX)
      intersections.push([collNX, collNY]);
    if (collEY >= tileY + tMargY && collEY < tileY + tMargY + tLenY)
      intersections.push([collEX, collEY]);
    if (collSX >= tileX + tMargX && collSX < tileX + tMargX + tLenX)
      intersections.push([collSX, collSY]);
    if (collWY >= tileY + tMargY && collWY < tileY + tMargY + tLenY)
      intersections.push([collWX, collWY]);
    // early return if there were no collisions with the tile
    if (intersections.length < 2) return;
    // comparing either one of the direction components will suffice because
    // the sign of the other component will always conform to ray's slope
    const signRayDirX = Math.sign(ray.x);
    const signIntsectX = Math.sign(intersections[0][0] - intersections[1][0]);
    /* sort points of intersection front-to-back:
     * intersections[0] = front-wall intersection
     * intersections[1] = rear-wall intersection
     */
    if (signRayDirX === signIntsectX)
    {
      const aux = intersections[0];
      intersections[0] = intersections[1];
      intersections[1] = aux;
    }
    // is the player directly below/above the freeform tile
    const isInTile = C_PointVsRect(tileX + tMargX, tileY + tMargY, tLenX, tLenY,
                                   playerX, playerY);
    // determine which face of the freeform tile is hit (horizontal or vertical)
    const hitF = intersections[0], hitR = intersections[1];
    let hit = HIT_NONE;
    if (!isInTile)
    {
      hit = hitF[0] === tileX + tMargX || hitF[0] === tileX + tMargX + tLenX
        ? HIT_VERT
        : HIT_HORIZ;
    }
    // calculate distances to edges hit
    const pseudoDist_F = U_EucDist(playerX, playerY, hitF[0], hitF[1],
                                   1, MAP_TILE_SIZE);
    const pseudoDist_R = U_EucDist(playerX, playerY, hitR[0], hitR[1],
                                   1, MAP_TILE_SIZE);
    // determine ceiling, floor & wall textures for the freeform tile
    const texCeil = U_GetTexture(
      CEIL_TEX_LOOKUP[G_ReadCellData(tileX, tileY, LEGEND_TEX_FFT_CEIL)]
    );
    const texWall = U_GetTexture(
      WALL_TEX_LOOKUP[G_ReadCellData(tileX, tileY, LEGEND_TEX_FFT_WALL)]
    );
    const wallTexDim = texWall.dimensions[hit];
    const texFloor = U_GetTexture(
      FLOOR_TEX_LOOKUP[G_ReadCellData(tileX, tileY, LEGEND_TEX_FFT_FLOOR)]
    );
    // calculate the horizontal offset for the sampling of the wall texture
    let offsetLeft;
    switch (hit)
    {
      case HIT_VERT:
        offsetLeft = wallTexDim.offset + wallTexDim.width / tLenY *
          (hitF[0] === tileX + tMargX
            ? hitF[1] - tileY - tMargY
            : tileY + tMargY + tLenY - hitF[1]);
        break;
      case HIT_HORIZ:
        offsetLeft = wallTexDim.offset + wallTexDim.width / tLenX *
          (hitF[0] - tileX - tMargX);
        break;
      default:
        break;
    }

    // TODO: object constructor, maybe??
    return {
      meta: {
        tileX: tileX,
        tileY: tileY,
        playerAngle: player.rotation,
        rayAngle: ray.angle
      },
      type: TYPE_TILE.FREEFORM,
      tyrWall: !isInTile && pseudoDist_F < pseudoDist_R,
      tryFlats: isInTile || pseudoDist_F < pseudoDist_R,
      hUpper: tHUpper * WORLD_H,
      hLower: tHLower * WORLD_H,
      pseudoDist_F: U_ToFixed(pseudoDist_F, 5) || 1,
      pseudoDist_R: U_ToFixed(pseudoDist_R, 5) || 1,
      textures: [texCeil, texWall, texFloor],
      offsetLeft: offsetLeft,
    };
  }

  function R_CastRay ()
  {}

  function R_DrawColumn (player)
  {
    
  }

  function R_RenderPlayerView ()
  {}

  window.__import__R_Render = function ()
  {
    return {
      R_Ray: R_Ray,
      R_CastRay: R_CastRay,
      R_GetFFTData: R_GetFFTData,
    };
  };

})();
