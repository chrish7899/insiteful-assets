/* ============================================================
   INSITEFUL — Missed Call Revenue Calculator (Home)
   Inputs:  missed calls per week · average customer value ·
            close rate on answered calls
   Outputs: monthly + annual revenue at risk.
   Model:   85% of missed callers never call back (industry
            research) — that share of missed calls, closed at
            your rate and value, is the revenue leak.
   ============================================================ */
(() => {
  "use strict";

  const shell = document.getElementById("missedCallCalc");
  if (!shell) return;

  const NEVER_CALL_BACK = 0.85;
  const WEEKS_PER_MONTH = 4.33;

  const inputs = {
    calls: document.getElementById("mcCalls"),
    value: document.getElementById("mcValue"),
    rate: document.getElementById("mcRate"),
  };
  const values = {
    calls: document.getElementById("mcCallsVal"),
    value: document.getElementById("mcValueVal"),
    rate: document.getElementById("mcRateVal"),
  };

  const fmtMoney = (n) => "$" + Math.round(n).toLocaleString("en-US");

  const tweens = new Map();
  const setNum = (el, target) => {
    if (!el) return;
    const prev = tweens.get(el) ?? 0;
    const start = performance.now();
    const dur = 420;
    tweens.set(el, target);
    const tick = (now) => {
      if (tweens.get(el) !== target) return;
      const p = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = fmtMoney(prev + (target - prev) * eased);
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
    const calls = parseFloat(inputs.calls.value);
    const value = parseFloat(inputs.value.value);
    const rate = parseFloat(inputs.rate.value) / 100;

    values.calls.textContent = calls + " /week";
    values.value.textContent = "$" + value.toLocaleString("en-US");
    values.rate.textContent = Math.round(rate * 100) + "%";

    const lostMo = calls * WEEKS_PER_MONTH * NEVER_CALL_BACK * rate * value;
    const lostYr = lostMo * 12;

    setNum(document.getElementById("mcLostMo"), lostMo);
    setNum(document.getElementById("mcLostYr"), lostYr);

    const barMo = document.getElementById("mcBarMo");
    const barYr = document.getElementById("mcBarYr");
    if (barMo) barMo.style.setProperty("--w", "8.33%");
    if (barYr) barYr.style.setProperty("--w", "100%");
    const barMoOut = document.getElementById("mcLostMoBar");
    const barYrOut = document.getElementById("mcLostYrBar");
    if (barMoOut) barMoOut.textContent = fmtMoney(lostMo);
    if (barYrOut) barYrOut.textContent = fmtMoney(lostYr);

    const vs = document.getElementById("mcVsPlan");
    if (vs) vs.textContent = lostMo > 397 ? fmtMoney(lostMo - 397) : "$0";

    Object.values(inputs).forEach(paintRange);
  };

  Object.values(inputs).forEach((input) => input && input.addEventListener("input", compute));
  compute();
})();
