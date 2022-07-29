(function ()
{

  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");

  let canvasW, canvasH;
  let buffer;

  function I_GetBuffer ()
  {
    return buffer;
  }

  function I_FlushBuffer ()
  {
    ctx.putImageData(buffer, 0, 0);
  }

  function I_InitBuffer (w, h)
  {
    canvasW = w; canvasH = h;
    canvas.width = canvasW; canvas.height = canvasH;
    buffer = ctx.getImageData(0, 0, canvasW, canvasH);
    return buffer;
  }

  function I_ClearBuffer ()
  {
    ctx.clearRect(0, 0, canvasW, canvasH);
    return I_InitBuffer(canvasW, canvasH);
  }

  window.__import__I_Canvas = function ()
  {
    return {
      I_CanvasElement: canvas,
      I_Ctx: ctx,
      I_GetBuffer: I_GetBuffer,
      I_FlushBuffer: I_FlushBuffer,
      I_InitBuffer: I_InitBuffer,
      I_ClearBuffer: I_ClearBuffer,
    };
  };

})();
