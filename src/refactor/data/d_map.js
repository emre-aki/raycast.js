(function ()
{

  // raw map data
  const N_ROWS = 24, N_COLS = 22;
  const CELLS = [
    [1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[1,0,0,4,0,0,1,0,0,0,0,0,0,0,0],[1,0,0,4,0,0,1,0,0,0,0,0,0,0,0],[1,0,0,4,0,0,1,0,0,0,0,0,0,0,0],[1,0,0,4,0,0,1,0,0,0,0,0,0,0,0],[1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],
    [1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[1,0,4,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[1,0,0,0,4,0,1,0,0,0,0,0,0,0,0],[1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[6,0,0,10,10,0,1,0,1,1,0,0,1,1,0],[6,0,0,10,10,0,1,0,1,1,0,0,1,1,0],[1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],
    [1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[6,0,0,10,10,0,1,0,1,1,0,0,1,1,0],[6,0,0,10,10,0,1,0,1,1,0,0,1,1,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[1,0,0,2,2,0,1,0,0,0,0,0,0,0,0],[1,3,3,3,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[6,0,0,10,10,0,1,0,1,1,0,0,1,1,0],[6,0,0,10,10,0,1,0,1,1,0,0,1,1,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],
    [1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[6,0,0,10,10,0,1,0,1,1,0,0,1,1,0],[6,0,0,10,10,0,1,0,1,1,0,0,1,1,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[1,3,3,3,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[6,0,0,10,10,0,1,0,1,1,0,0,1,1,0],[6,0,0,10,10,0,1,0,1,1,0,0,1,1,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],
    [1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[6,0,0,10,10,0,1,0,1,1,0,0,1,1,0],[6,0,0,10,10,0,1,0,1,1,0,0,1,1,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[6,4,0,2,10,0,1,0,1,3,5,0,5,0,1],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[6,0,0,0,0,3,1,0,0,0,0,10,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[6,9,3,1,4,0,1,5,0,2,1,1,0,0,0],[3,0,0,0,0,2,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[6,0,0,10,10,0,1,0,1,1,0,0,1,1,0],[6,0,0,10,10,0,1,0,1,1,0,0,1,1,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],
    [1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[6,0,0,10,10,0,1,0,1,1,0,0,1,1,0],[6,0,0,10,10,0,1,0,1,1,0,0,1,1,0],[6,2,2,6,6,0,1,0,1,3,3,1,3,1,1],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[6,4,0,2,10,0,1,0,1,3,0,5,0,5,1],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[1,3,3,3,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[6,0,0,10,10,0,1,0,1,1,0,0,1,1,0],[6,0,0,10,10,0,1,0,1,1,0,0,1,1,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],
    [1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[6,0,0,10,10,0,1,0,1,1,0,0,1,1,0],[6,0,0,10,10,0,1,0,1,1,0,0,1,1,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[6,0,0,10,10,0,1,0,1,3,0,10,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[1,2,0,0,2,0,1,0,0,0,0,0,0,0,0],[1,3,3,3,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[6,0,0,10,10,0,1,0,1,1,0,0,1,1,0],[6,0,0,10,10,0,1,0,1,1,0,0,1,1,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],
    [1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[6,0,0,10,10,0,1,0,1,1,0,0,1,1,0],[6,0,0,10,10,0,1,0,1,1,0,0,1,1,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[6,0,0,10,10,0,1,0,1,1,0,0,1,1,0],[6,0,0,10,10,0,1,0,1,1,0,0,1,1,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],
    [1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[6,0,0,10,10,0,1,0,1,1,0,0,1,1,0],[6,0,0,10,10,0,1,0,1,1,0,0,1,1,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[6,0,0,10,10,0,0,0,1,0,0,0,4,4,0],[6,0,0,10,10,0,0,0,1,0,0,0,4,4,0],[6,0,0,10,10,0,0,0,1,0,0,0,4,4,0],[6,0,0,10,10,0,0,0,1,0,0,0,4,4,0],[6,0,0,10,10,0,0,0,1,0,0,0,4,4,0],[6,0,0,10,10,0,0,0,1,0,0,0,4,4,0],[6,0,0,10,10,0,0,0,1,0,0,0,4,4,0],[6,0,0,10,10,0,0,0,1,0,0,0,4,4,0],[1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[6,0,0,10,10,0,1,0,1,1,0,0,1,1,0],[6,0,0,10,10,0,1,0,1,1,0,0,1,1,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],
    [1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[6,0,0,10,10,0,1,0,1,1,0,0,1,1,0],[6,0,0,10,10,0,1,0,1,1,0,0,1,1,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[6,0,0,10,10,0,0,0,1,0,0,0,4,4,0],[6,0,0,10,10,0,0,0,1,0,0,0,4,4,0],[6,0,0,10,10,0,0,0,1,0,0,0,4,4,0],[6,0,0,10,10,4,0,8,1,0,0,0,4,4,0],[6,0,0,10,10,0,0,8,1,0,0,0,4,4,0],[6,0,0,10,10,0,0,0,1,0,0,0,4,4,0],[6,0,0,10,10,0,0,0,1,0,0,0,4,4,0],[6,0,0,10,10,0,0,0,1,0,0,0,4,4,0],[1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[6,0,0,10,10,0,1,0,1,1,0,0,1,1,0],[6,0,0,10,10,0,1,0,1,1,0,0,1,1,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],
    [1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[6,0,0,10,10,0,1,0,1,1,0,0,1,1,0],[6,0,0,10,10,0,1,0,1,1,0,0,1,1,0],[6,0,0,10,10,0,1,6,1,1,0,0,2,2,0],[1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[6,0,0,10,10,0,0,0,1,0,0,0,4,4,0],[6,0,0,10,10,0,0,0,1,0,0,0,4,4,0],[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[6,0,0,10,10,4,0,0,0,3,1,1,0,0,0],[6,0,0,10,10,4,0,0,0,3,1,1,0,0,0],[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[6,0,0,10,10,0,0,0,1,0,0,0,4,4,0],[6,0,0,10,10,0,0,0,1,0,0,0,4,4,0],[1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[6,0,0,10,10,0,1,6,1,1,0,0,2,2,0],[6,0,0,10,10,0,1,0,1,1,0,0,1,1,0],[6,0,0,10,10,0,1,0,1,1,0,0,1,1,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],
    [1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[6,0,0,10,10,0,1,0,1,1,0,0,1,1,0],[6,0,0,10,10,0,1,0,1,1,0,0,1,1,0],[6,0,0,10,10,0,1,6,1,1,0,0,2,2,0],[6,0,0,10,10,0,1,6,1,1,0,0,3,3,0],[6,0,0,10,10,0,1,6,1,3,1,1,4,4,0],[6,0,0,10,10,0,0,0,1,0,0,0,4,4,0],[6,0,0,10,10,0,0,8,1,0,0,0,4,4,0],[6,0,0,10,10,4,0,0,0,3,1,1,0,0,0],[0,0,0,0,0,4,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,4,0,0,0,0,0,0,0,0,0],[6,0,0,10,10,4,0,0,0,3,1,1,0,0,0],[6,0,0,10,10,0,0,8,1,0,0,0,4,4,0],[6,0,0,10,10,0,0,0,1,0,0,0,4,4,0],[6,0,0,10,10,0,1,6,1,3,1,1,4,4,0],[6,0,0,10,10,0,1,6,1,1,0,0,3,3,0],[6,0,0,10,10,0,1,6,1,1,0,0,2,2,0],[6,0,0,10,10,0,1,0,1,1,0,0,1,1,0],[6,0,0,10,10,0,1,0,1,1,0,0,1,1,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],
    [1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[6,0,0,10,10,0,1,0,1,1,0,0,1,1,0],[6,0,0,10,10,0,1,0,1,1,0,0,1,1,0],[6,0,0,10,10,0,1,6,1,1,0,0,2,2,0],[6,0,0,10,10,0,1,6,1,1,0,0,3,3,0],[6,0,0,10,10,0,1,6,1,3,1,1,4,4,0],[6,0,0,10,10,0,0,0,1,0,0,0,4,4,0],[6,0,0,10,10,0,0,8,1,0,0,0,4,4,0],[6,0,0,10,10,4,0,0,0,3,1,1,0,0,0],[0,0,0,0,0,4,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,4,0,0,0,0,0,0,0,0,0],[6,0,0,10,10,4,0,0,0,3,1,1,0,0,0],[6,0,0,10,10,0,0,8,1,0,0,0,4,4,0],[6,0,0,10,10,0,0,0,1,0,0,0,4,4,0],[6,0,0,10,10,0,1,6,1,3,1,1,4,4,0],[6,0,0,10,10,0,1,6,1,1,0,0,3,3,0],[6,0,0,10,10,0,1,6,1,1,0,0,2,2,0],[6,0,0,10,10,0,1,0,1,1,0,0,1,1,0],[6,0,0,10,10,0,1,0,1,1,0,0,1,1,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],
    [1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[6,0,0,10,10,0,1,0,1,1,0,0,1,1,0],[6,0,0,10,10,0,1,0,1,1,0,0,1,1,0],[6,0,0,10,10,0,1,6,1,1,0,0,2,2,0],[1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[6,0,0,10,10,0,0,0,1,0,0,0,4,4,0],[6,0,0,10,10,0,0,0,1,0,0,0,4,4,0],[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[6,0,0,10,10,4,0,0,0,3,1,1,0,0,0],[6,0,0,10,10,4,0,0,0,3,1,1,0,0,0],[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[6,0,0,10,10,0,0,0,1,0,0,0,4,4,0],[6,0,0,10,10,0,0,0,1,0,0,0,4,4,0],[1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[6,0,0,10,10,0,1,6,1,1,0,0,2,2,0],[6,0,0,10,10,0,1,0,1,1,0,0,1,1,0],[6,0,0,10,10,0,1,0,1,1,0,0,1,1,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],
    [1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[6,0,0,10,10,0,1,0,1,1,0,0,1,1,0],[6,0,0,10,10,0,1,0,1,1,0,0,1,1,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[6,0,0,10,10,0,0,0,1,0,0,0,4,4,0],[6,0,0,10,10,0,0,0,1,0,0,0,4,4,0],[6,0,0,10,10,0,0,0,1,0,0,0,4,4,0],[6,0,0,10,10,4,0,8,1,0,0,0,4,4,0],[6,0,0,10,10,0,0,8,1,0,0,0,4,4,0],[6,0,0,10,10,0,0,0,1,0,0,0,4,4,0],[6,0,0,10,10,0,0,0,1,0,0,0,4,4,0],[6,0,0,10,10,0,0,0,1,0,0,0,4,4,0],[1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[6,0,0,10,10,0,1,0,1,1,0,0,1,1,0],[6,0,0,10,10,0,1,0,1,1,0,0,1,1,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],
    [1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[6,0,0,10,10,0,1,0,1,1,0,0,1,1,0],[6,0,0,10,10,0,1,0,1,1,0,0,1,1,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[6,0,0,10,10,0,0,0,1,0,0,0,4,4,0],[6,0,0,10,10,0,0,0,1,0,0,0,4,4,0],[6,0,0,10,10,0,0,0,1,0,0,0,4,4,0],[6,0,0,10,10,0,0,0,1,0,0,0,4,4,0],[6,0,0,10,10,0,0,0,1,0,0,0,4,4,0],[6,0,0,10,10,0,0,0,1,0,0,0,4,4,0],[6,0,0,10,10,0,0,0,1,0,0,0,4,4,0],[6,0,0,10,10,0,0,0,1,0,0,0,4,4,0],[1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[6,0,0,10,10,0,1,0,1,1,0,0,1,1,0],[6,0,0,10,10,0,1,0,1,1,0,0,1,1,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],
    [1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[6,0,0,10,10,0,1,0,1,1,0,0,1,1,0],[6,0,0,10,10,0,1,0,1,1,0,0,1,1,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[6,0,0,10,10,0,1,0,1,1,0,0,1,1,0],[6,0,0,10,10,0,1,0,1,1,0,0,1,1,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],
    [1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[6,0,0,10,10,0,1,0,1,1,0,0,1,1,0],[6,0,0,10,10,0,1,0,1,1,0,0,1,1,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[1,3,0,3,3,0,1,0,0,0,0,0,0,0,0],[1,0,2,2,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[6,0,0,10,10,0,1,0,1,1,0,0,1,1,0],[6,0,0,10,10,0,1,0,1,1,0,0,1,1,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],
    [1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[6,0,0,10,10,0,1,0,1,1,0,0,1,1,0],[6,0,0,10,10,0,1,0,1,1,0,0,1,1,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[1,3,0,2,3,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[6,0,0,10,10,0,1,0,1,1,0,0,1,1,0],[6,0,0,10,10,0,1,0,1,1,0,0,1,1,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],
    [1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[6,0,0,10,10,0,1,0,1,1,0,0,1,1,0],[6,0,0,10,10,0,1,0,1,1,0,0,1,1,0],[6,9,3,1,4,0,1,5,0,2,1,1,0,0,0],[3,0,0,0,0,2,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[6,0,0,10,10,0,1,0,1,1,0,0,1,1,0],[6,0,0,10,10,0,1,0,1,1,0,0,1,1,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],
    [1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[6,0,8,10,2,0,1,0,0,2,1,1,3,3,0],[6,0,8,2,2,0,1,0,0,2,1,1,3,3,0],[6,0,0,10,10,0,1,0,1,1,0,0,1,1,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[1,2,0,3,3,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[6,0,0,10,10,0,1,0,1,1,0,0,1,1,0],[6,0,0,10,10,0,1,0,1,1,0,0,1,1,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],
    [1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[6,2,2,6,6,0,1,7,0,2,2,2,6,6,0],[6,0,0,2,10,0,1,0,0,2,1,1,3,3,0],[6,0,0,10,10,0,1,0,1,1,0,0,1,1,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[1,3,0,3,3,0,1,0,0,0,0,0,0,0,0],[1,2,2,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[6,0,0,10,10,0,1,0,1,1,0,0,1,1,0],[6,0,0,10,10,0,1,0,1,1,0,0,1,1,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],
    [1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[1,0,4,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[6,0,0,0,0,0,1,0,0,0,1,10,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[1,0,0,0,4,0,1,0,0,0,0,0,0,0,0],[1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],
    [1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[1,4,0,0,0,0,1,0,0,0,0,0,0,0,0],[1,4,0,0,0,0,1,0,0,0,0,0,0,0,0],[1,4,0,0,0,0,1,0,0,0,0,0,0,0,0],[1,4,0,0,0,0,1,0,0,0,0,0,0,0,0],[1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],[1,0,0,0,0,0,1,0,0,0,0,0,0,0,0],
  ];

  function D_CellLegend ()
  {
    return {
      LENGTH: 12,
      LENGTH: 15,
      TYPE_TILE: 0,
      TEX_WALL_N: 1,
      TEX_WALL_E: 2,
      TEX_WALL_S: 3,
      TEX_WALL_W: 4,
      TEX_G_FLOOR: 5,
      TEX_G_CEIL: 6,
      TEX_FFT_WALL: 7,
      TEX_FFT_FLOOR: 8,
      TEX_FFT_CEIL: 9,
      FACE_DIAG: 7,
      WOTYPE: 10,
      WOH: 11,
      MARGIN_FFT_X: 1,
      MARGIN_FFT_Y: 2,
      LEN_FFT_X: 3,
      LEN_FFT_Y: 4,
      H_FFT_UPPER_SLOPE_START: 10,
      H_FFT_UPPER_SLOPE_END: 11,
      H_FFT_LOWER_SLOPE_START: 12,
      H_FFT_LOWER_SLOPE_END: 13,
      FFT_SLOPE_DIR: 14
    };
  }

  function D_TypeTile ()
  {
    return {
      FREE: 0,
      WALL: 1,
      WALL_DIAG: 2,
      V_DOOR: 3,
      H_DOOR: 4,
      THING: 5,
      FREEFORM: 6,
    };
  }

  window.__import__D_Map = function ()
  {
    return {
      D_NRows: N_ROWS,
      D_NCols: N_COLS,
      D_CellLegend: D_CellLegend(),
      D_TypeTile: D_TypeTile(),
      D_Cells: CELLS, // TODO: should be im/mutable??
    };
  };

})();