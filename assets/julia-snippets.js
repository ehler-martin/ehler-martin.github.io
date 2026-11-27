(() => {
  "use strict";

  // Startup failures are shown in the page status. Execute retries the connection.
  JuliaSession.start().catch(() => {});

  const contents = document.querySelector(".chapter-menu");
  const smallScreen = matchMedia("(max-width: 56rem)");
  function sizeContents() { contents.open = !smallScreen.matches; }
  sizeContents();
  smallScreen.addEventListener("change", sizeContents);

  for (const cell of document.querySelectorAll(".julia-cell")) {
    const source = cell.querySelector(".snippet-source");
    const button = cell.querySelector(".execute");
    const restore = cell.querySelector(".restore");
    const result = cell.querySelector(".cell-result");
    const label = cell.querySelector(".result-label");
    const output = cell.querySelector(".snippet-output");
    const original = source.defaultValue;
    function edited() {
      button.disabled = !source.value.trim();
      button.textContent = "Execute";
      restore.hidden = source.value === original;
      result.hidden = true;
      output.textContent = "";
    }

    source.addEventListener("input", edited);
    restore.addEventListener("click", () => {
      source.value = original;
      edited();
      source.focus();
    });
    button.disabled = false;

    button.addEventListener("click", async () => {
      if (button.disabled || !source.value.trim()) return;
      const code = source.value;
      button.disabled = true;
      source.readOnly = true;
      restore.disabled = true;
      button.textContent = "Running…";
      result.hidden = false;
      result.classList.remove("run-error");
      label.textContent = "Output";
      output.textContent = "";
      try {
        const results = await JuliaSession.execute(code, cell.hasAttribute("data-show-each"), status => {
          output.textContent = status;
        });
        output.replaceChildren();
        const hasOutput = results.some(entry => entry.image || (entry.text && !entry.stderr));
        const messages = [];
        for (const entry of results) {
          if (entry.image) {
            const image = document.createElement("img");
            image.alt = "Figure produced by this Julia snippet";
            image.src = entry.image;
            output.append(image);
          } else if (entry.stderr && hasOutput) {
            messages.push(entry.text);
          } else {
            output.append(document.createTextNode(entry.text));
            if (entry.display) output.append(document.createTextNode("\n"));
          }
        }
        if (messages.length) {
          const diagnostics = document.createElement("details");
          const summary = document.createElement("summary");
          summary.textContent = "Julia messages";
          diagnostics.append(summary, document.createTextNode(messages.join("")));
          output.append(diagnostics);
        }
      } catch (error) {
        result.classList.add("run-error");
        label.textContent = "Execution error";
        output.textContent = error instanceof TypeError ? "Could not reach Binder. Check your connection and retry." : error.message;
      } finally {
        source.readOnly = false;
        restore.disabled = false;
        button.disabled = false;
        button.textContent = "Execute";
      }
    });
  }
})();
