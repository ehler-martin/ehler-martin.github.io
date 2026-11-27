(() => {
  const figure = document.querySelector(".home-plate");
  if (!figure) return;
  const canvas = figure.querySelector(".spherical-curve");
  const ctx = canvas.getContext("2d");
  const controls = figure.querySelector(".curve-controls");
  const play = controls.querySelector(".play-curve");
  const slider = controls.querySelector("input");
  const readout = controls.querySelector(".parameter-value");
  const choices = figure.querySelector(".curve-choices");
  const geometryView = figure.querySelector(".geometry-view");
  let geometryViewer;
  let geometryLoading;
  const showDesign = controls.querySelector(".show-design");
  const poster = figure.querySelector(".sphere-poster");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  // Equation (15) and Example 3.3 in Ehler & Gröchenig. At each design
  // value the normalized arc-length mean of z² equals 1/3.
  const families = {
    2: {design: 0.7777999002629707, title: "Tennis-ball curve", word: "two", poster: "sphere.png"},
    3: {design: 0.7660487581673754, title: "Spherical curve with threefold symmetry", word: "three", poster: "sphere-k3.png"}
  };
  const tau = 2 * Math.PI;
  let degree, design, harmonics, stops;
  let parameter, origin;
  let stop = 0;
  let elapsed = 0;
  let playing = !reducedMotion.matches;
  let onScreen = true;
  let frame;
  let lastTime;

  // Fixed orthographic view. Depth determines which part of the seam is dashed.
  const azimuth = 0.42, elevation = 0.31, tilt = 0.16;
  const ca = Math.cos(azimuth), sa = Math.sin(azimuth);
  const ce = Math.cos(elevation), se = Math.sin(elevation);
  const ct = Math.cos(tilt), st = Math.sin(tilt);
  function project(x, y, z) {
    const horizontal = -sa * x + ca * y;
    const radial = ca * x + sa * y;
    const vertical = ce * z - se * radial;
    return {
      x: 160 + 146 * (ct * horizontal + st * vertical),
      y: 160 + 146 * (st * horizontal - ct * vertical),
      depth: ce * radial + se * z
    };
  }

  function splitAtHorizon(points) {
    const front = new Path2D(), back = new Path2D();
    let previous = points[0];
    let path = previous.depth >= 0 ? front : back;
    path.moveTo(previous.x, previous.y);
    for (let i = 1; i < points.length; i++) {
      const point = points[i];
      const next = point.depth >= 0 ? front : back;
      if (next !== path) {
        const t = previous.depth / (previous.depth - point.depth);
        const x = previous.x + t * (point.x - previous.x);
        const y = previous.y + t * (point.y - previous.y);
        path.lineTo(x, y);
        next.moveTo(x, y);
        path = next;
      }
      path.lineTo(point.x, point.y);
      previous = point;
    }
    return {front, back};
  }

  const globe = document.createElement("canvas");
  globe.width = canvas.width;
  globe.height = canvas.height;
  function drawGlobe() {
    const g = globe.getContext("2d");
    g.scale(globe.width / 320, globe.height / 320);
    const light = g.createRadialGradient(109, 93, 2, 152, 155, 157);
    light.addColorStop(0, "#fafbf4");
    light.addColorStop(0.72, "#e6ebdf");
    light.addColorStop(1, "#d1d9c9");
    g.beginPath();
    g.arc(160, 160, 146, 0, tau);
    g.fillStyle = light;
    g.fill();
    g.strokeStyle = "#9aa996";
    g.lineWidth = 0.8;
    g.stroke();

    function gridLine(pointAt) {
      const points = Array.from({length: 129}, (_, i) => pointAt(i / 128));
      const {front, back} = splitAtHorizon(points);
      g.lineWidth = 0.55;
      g.strokeStyle = "#cbd2c3";
      g.stroke(back);
      g.lineWidth = 0.75;
      g.strokeStyle = "#a8b4a2";
      g.stroke(front);
    }
    function spherical(lon, lat) {
      return project(Math.cos(lat) * Math.cos(lon), Math.cos(lat) * Math.sin(lon), Math.sin(lat));
    }
    for (let i = 0; i < 16; i++) gridLine(t => spherical(tau * i / 16, Math.PI * (t - 0.5)));
    for (let i = -3; i <= 3; i++) gridLine(t => spherical(tau * t, i * Math.PI / 8));
  }

  function sampleHarmonics(k) {
    const n = 2 * k - 1;
    return Array.from({length: 361}, (_, i) => {
      const t = tau * i / 360;
      return [Math.cos(t), Math.sin(t), Math.cos(n * t), Math.sin(n * t), Math.sin(k * t)];
    });
  }
  function drawCurve(a) {
    parameter = a;
    const b = 1 - a;
    const height = 2 * Math.sqrt(a * b);
    const points = harmonics.map(([cosT, sinT, cosN, sinN, sinK]) =>
      project(a * cosT + b * cosN, a * sinT - b * sinN, height * sinK)
    );
    const {front, back} = splitAtHorizon(points);
    ctx.clearRect(0, 0, 320, 320);
    ctx.drawImage(globe, 0, 0, 320, 320);
    ctx.lineWidth = 1.65;
    ctx.strokeStyle = "#a9785e";
    ctx.setLineDash([3, 4]);
    ctx.stroke(back);
    ctx.setLineDash([]);
    ctx.lineWidth = 3.4;
    ctx.strokeStyle = "#984627";
    ctx.stroke(front);

    const value = a.toFixed(4);
    readout.textContent = value;
    slider.value = value;
    figure.dataset.atDesign = String(a === design);
    slider.setAttribute("aria-valuetext", a === design ? `${value}, spherical ${degree}-design` : value);
  }

  function animate(time) {
    frame = requestAnimationFrame(animate);
    if (lastTime === undefined) lastTime = time;
    if (time - lastTime < 32) return;
    elapsed += time - lastTime;
    lastTime = time;
    const target = stops[stop];
    const travel = 20000 * Math.abs(target - origin);
    if (elapsed < travel) {
      const blend = (1 - Math.cos(Math.PI * elapsed / travel)) / 2;
      drawCurve(origin + (target - origin) * blend);
    } else {
      if (parameter !== target) drawCurve(target);
      if (elapsed >= travel + (target === design ? 2400 : 200)) {
        origin = target;
        stop = (stop + 1) % stops.length;
        elapsed = 0;
      }
    }
  }
  function updatePlayback() {
    cancelAnimationFrame(frame);
    lastTime = undefined;
    play.textContent = playing ? "Pause" : "Play";
    play.setAttribute("aria-label", playing ? "Pause parameter animation" : "Play parameter animation");
    if (ctx && geometryView.hidden && playing && onScreen && !document.hidden) frame = requestAnimationFrame(animate);
  }
  function startAt(a) {
    origin = a;
    elapsed = 0;
    stop = 0;
    drawCurve(a);
    updatePlayback();
  }

  function selectParameter(a) {
    playing = false;
    startAt(a);
  }

  function chooseFamily(k) {
    if (degree === k) return;
    degree = k;
    const family = families[k];
    design = family.design;
    const rounded = design.toFixed(4);
    figure.querySelector("#curve-title").textContent = family.title;
    figure.querySelector("#design-note sub").textContent = k;
    figure.querySelector(".design-value").textContent = rounded;
    figure.querySelector(".degree-word").textContent = family.word;
    showDesign.textContent = `Show ${k}-design`;
    if (!ctx) {
      poster.src = "assets/" + family.poster;
      poster.alt = `${family.title} at the spherical ${k}-design parameter, approximately ${rounded}. Its far side is dashed.`;
      return;
    }
    const designFraction = (design - Number(slider.min)) / (Number(slider.max) - Number(slider.min));
    controls.style.setProperty("--design-position", (designFraction * 100) + "%");
    harmonics = sampleHarmonics(k);
    stops = [design, 1, design, 0.5];
    startAt(design);
  }

  if (ctx) {
    ctx.scale(canvas.width / 320, canvas.height / 320);
    ctx.lineJoin = ctx.lineCap = "round";
    drawGlobe();
    poster.hidden = true;
    canvas.hidden = controls.hidden = false;
    play.addEventListener("click", () => { playing = !playing; updatePlayback(); });
    slider.addEventListener("input", () => {
      selectParameter(slider.valueAsNumber === Number(design.toFixed(4)) ? design : slider.valueAsNumber);
    });
    showDesign.addEventListener("click", () => selectParameter(design));
    reducedMotion.addEventListener("change", () => {
      if (reducedMotion.matches) selectParameter(design);
    });
    document.addEventListener("visibilitychange", updatePlayback);
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(([entry]) => {
        onScreen = entry.isIntersecting;
        updatePlayback();
      }).observe(figure);
    }
  }

  function selectView(button) {
    const geometry = button.dataset.view === "geometry";
    for (const choice of choices.querySelectorAll("button")) {
      choice.setAttribute("aria-pressed", String(choice === button));
    }
    geometryView.hidden = !geometry;
    figure.querySelector(".geometry-description").hidden = !geometry;
    figure.querySelector(".plate-image-area").hidden = geometry;
    figure.querySelector(".curve-description").hidden = geometry;
    figure.querySelector(".figure-title").textContent = geometry ? "Geometry" : "Sampling curves";
    controls.hidden = geometry || !ctx;
    if (geometry && !geometryLoading) {
      geometryLoading = import("./geometry/viewer.js")
        .then(module => module.createViewer(geometryView))
        .then(viewer => { geometryViewer = viewer; viewer.setVisible(!geometryView.hidden); })
        .catch(() => {
          geometryView.querySelector(".geometry-status").textContent =
            "The interactive view is unavailable. You can download the 3D model below.";
        });
    }
    geometryViewer?.setVisible(geometry);
    if (!geometry) chooseFamily(Number(button.dataset.degree));
    updatePlayback();
  }
  for (const button of choices.querySelectorAll("button")) {
    button.addEventListener("click", () => selectView(button));
  }
  selectView(choices.querySelector(location.hash === "#geometry" ? "[data-view=geometry]" : "[data-degree='2']"));
  choices.hidden = false;
})();
