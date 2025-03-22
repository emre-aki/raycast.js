(function ()
{

  const I_Canvas = __import__I_Canvas();
  // FIXME: remove I_Ctx and move primitive functions that requires access to
  // the drawing context in the canvas frontend
  const I_Ctx = I_Canvas.I_Ctx;
  const I_InitBuffer = I_Canvas.I_InitBuffer;
  const I_ClearBuffer = I_Canvas.I_ClearBuffer;
  const I_FlushBuffer = I_Canvas.I_FlushBuffer;

  const U_Math = __import__U_Math();
  const U_ToDegrees = U_Math.U_ToDegrees;
  const U_ToFixed = U_Math.U_ToFixed;

  const MAP_TILE_SIZE = __import__G_Const().MAP_TILE_SIZE;

  let bufferW, bufferH;
  let buffer;

  function R_GetBuffer ()
  {
    return buffer;
  }

  function R_FlushBuffer ()
  {
    I_FlushBuffer();
    // TODO: maybe clear after flushing?
  }

  function R_ClearBuffer ()
  {
    buffer = I_ClearBuffer();
  }

  function R_InitBuffer (w, h)
  {
    bufferW = w; bufferH = h;
    buffer = I_InitBuffer(w, h);
  }

  function R_Print (text, x, y, options)
  {
    const _options = options || {};
    I_Ctx.font = (_options.style ? _options.style + " " : "") +
               (isNaN(_options.size) ? 10 : _options.size).toString() + "px " +
               (_options.family ? _options.family : "Courier");
    I_Ctx.fillStyle = _options.color || "#000000";
    I_Ctx.fillText(text, x, y);
  }

  function R_DebugStats (player, deltaT)
  {
    R_Print("pos: <" + Math.floor(player.x) + ", " + Math.floor(player.y) +
              ", " + U_ToFixed(player.feet / MAP_TILE_SIZE, 1) + ">" +
            " | rot: " + Math.round(U_ToDegrees(player.rotation)) + " deg" +
            " | fps: " + Math.round(1000 / deltaT), 5, 15,
            { size: 14, color: "#FF0000" });
  }

  function R_FillRect (x, y, w, h, color)
  {
    const BUFFER = buffer.data;
    const X = Math.floor(x), Y = Math.floor(y);
    const W = Math.ceil(w), H = Math.ceil(h);
    const startX = Math.max(X, 0), startY = Math.max(Y, 0);
    const endX = Math.min(X + W, bufferW), endY = Math.min(Y + H, bufferH);
    const red = color[0], green = color[1];
    const blue = color[2], alpha = color[3];
    for (let c = startX; c < endX; c += 1)
    {
      for (let r = startY; r < endY; r += 1)
      {
        const offPx = 4 * (bufferW * r + c);
        const pixRed = BUFFER[offPx], pixGreen = BUFFER[offPx + 1];
        const pixBlue = BUFFER[offPx + 2], pixAlpha = BUFFER[offPx + 3] || 255;
        const rBlend = alpha / pixAlpha, rBlend_ = 1 - rBlend;
        const newRed = red * rBlend + pixRed * rBlend_;
        const newGreen = green * rBlend + pixGreen * rBlend_;
        const newBlue = blue * rBlend + pixBlue * rBlend_;
        BUFFER[offPx] = newRed; BUFFER[offPx + 1] = newGreen;
        BUFFER[offPx + 2] = newBlue; BUFFER[offPx + 3] = 255;
      }
    }
  }

  function R_FillRectAdHoc (dx, dy, dw, dh, color)
  {
    I_Ctx.fillStyle = color || "#000000";
    I_Ctx.fillRect(dx, dy, dw, dh);
  }

  function R_DrawImage (imgData, sx, sy, sw, sh, dx, dy, dw, dh,
                        options)
  {
    const BUFFER = buffer.data;
    const imgBmp = imgData.bitmap, imgW = imgData.width, imgH = imgData.height;
    // early return if either source or destination is out of bounds
    if (sx + sw <= 0 || sy + sh <= 0 || sx >= imgW || sy >= imgH
        || dx + dw <= 0 || dy + dh <= 0 || dx >= bufferW || dy >= bufferH)
      return;
    // determine lightlevel and opacity
    const shade = options && options.shade ? options.shade : 0;
    const lightLvl = 1 - shade;
    const opacity = options && options.alpha ? options.alpha : 1;
    // calculate source & destination coordinates & the scaling factor
    const SX = Math.floor(sx), SY = Math.floor(sy);
    const SW = Math.ceil(sw), SH = Math.ceil(sh);
    const DX = Math.floor(dx), DY = Math.floor(dy);
    const DW = Math.ceil(dw), DH = Math.ceil(dh);
    const scaleX = DW / SW, scaleY = DH / SH;
    // clip image from top and left
    const dClipW = Math.max(0 - DX, 0), dClipH = Math.max(0 - DY, 0);
    const dClippedW = DW - dClipW, dClippedH = DH - dClipH;
    const sClipW = Math.floor(dClipW / scaleX);
    const sClipH = Math.floor(dClipH / scaleY);
    // calculate starting coordinates and dimensions for source & destination
    const sStartX = SX + sClipW, dStartX = DX + dClipW;
    const sStartY = SY + sClipH, dStartY = DY + dClipH;
    const dW = dClippedW, dH = dClippedH;
    // draw scaled image
    let sX = sStartX, dX = dStartX, drawCol = scaleX - dClipW % scaleX;
    while (sX < imgW && dX < dStartX + dW && dX < bufferW)
    {
      while (drawCol > 0 && dX < dStartX + dW && dX < bufferW)
      {
        let sY = sStartY, dY = dStartY, drawRow = scaleY - dClipH % scaleY;
        while (sY < imgH && dY < dStartY + dH && dY < bufferH)
        {
          const offIm = 4 * (imgH * sX + sY);
          const iRed = imgBmp[offIm], iGreen = imgBmp[offIm + 1];
          const iBlue = imgBmp[offIm + 2], iAlpha = imgBmp[offIm + 3];
          while (drawRow > 0 && dY < dStartY + dH && dY < bufferH)
          {
            if (sX >= 0 && sY >= 0)
            {
              const offBuff = 4 * (bufferW * dY + dX);
              const bRed = BUFFER[offBuff];
              const bGreen = BUFFER[offBuff + 1];
              const bBlue = BUFFER[offBuff + 2];
              const bAlpha = BUFFER[offBuff + 3] || 255;
              const rBlend = iAlpha * opacity / bAlpha, rBlend_ = 1 - rBlend;
              const newRed = iRed * lightLvl * rBlend + bRed * rBlend_;
              const newGreen = iGreen * lightLvl * rBlend + bGreen * rBlend_;
              const newBlue = iBlue * lightLvl * rBlend + bBlue * rBlend_;
              BUFFER[offBuff] = newRed; BUFFER[offBuff + 1] = newGreen;
              BUFFER[offBuff + 2] = newBlue; BUFFER[offBuff + 3] = 255;
            }
            drawRow -= 1;
            dY += 1;
          }
          while (drawRow <= 0)
          {
            drawRow += scaleY;
            sY += 1;
          }
        }
        drawCol -= 1;
        dX += 1;
      }
      while (drawCol <= 0)
      {
        drawCol += scaleX;
        sX += 1;
      }
    }
  }

  function R_DrawCol_Wall ()
  {

  }

  function R_DrawCol_Floor ()
  {

  }

  function R_DrawCol_Ceil ()
  {

  }

  function R_DrawCol_Masked ()
  {

  }

  function R_DrawCol_FFT (dx, hUpper, hLower, dist, rayAngle)
  {

  }

  function R_DrawGlobalSprite (sprite)
  {
    const frames = sprite.frames;
    const activeFrames = sprite.activeFrames, nFrames = activeFrames.length;
    for (let idxFrame = 0; idxFrame < nFrames; idxFrame += 1)
    {
      const frame = frames[activeFrames[idxFrame]];
      const locOnScreen = frame.locOnScreen;
      if (Array.isArray(locOnScreen)) // TODO: maybe standardize??
      {
        for (let i = 0; i < locOnScreen.length; i += 1)
        {
          const loc = locOnScreen[i];
          R_DrawImage(sprite,
                      frame.offset, sprite.height - frame.height,
                      frame.width, frame.height,
                      loc.x, loc.y,
                      frame.width, frame.height);
        }
      }
      else
      {
        R_DrawImage(sprite,
                    frame.offset, sprite.height - frame.height,
                    frame.width, frame.height,
                    locOnScreen.x, locOnScreen.y,
                    frame.width, frame.height);
      }
    }
  }

  window.__import__R_Draw = function ()
  {
    return {
      R_GetBuffer: R_GetBuffer,
      R_ClearBuffer: R_ClearBuffer,
      R_FlushBuffer: R_FlushBuffer,
      R_InitBuffer: R_InitBuffer,
      R_Print: R_Print,
      R_DebugStats: R_DebugStats,
      R_FillRect: R_FillRect,
      R_FillRectAdHoc: R_FillRectAdHoc,
      R_DrawImage: R_DrawImage,
      R_DrawCol_Wall: R_DrawCol_Wall,
      R_DrawCol_Floor: R_DrawCol_Floor,
      R_DrawCol_Ceil: R_DrawCol_Ceil,
      R_DrawCol_Masked: R_DrawCol_Masked,
      R_DrawCol_FFT: R_DrawCol_FFT,
      R_DrawGlobalSprite: R_DrawGlobalSprite,
    };
  };

})();
