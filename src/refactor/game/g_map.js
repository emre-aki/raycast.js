(function ()
{

  const D_Map = __import__D_Map();
  const N_ROWS = D_Map.D_NRows, N_COLS = D_Map.D_NCols;
  const CELL_LEGEND = D_Map.D_CellLegend;
  const TYPE_TILE = D_Map.D_TypeTile;
  const CELLS = D_Map.D_Cells;

  function G_IsWithinMap (x, y)
  {
    return x >= 0 && x < N_COLS && y >= 0 && y < N_ROWS;
  }

  function G_ReadCell (x, y)
  {
    x |= 0; y |= 0;
    if (G_IsWithinMap(x, y)) return CELLS[N_COLS * y + x];
  }

  function G_ReadCellData (x, y, data)
  {
    x |= 0; y |= 0;
    if (G_IsWithinMap(x, y)) return CELLS[N_COLS * y + x][data];
  }

  function G_WriteCellData (x, y, data, value)
  {
    x |= 0; y |= 0;
    if (G_IsWithinMap(x, y)) CELLS[N_COLS * y + x][data] = value;
  }

  window.__import__G_Map = function ()
  {
    return {
      G_NRows: N_ROWS,
      G_NCols: N_COLS,
      G_CellLegend: CELL_LEGEND,
      G_TypeTile: TYPE_TILE,
      G_Cells: CELLS,
      G_ReadCell: G_ReadCell,
      G_ReadCellData: G_ReadCellData,
      G_WriteCellData: G_WriteCellData,
    };
  };

})();
