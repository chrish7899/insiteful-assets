/* ============================================================
   INSITEFUL — AI Employee ROI Impact Calculator
   Inputs:  hours/week on manual tasks · avg hourly cost ·
            reviews/month · current review response rate
   Outputs: monthly + annual hours & labor cost saved,
            projected review response lift.
   Model assumptions (also disclosed in the UI):
     · AI Employees absorb ~80% of routine call/chat/follow-up volume
     · Review response rate rises to ~95% with automated responses
   ============================================================ */
(() => {
  "use strict";

  const shell = document.getElementById("roiCalc");
  if (!shell) return;

  const AUTOMATION_SHARE = 0.8;
  const TARGET_RESPONSE_RATE = 0.95;
  const WEEKS_PER_MONTH = 4.33;

  const inputs = {
    hours: document.getElementById("calcHours"),
    wage: document.getElementById("calcWage"),
    reviews: document.getElementById("calcReviews"),
    rate: document.getElementById("calcRate"),
  };
  const values = {
    hours: document.getElementById("calcHoursVal"),
    wage: document.getElementById("calcWageVal"),
    reviews: document.getElementById("calcReviewsVal"),
    rate: document.getElementById("calcRateVal"),
  };
  const outputs = {
    hoursMo: document.getElementById("outHoursMo"),
    hoursYr: document.getElementById("outHoursYr"),
    costMo: document.getElementById("outCostMo"),
    costYr: document.getElementById("outCostYr"),
    respNow: document.getElementById("outRespNow"),
    respAfter: document.getElementById("outRespAfter"),
    respLift: document.getElementById("outRespLift"),
    barMo: document.getElementById("barMo"),
    barYr: document.getElementById("barYr"),
  };

  const fmtInt = (n) => Math.round(n).toLocaleString("en-US");
  const fmtMoney = (n) => "$" + Math.round(n).toLocaleString("en-US");

  // Tween displayed numbers so outputs feel alive
  const tweens = new Map();
  const setNum = (el, target, fmt) => {
    if (!el) return;
    const prev = tweens.get(el) ?? 0;
    const start = performance.now();
    const dur = 420;
    tweens.set(el, target);
    const tick = (now) => {
      if (tweens.get(el) !== target) return; // superseded
      const p = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(prev + (target - prev) * eased);
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  const paintRange = (input) => {
    const min = parseFloat(input.min || 0);
    const max = parseFloat(input.max || 100);
    const p = ((parseFloat(input.value) - min) / (max - min)) * 100;
    input.style.setProperty("--p", p + "%");
  };

  const compute = () => {
    const hours = parseFloat(inputs.hours.value);
    const wage = parseFloat(inputs.wage.value);
    const reviews = parseFloat(inputs.reviews.value);
    const rate = parseFloat(inputs.rate.value) / 100;

    values.hours.textContent = hours + " hrs/wk";
    values.wage.textContent = "$" + wage + "/hr";
    values.reviews.textContent = reviews + " /mo";
    values.rate.textContent = Math.round(rate * 100) + "%";

    const hoursMo = hours * WEEKS_PER_MONTH * AUTOMATION_SHARE;
    const hoursYr = hoursMo * 12;
    const costMo = hoursMo * wage;
    const costYr = costMo * 12;

    const respNow = reviews * rate;
    const target = Math.max(rate, TARGET_RESPONSE_RATE);
    const respAfter = reviews * target;
    const liftPts = Math.max(0, Math.round((target - rate) * 100));

    setNum(outputs.hoursMo, hoursMo, (n) => fmtInt(n));
    setNum(outputs.hoursYr, hoursYr, (n) => fmtInt(n));
    setNum(outputs.costMo, costMo, fmtMoney);
    setNum(outputs.costYr, costYr, fmtMoney);
    if (outputs.respNow) outputs.respNow.textContent = fmtInt(respNow);
    if (outputs.respAfter) outputs.respAfter.textContent = fmtInt(respAfter);
    if (outputs.respLift) outputs.respLift.textContent = "+" + liftPts;

    if (outputs.barMo) outputs.barMo.style.setProperty("--w", "8.33%");
    if (outputs.barYr) outputs.barYr.style.setProperty("--w", "100%");
    const barMoOut = document.getElementById("outCostMoBar");
    const barYrOut = document.getElementById("outCostYrBar");
    if (barMoOut) barMoOut.textContent = fmtMoney(costMo);
    if (barYrOut) barYrOut.textContent = fmtMoney(costYr);

    Object.values(inputs).forEach(paintRange);
  };

  Object.values(inputs).forEach((input) => {
    if (!input) return;
    input.addEventListener("input", compute);
  });

  compute();
})();
