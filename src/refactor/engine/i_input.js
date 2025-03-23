(function ()
{

  function I_Key ()
  {
    return {
      W: "W",
      A: "A",
      S: "S",
      D: "D",
      Q: "Q",
      E: "E",
      SPC: "SPC",
      RTN: "RTN",
      ARW_UP: "ARW_UP",
      ARW_DOWN: "ARW_DOWN",
      ARW_LEFT: "ARW_LEFT",
      ARW_RIGHT: "ARW_RIGHT",
    };
  }
  const KEY = I_Key();

  function I_Mouse ()
  {
    return {
      LEFT: "LEFT",
      MIDDLE: "MIDDLE",
      RIGHT: "RIGHT",
      BRWS_BWD: "BRWS_BWD",
      BRWS_FWD: "BRWS_FWD",
      MOVING: "MOVING",
      MOVEMENT_X: "MOVEMENT_X",
      MOVEMENT_Y: "MOVEMENT_Y",
      WHEELING: "WHEELING",
      DELTA_WHEEL: "DELTA_WHEEL",
    };
  }
  const MOUSE = I_Mouse();

  const keyState = {
    [KEY.W]: 0,
    [KEY.A]: 0,
    [KEY.S]: 0,
    [KEY.D]: 0,
    [KEY.Q]: 0,
    [KEY.E]: 0,
    [KEY.SPC]: 0,
    [KEY.RTN]: 0,
    [KEY.ARW_UP]: 0,
    [KEY.ARW_DOWN]: 0,
    [KEY.ARW_LEFT]: 0,
    [KEY.ARW_RIGHT]: 0,
  };

  const mouseState = {
    [MOUSE.LEFT]: 0,
    [MOUSE.MIDDLE]: 0,
    [MOUSE.RIGHT]: 0,
    [MOUSE.BRWS_BWD]: 0,
    [MOUSE.BRWS_FWD]: 0,
    [MOUSE.MOVING]: 0,
    [MOUSE.MOVEMENT_X]: 0,
    [MOUSE.MOVEMENT_Y]: 0,
    [MOUSE.WHEELING]: 0,
    [MOUSE.DELTA_WHEEL]: 0,
  };

  let mouseStopTimeout, mouseWheelTimeout;

  const MOUSE_RESET_DELAY = 100;

  function I_UpdateKeyState (key, state)
  {
    switch (key)
    {
      case 87: keyState.W = state ? 1 : 0; break;
      case 65: keyState.A = state ? 1 : 0; break;
      case 83: keyState.S = state ? 1 : 0; break;
      case 68: keyState.D = state ? 1 : 0; break;
      case 81: keyState.Q = state ? 1 : 0; break;
      case 69: keyState.E = state ? 1 : 0; break;
      case 32: keyState.SPC = state ? 1 : 0; break;
      case 13: keyState.RTN = state ? 1 : 0; break;
      case 37: keyState.ARW_LEFT = state ? 1 : 0; break;
      case 38: keyState.ARW_UP = state ? 1 : 0; break;
      case 39: keyState.ARW_RIGHT = state ? 1 : 0; break;
      case 40: keyState.ARW_DOWN = state ? 1 : 0; break;
      default: break;
    }
  }

  function I_KeyDown (event)
  {
    I_UpdateKeyState(event.which || event.keyCode, 1);
  }

  function I_KeyUp (event)
  {
    I_UpdateKeyState(event.which || event.keyCode, 0);
  }

  function I_GetKeyState (key)
  {
    return keyState[KEY[key]];
  }

  function I_InitKeyboard (onElement)
  {
    onElement.onkeydown = I_KeyDown;
    onElement.onkeyup = I_KeyUp;
  }

  function I_UpdateMouseButtonState (button, state)
  {
    switch (button)
    {
      case 0: mouseState.LEFT = state ? 1 : 0; break;
      case 1: mouseState.MIDDLE = state ? 1 : 0; break;
      case 2: mouseState.RIGHT = state ? 1 : 0; break;
      case 3: mouseState.BRWS_BWD = state ? 1 : 0; break;
      case 4: mouseState.BRWS_FWD = state ? 1 : 0; break;
      default: break;
    }
  }

  function I_MouseDown (event)
  {
    I_UpdateMouseButtonState(event.button, 1);
  }

  function I_MouseUp (event)
  {
    I_UpdateMouseButtonState(event.button, 0);
  }

  function I_ResetMouseMovement ()
  {
    mouseState.MOVING = 0;
    mouseState.MOVEMENT_X = 0; mouseState.MOVEMENT_Y = 0;
  }

  function I_MouseMove (event)
  {
    mouseState.MOVING = 1;
    mouseState.MOVEMENT_X = event.movementX;
    mouseState.MOVEMENT_Y = event.movementY;
    // reset mouse movement after some time has passed
    if (mouseStopTimeout !== undefined) clearTimeout(mouseStopTimeout);
    mouseStopTimeout = setTimeout(I_ResetMouseMovement, MOUSE_RESET_DELAY);
  }

  function I_ResetMouseWheel ()
  {
    mouseState.WHEELING = 0; mouseState.DELTA_WHEEL = 0;
  }

  function I_MouseWheel (event)
  {
    event.preventDefault(); // prevent scrolling the page
    mouseState.WHEELING = 1; mouseState.DELTA_WHEEL = event.deltaY;
    // reset mouse wheel after some time has passed
    if (mouseWheelTimeout !== undefined) clearTimeout(mouseWheelTimeout);
    mouseWheelTimeout = setTimeout(I_ResetMouseWheel, MOUSE_RESET_DELAY);
  }

  function I_PointerLocked (onElement)
  {
    return document.pointerLockElement === onElement ||
           document.mozPointerLockElement === onElement;
  }

  function I_RequestPointerLock ()
  {
    const element = this;
    if (!I_PointerLocked(element))
    {
      element.requestPointerLock = element.requestPointerLock ||
                                   element.mozRequestPointerLock;
      element.requestPointerLock();
    }
  }

  function I_PointerLockChange ()
  {
    const element = this;
    // pointer locked, attach mouse listeners
    if (I_PointerLocked(element))
    {
      element.onclick = undefined;
      element.onmousedown = I_MouseDown;
      element.onmouseup = I_MouseUp;
      element.onmousemove = I_MouseMove;
      element.onwheel = I_MouseWheel;
    }
    // pointer unlocked, detach mouse listeners
    else
    {
      element.onclick = I_RequestPointerLock;
      element.onmousedown = undefined;
      element.onmouseup = undefined;
      element.onmousemove = undefined;
      element.onwheel = undefined;
    }
  }

  function I_GetMouseState (state)
  {
    return mouseState[MOUSE[state]];
  }

  function I_InitMouse (onElement)
  {
    onElement.onclick = I_RequestPointerLock.bind(onElement);
    document.onpointerlockchange = I_PointerLockChange.bind(onElement);
    document.onmozpointerlockchange = I_PointerLockChange.bind(onElement);
  }

  function I_InitFullscreen (onElement)
  {
    onElement.requestFullscreen = onElement.requestFullscreen ||
                                  onElement.mozRequestFullscreen ||
                                  onElement.webkitRequestFullscreen;
    document.exitFullscreen = document.exitFullscreen ||
                              document.mozExitFullscreen ||
                              document.webkitExitFullscreen;
    addEventListener("keypress", function I_OnFullscreenCallback ({ keyCode })
    {
      if (keyCode === 102)
      {
        if (document.fullscreenElement ||
            document.mozFullscreenElement ||
            document.webkitFullscreenElement)
          document.exitFullscreen();
        else
          onElement.requestFullscreen();
      }
    });
  }

  window.__import__I_Input = function ()
  {
    return {
      I_Keys: I_Key(),
      I_Mouse: I_Mouse(),
      I_GetKeyState: I_GetKeyState,
      I_InitFullscreen: I_InitFullscreen,
      I_InitKeyboard: I_InitKeyboard,
      I_GetMouseState: I_GetMouseState,
      I_InitMouse: I_InitMouse,
    };
  };

})();
