(() => {
  "use strict";
  const samples = 24;
  const carrier = 1.5;
  // Match the authors' endpoint convention: -n/2 < j,k <= n/2.
  const indices = Array.from({length: samples}, (_, i) => i + 1 - samples / 2);
  const gaussian = x => Math.exp(-Math.PI * x * x);
  const pulse = t => gaussian(t) * Math.cos(2 * Math.PI * carrier * t);
  const spectrum = frequency => (gaussian(frequency - carrier) + gaussian(frequency + carrier)) / 2;

  function experiment(length) {
    const spacing = length / samples;
    const readings = indices.map(j => [j * spacing, pulse(j * spacing)]);
    let sumSquares = 0;
    const transform = indices.map(k => {
      let real = 0, imaginary = 0;
      for (const [t, value] of readings) {
        const angle = -2 * Math.PI * k * t / length;
        real += value * Math.cos(angle);
        imaginary += value * Math.sin(angle);
      }
      real *= spacing;
      imaginary *= spacing;
      const frequency = k / length;
      sumSquares += (real - spectrum(frequency)) ** 2 + imaginary ** 2;
      return [frequency, Math.hypot(real, imaginary)];
    });
    return {readings, transform, error: Math.sqrt(sumSquares / length)};
  }

  // All three drawings use data coordinates; ticks and traces share the same scales.
  function chart({description, xRange, yRange, xTicks, yTicks, axisLabel, curve, points = [], windowLength, selected, height = 140}) {
    const width = 450, left = 39, right = width - 12, top = 10, bottom = height - 37;
    const x = value => left + (value - xRange[0]) / (xRange[1] - xRange[0]) * (right - left);
    const y = value => bottom - (value - yRange[0]) / (yRange[1] - yRange[0]) * (bottom - top);
    const fmt = value => value.toFixed(2);
    const tick = value => String(value).replace('-', '−');
    const elements = [];
    if (windowLength !== undefined) {
      elements.push(`<rect class="interval" x="${fmt(x(-windowLength / 2))}" y="${top}" width="${fmt(x(windowLength / 2) - x(-windowLength / 2))}" height="${bottom - top}"/>`);
    }
    for (const [value, label] of yTicks) {
      elements.push(`<path class="${value === 0 ? 'axis' : 'guide'}" d="M${left} ${fmt(y(value))}H${right}"/><text x="${left - 7}" y="${fmt(y(value) + 4)}" text-anchor="end">${label}</text>`);
    }
    elements.push(`<path class="axis" fill="none" d="M${left} ${top}V${bottom}H${right}"/>`);
    for (const value of xTicks) {
      elements.push(`<path class="axis" d="M${fmt(x(value))} ${bottom}v4"/><text x="${fmt(x(value))}" y="${bottom + 17}" text-anchor="middle">${tick(value)}</text>`);
    }
    elements.push(`<text class="axis-title" x="${(left + right) / 2}" y="${height - 2}" text-anchor="middle">${axisLabel}</text>`);
    const line = curve.map(([u, v], i) => (i ? 'L' : 'M') + fmt(x(u)) + ' ' + fmt(y(v))).join('');
    elements.push(`<path class="signal" d="${line}"/>`);
    for (const [u, v] of points) {
      if (u < xRange[0] || u > xRange[1]) continue;
      elements.push(`<circle class="sample" cx="${fmt(x(u))}" cy="${fmt(y(v))}" r="3.4"/>`);
    }
    if (selected) {
      elements.push(`<path stroke="#99462d" stroke-dasharray="3 4" d="M${fmt(x(selected[0]))} ${top}V${bottom}"/><circle class="sample" cx="${fmt(x(selected[0]))}" cy="${fmt(y(selected[1]))}" r="5.3"/>`);
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${description}">${elements.join('')}</svg>`;
  }

  function trace(fn, start, end, segments) {
    return Array.from({length: segments + 1}, (_, i) => {
      const u = start + (end - start) * i / segments;
      return [u, fn(u)];
    });
  }

  const sweep = trace(p => Math.log10(experiment(p).error), 1.5, 12, 210);
  const exactSpectrum = trace(spectrum, -3, 3, 250);
  const slider = document.getElementById('window-length');
  const buttons = Array.from(document.querySelectorAll('[data-window]'));
  function update() {
    const length = slider.valueAsNumber;
    const result = experiment(length);
    const range = Math.max(2.2, length / 2 * 1.09);
    const tickStep = range > 4.2 ? 2 : 1;
    const ticks = Array.from({length: 13}, (_, i) => (i - 6) * tickStep).filter(t => Math.abs(t) <= range);
    document.getElementById('pulse-plot').innerHTML = chart({
      description: `Pulse amplitude versus time. The shaded recording window is ${length} seconds wide and contains 24 samples.`,
      xRange: [-range, range], yRange: [-1.08, 1.08], xTicks: ticks, yTicks: [[-1,'−1'],[0,'0'],[1,'1']],
      axisLabel: 'Time (s)', curve: trace(pulse, -range, range, 400), points: result.readings, windowLength: length
    });
    document.getElementById('spectrum-plot').innerHTML = chart({
      description: 'Fourier magnitude versus frequency. The solid curve has peaks near −1.5 and +1.5 Hz. The dots are DFT magnitudes on the available grid.',
      xRange: [-3, 3], yRange: [0, 1.06], xTicks: [-3,-2,-1,0,1,2,3], yTicks: [[0,'0'],[0.5,'0.5'],[1,'1']],
      axisLabel: 'Frequency (Hz)', curve: exactSpectrum, points: result.transform
    });
    document.getElementById('error-plot').innerHTML = chart({
      description: 'Grid error versus recording window length, on a logarithmic error scale. The error is smallest around three and a half seconds and rises again for long windows.',
      xRange: [1.5, 12], yRange: [-7,0.2], xTicks: [1.5,3,6,9,12], yTicks: [[0,'1'],[-2,'10⁻²'],[-4,'10⁻⁴'],[-6,'10⁻⁶']],
      axisLabel: 'Window length (s)', curve: sweep, selected: [length, Math.log10(result.error)], height: 190
    });
    document.getElementById('window-value').textContent = length.toFixed(1) + ' s';
    slider.setAttribute('aria-valuetext', length.toFixed(1) + ' seconds');
    for (const button of buttons) button.setAttribute('aria-pressed', String(Number(button.dataset.window) === length));
    const [mantissa, exponent] = result.error.toExponential(2).split('e');
    const superscripts = '⁰¹²³⁴⁵⁶⁷⁸⁹';
    const power = String(Number(exponent)).replace(/[-0-9]/g, c => c === '-' ? '⁻' : superscripts[Number(c)]);
    const spacing = Number((length / samples).toFixed(4));
    document.getElementById('error-readout').textContent =
      `At ${length.toFixed(1)} s, the sample spacing is ${spacing} s and the grid error is ${mantissa} × 10${power}.`;
  }
  for (const button of buttons) {
    button.addEventListener('click', () => { slider.value = button.dataset.window; update(); });
  }
  slider.addEventListener('input', update);
  update();
  document.querySelector('.experiment-controls').hidden = false;
})();
