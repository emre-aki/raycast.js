(function ()
{

  const RAD_360 = 2 * Math.PI;
  const RAD_TO_DEG = 180 / Math.PI;

  function U_ToFixed (number, fractionDigits)
  {
    const base = Math.pow(10, fractionDigits);
    return Math.round(number * base) / base;
  }

  function U_NormalizeAngle (rad)
  {
    return ((rad % RAD_360) + RAD_360) % RAD_360;
  }

  function U_ToDegrees (rad)
  {
    return U_NormalizeAngle(rad) * RAD_TO_DEG;
  }

  function U_Vec2dCross (x0, y0, x1, y1)
  {
    return x0 * y1 - x1 * y0;
  }

  function U_EucDist (x0, y0, x1, y1, pseudo, mult)
  {
    const mult_ = mult * mult || 1;
    const deltaX = x1 - x0, deltaY = y1 - y0;
    const pseudoDist = (deltaX * deltaX + deltaY * deltaY) * mult_;
    return pseudo ? pseudoDist : Math.sqrt(pseudoDist);
  }

  window.__import__U_Math = function ()
  {
    return {
      U_ToFixed: U_ToFixed,
      U_NormalizeAngle: U_NormalizeAngle,
      U_ToDegrees: U_ToDegrees,
      U_Vec2dCross: U_Vec2dCross,
      U_EucDist: U_EucDist,
    };
  };

})();
