(function ()
{

  const animations = {}, queue = {};

  function U_CreateAnimationId (candidate)
  {
    const cand = candidate || "(anonymous)";
    return animations[cand] ? U_CreateAnimationId(cand + "_1") : cand;
  }

  function U_QuitAnimation (id, cleanUp)
  {
    clearInterval(animations[id]);
    delete animations[id];
    if (cleanUp) cleanUp();
  }

  // immediately create and run an animation
  function U_StartAnimation (onFrame, interval, shouldEnd, cleanUp)
  {
    const id = U_CreateAnimationId(arguments.callee.caller.name);

    let iFrame = 0;

    function U_OnFrame ()
    {
      if (shouldEnd && shouldEnd(iFrame)) U_QuitAnimation(id, cleanUp);
      else onFrame(iFrame);
      iFrame += 1;
    }

    animations[id] = setInterval(U_OnFrame, interval);

    return id;
  }

  // create an animation and push it onto the queue
  function U_CreateAnimation (onFrame, interval, shouldEnd, cleanUp)
  {
    const id = U_CreateAnimationId(arguments.callee.caller.name);

    let iFrame = 0;

    queue[id] = {
      onFrame: function ()
      {
        if (shouldEnd && shouldEnd(iFrame)) U_QuitAnimation(id, cleanUp);
        else onFrame(iFrame);
        iFrame += 1;
      },
      interval: interval,
    };

    return id;
  }

  // run the animation with the given id, if it exists in the queue
  function U_RunAnimation (id)
  {
    const animation = queue[id];
    if (animation)
    {
      animations[id] = setInterval(animation.onFrame, animation.interval);
      delete queue[id];
    }
  }

  window.__import__U_Animate = function ()
  {
    return {
      U_StartAnimation: U_StartAnimation,
      U_QuitAnimation: U_QuitAnimation,
      U_CreateAnimation: U_CreateAnimation,
      U_RunAnimation: U_RunAnimation,
    };
  };

})();
