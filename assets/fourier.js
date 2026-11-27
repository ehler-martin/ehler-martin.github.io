(() => {
  "use strict";

  const slider = document.getElementById("sample-power");
  const groups = document.querySelectorAll(".convergence-plot [data-power]");
  const count = document.getElementById("sample-count");
  const readout = document.getElementById("error-values");
  const integers = new Intl.NumberFormat("en");
  const superscripts = "⁰¹²³⁴⁵⁶⁷⁸⁹";

  function scientific(value) {
    const [digits, exponent] = Number(value).toExponential(2).split("e");
    const power = String(Number(exponent)).replace(/[-0-9]/g,
      c => c === "-" ? "⁻" : superscripts[Number(c)]);
    return digits + " × 10" + power;
  }

  function showErrors() {
    for (const group of groups) {
      const active = group.dataset.power === slider.value;
      group.classList.toggle("selected", active);
      if (active) {
        const n = integers.format(2 ** Number(slider.value));
        count.textContent = n;
        slider.setAttribute("aria-valuetext", n + " samples");
        readout.textContent = "At " + n + " samples, the standard grid gives an error of " +
          scientific(group.dataset.standard) + " and the decay-adapted grid gives " +
          scientific(group.dataset.adapted) + ".";
      }
    }
  }

  slider.addEventListener("input", showErrors);
  showErrors();
  slider.parentElement.hidden = false;
})();
