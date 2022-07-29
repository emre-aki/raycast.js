(function ()
{
  const canvas = document.getElementById("canvas");
  const CANV_WIDTH = canvas.width, CANV_HEIGHT = canvas.height;

  const N_COLS = 35, N_ROWS = 35;
  const TILE_W = CANV_WIDTH / N_COLS, TILE_H = CANV_HEIGHT / N_ROWS

  let K_ZOOM = 1, PAN_X = 0, PAN_Y = 0;

  const mouseState = {"x": 0, "y": 0};
  const keyState = {"ARW_UP": 0, "ARW_RIGHT": 0, "ARW_DOWN": 0, "ARW_LEFT": 0};

  const fs = {
    "__dirname__": "/editor/",
    "__file__": "/editor/raycasting.js",
    "__sprites__": "/sprites/",
    "__textures__": "/textures/",
    "__audio__": "/audio/"
  };

  function clamp (x, low, high)
  {
    return Math.min(Math.max(x, low), high);
  }

  function Screen (cnvs)
  {
    let width, height, buffer;
    const ctx = cnvs.getContext("2d");

    function getBitmap (img)
    {
      if (img.data) return img.data;

      const imgBuffer = document.createElement("canvas");
      const imgCtx = imgBuffer.getContext("2d");
      imgBuffer.width = img.width; imgBuffer.height = img.height;
      imgCtx.drawImage(img, 0, 0);
      return imgCtx.getImageData(0, 0, img.width, img.height).data;
    }

    function setDimensions (w, h)
    {
      width = w; height = h; cnvs.width = w; cnvs.height = h;
      buffer = ctx.getImageData(0, 0, w, h);
    }

    function fillRect (x, y, w, h, r, g, b, a)
    {
      const X = Math.floor(Math.max(x, 0)), Y = Math.floor(Math.max(y, 0));
      const endX = Math.min(x + w, width), endY = Math.min(y + h, height);

      const buffData = buffer.data;

      for (let dX = X; dX < endX; dX += 1)
      {
        for (let dY = Y; dY < endY; dY += 1)
        {
          const offBuff = 4 * (width * dY + dX);
          const buffRed = buffData[offBuff];
          const buffGreen = buffData[offBuff + 1];
          const buffBlue = buffData[offBuff + 2];
          const buffAlpha = buffData[offBuff + 3] || 255;
          const kAlpha = a / buffAlpha;
          const newRed = kAlpha * r + (1 - kAlpha) * buffRed;
          const newGreen = kAlpha * g + (1 - kAlpha) * buffGreen;
          const newBlue = kAlpha * b + (1 - kAlpha) * buffBlue;
          buffData[offBuff] = newRed; buffData[offBuff + 1] = newGreen;
          buffData[offBuff + 2] = newBlue; buffData[offBuff + 3] = 255;
        }
      }
    }

    function drawImage (img, dx, dy, dw, dh, sx, sy, sw, sh, opacity)
    {
      const imgW = img.width, imgH = img.height;

      const _opacity = isFinite(opacity) ? opacity : 1;

      // early return if out-of-bounds for either the source image or canvas
      if (dx + dw <= 0 || dy + dh <= 0 || dx > width || dy > height ||
          sx + sw <= 0 || sy + sh <= 0 || sx > imgW || sy > imgH)
        return;
      // FIXME: early return if sw === 0 || sh === 0

      const buffData = buffer.data;
      const imgBuff = getBitmap(img);

      const DX = Math.floor(dx), DY = Math.floor(dy);
      const DW = Math.ceil(dw), DH = Math.ceil(dh);
      const SX = Math.floor(sx), SY = Math.floor(sy);
      const SW = Math.ceil(sw), SH = Math.ceil(sh);

      const skipDX = Math.max(0 - DX, 0), skipDY = Math.max(0 - DY, 0);
      const startDX = DX + skipDX, startDY = DY + skipDY;
      const clippedDW = DW - skipDX, clippedDH = DH - skipDY;

      const scaleX = DW / SW, scaleY = DH / SH;

      const skipSX = skipDX / scaleX, skipSY = skipDY / scaleY;
      const startSX = SX + skipSX, startSY = SY + skipSY;

      let sX = startSX, dX = startDX, drawCol = scaleX;
      while (sX < imgW && dX < width && dX < startDX + clippedDW)
      {
        while (drawCol > 0 && dX < width && dX < startDX + clippedDW)
        {
          let sY = startSY, dY = startDY, drawRow = scaleY;
          while (sY < imgH && dY < height && dY < startDY + clippedDH)
          {
            let offImg, imgRed, imgGreen, imgBlue, imgAlpha;
            if (sX >= 0 && sY >= 0)
            {
              offImg = 4 * (imgW * sY + sX);
              imgRed = imgBuff[offImg]; imgGreen = imgBuff[offImg + 1];
              imgBlue = imgBuff[offImg + 2]; imgAlpha = imgBuff[offImg + 3];
            }
            while (drawRow > 0 && dY < height && dY < startDY + clippedDH)
            {
              if (isFinite(offImg))
              {
                const offBuff = 4 * (width * dY + dX);
                const buffRed = buffData[offBuff];
                const buffGreen = buffData[offBuff + 1];
                const buffBlue = buffData[offBuff + 2];
                const buffAlpha = buffData[offBuff + 3] || 255;
                const kAlpha = imgAlpha / buffAlpha * _opacity;
                const newRed = kAlpha * imgRed + (1 - kAlpha) * buffRed;
                const newGreen = kAlpha * imgGreen + (1 - kAlpha) * buffGreen;
                const newBlue = kAlpha * imgBlue + (1 - kAlpha) * buffBlue;
                buffData[offBuff] = newRed; buffData[offBuff + 1] = newGreen;
                buffData[offBuff + 2] = newBlue; buffData[offBuff + 3] = 255;
              }
              drawRow -= 1;
              dY += 1;
            }
            while (drawRow <= 0 && sY < imgH)
            {
              drawRow += scaleY;
              sY += 1;
            }
          }
          drawCol -= 1;
          dX += 1;
        }
        while (drawCol <= 0 && sX < imgW)
        {
          drawCol += scaleX;
          sX += 1;
        }
      }
    }

    function print (text, x, y, style)
    {
      ctx.font = style;
      ctx.fillText(text, x, y);
    }

    function clear ()
    {
      ctx.clearRect(0, 0, width, height);
      buffer = ctx.getImageData(0, 0, width, height);
    }

    function applyZoom ()
    {
      const cloneBuffer = new ImageData(new Uint8ClampedArray(buffer.data),
                                        width, height);
      clear();
      drawImage(cloneBuffer,
                0, 0, width, height,
                PAN_X, PAN_Y, CANV_WIDTH * K_ZOOM, CANV_HEIGHT * K_ZOOM);
    }

    function flush ()
    {
      applyZoom();
      ctx.putImageData(buffer, 0, 0);
    }

    setDimensions(cnvs.width, cnvs.height); // initialize screen

    return {
      "setDimensions": setDimensions,
      "fillRect": fillRect,
      "drawImage": drawImage,
      "print": print,
      "clear": clear,
      "flush": flush
    };
  }

  function clampPan ()
  {
    const zoomedW = CANV_WIDTH * K_ZOOM, zoomedH = CANV_HEIGHT * K_ZOOM;
    PAN_X = clamp(PAN_X, 0, CANV_WIDTH - zoomedW);
    PAN_Y = clamp(PAN_Y, 0, CANV_HEIGHT - zoomedH);
  }

  function updateZoom (event)
  {
    const lastZoom = K_ZOOM; // remember zoom state
    K_ZOOM = clamp(lastZoom + 0.1 * Math.sign(event.deltaY), 0.05, 1);
    // update the pan state
    PAN_X += mouseState.x * (lastZoom - K_ZOOM);
    PAN_Y += mouseState.y * (lastZoom - K_ZOOM);
    clampPan();
  }

  function updatePan ()
  {
    const lastPanX = PAN_X, lastPanY = PAN_Y; // remember pan state
    if (keyState.ARW_UP) PAN_Y -= 5;
    if (keyState.ARW_RIGHT) PAN_X += 5;
    if (keyState.ARW_DOWN) PAN_Y += 5;
    if (keyState.ARW_LEFT) PAN_X -= 5;
    // if the pan state had changed, clamp it
    if (lastPanX !== PAN_X || lastPanY !== PAN_Y) clampPan();
  }

  function updateMouseState (event)
  {
    const bb = canvas.getBoundingClientRect();
    mouseState.x = event.x - bb.left;
    mouseState.y = event.y - bb.top;
  }

  function getCursorPos ()
  {
    return [
      Math.floor((PAN_X + mouseState.x * K_ZOOM) / TILE_W),
      Math.floor((PAN_Y + mouseState.y * K_ZOOM) / TILE_H),
    ];
  }

  function loadImage (filename)
  {
    return new Promise(function (resolve)
    {
      const img = new Image();

      img.onload = function ()
      {
        resolve(img);
      };

      img.src = filename;
    });
  }

  const screen = Screen(canvas);

  function drawBackground (r, g, b, a)
  {
    screen.fillRect(0, 0, CANV_WIDTH, CANV_HEIGHT, r, g, b, a || 255);
  }

  function drawGrid ()
  {
    const cursor = getCursorPos();

    const intervalX = 2, intervalY = intervalX * CANV_HEIGHT / CANV_WIDTH;

    for (let x = 0; x < N_COLS; x += 1)
    {
      for (let y = 0; y < N_ROWS; y += 1)
      {
        const dx = Math.floor(TILE_W * x + intervalX * 0.5);
        const dy = Math.floor(TILE_H * y + intervalY * 0.5);
        screen.fillRect(dx, dy, TILE_W - intervalX, TILE_W - intervalY, 50, 50, 50, 255);
        if (x === Math.floor(cursor[0]) && y === Math.floor(cursor[1]))
          screen.fillRect(dx, dy, TILE_W - intervalX, TILE_W - intervalY, 150, 150, 50, 100);
      }
    }
  }

  function updateKeyState (keyCode, type)
  {
    switch (keyCode)
    {
      case 38:
        keyState.ARW_UP = type === "down"
          ? 1
          : type === "up"
            ? 0
            : keyState.ARW_UP;
        break;
      case 39:
        keyState.ARW_RIGHT = type === "down"
          ? 1
          : type === "up"
            ? 0
            : keyState.ARW_RIGHT;
        break;
      case 40:
        keyState.ARW_DOWN = type === "down"
          ? 1
          : type === "up"
            ? 0
            : keyState.ARW_DOWN;
        break;
      case 37:
        keyState.ARW_LEFT = type === "down"
          ? 1
          : type === "up"
            ? 0
            : keyState.ARW_LEFT;
        break;
        default: break;
    }
  }

  document.onkeydown = function (event)
  {
    updateKeyState(event.keyCode, "down");
  };
  document.onkeyup = function (event)
  {
    updateKeyState(event.keyCode, "up");
  };

  document.onmousemove = updateMouseState;

  document.onwheel = updateZoom;

  function printCursor ()
  {
    const mX = mouseState.x * K_ZOOM + PAN_X;
    const mY = mouseState.y * K_ZOOM + PAN_Y;
    const tileW = CANV_WIDTH / 35, tileH = CANV_HEIGHT / 35;
    screen.print("<" + Math.floor(mX / tileW)
                 + ", " + Math.floor(mY / tileH) + ">",
                 10, CANV_HEIGHT - 10, "16px Courier");
  }

  loadImage(fs.__textures__ + "f_tporter.png")
    .then(function (img)
      {
        setInterval(function ()
        {
          screen.clear();
          updatePan();
          drawBackground(90, 90, 90, 255);
          screen.drawImage(img, 0, 0, CANV_WIDTH, CANV_HEIGHT, 0, 0, img.width, img.height);
          drawGrid();
          screen.flush();
          printCursor();
        }, 1000 / 60);
      });
})();
