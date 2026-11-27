"use strict";

const JuliaSession = (() => {
  // Pin the Binder environment containing the book’s packages (see .binder/Project.toml).
  const build = "https://mybinder.org/build/gh/ehler-martin/ehler-martin.github.io/97ed1128ff70a4925c6015d59b8340d3505d19aa";
  let session;
  let sessionEnded = false;
  const endedMessage = "This Julia session has ended. Reload the page and execute your definitions again.";
  let clientLoading;

  function sessionStatus(message) {
    document.getElementById("julia-session-status").textContent = message;
  }

  function endSession() {
    sessionEnded = true;
    sessionStatus(endedMessage);
  }

  function loadClient() {
    if (globalThis.JupyterSnippetClient) return Promise.resolve(globalThis.JupyterSnippetClient);
    if (!clientLoading) {
      clientLoading = new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "assets/jupyter-kernel.min.js";
        script.onload = () => resolve(globalThis.JupyterSnippetClient);
        script.onerror = () => {
          clientLoading = undefined;
          script.remove();
          reject(new Error("The Julia notebook client could not be loaded. Please retry."));
        };
        document.head.appendChild(script);
      });
    }
    return clientLoading;
  }

  async function launch(status) {
    const server = await listenForServer(status);
    if (server) return server;
    status("Reconnecting to Binder…");
    const retry = await listenForServer(status);
    if (retry) return retry;
    throw new Error("Binder took too long to start. Click Execute to retry.");
  }

  function listenForServer(status) {
    return new Promise((resolve, reject) => {
      const events = new EventSource(build);
      // A fresh stream can pick up an image that finished building on another Binder server.
      const timer = setTimeout(() => finish(null), 360000);
      function finish(value, message) {
        clearTimeout(timer);
        events.close();
        if (message) reject(new Error(message));
        else resolve(value);
      }
      events.onmessage = event => {
        let data;
        try { data = JSON.parse(event.data); } catch { return; }
        const phase = String(data.phase).toLowerCase();
        if (phase === "building") status("Binder is preparing the book’s Julia packages…");
        if (phase === "launching") status("Binder is starting your Julia notebook server…");
        if (phase === "ready" && data.url && data.token) finish(data);
        if (phase === "failed") finish(null, "Binder could not start this Julia environment. Please retry in a moment.");
      };
      events.onerror = () => finish(null, "Could not connect to Binder. Check your connection and retry.");
    });
  }

  async function connect(status) {
    const [client, server] = await Promise.all([loadClient(), launch(status)]);
    const baseUrl = new URL(server.url);
    if (baseUrl.protocol !== "https:") throw new Error("Binder did not provide a secure session.");
    baseUrl.pathname = baseUrl.pathname.replace(/\/?$/, "/");
    async function api(path, body) {
      const options = {
        method: body ? "POST" : "GET", credentials: "omit", referrerPolicy: "no-referrer",
        headers: { Authorization: "token " + server.token }, signal: AbortSignal.timeout(90000)
      };
      if (body) {
        options.headers["Content-Type"] = "application/json";
        options.body = JSON.stringify(body);
      }
      const response = await fetch(new URL(path, baseUrl), options);
      if (!response.ok) throw new Error("The Binder Julia session is unavailable. Please retry.");
      return response.json();
    }
    status("Starting the Julia kernel…");
    const specs = await api("api/kernelspecs");
    const entry = Object.entries(specs.kernelspecs).find(([, v]) => v.spec.language.toLowerCase() === "julia");
    if (!entry) throw new Error("The Binder environment did not provide a Julia kernel.");
    const model = await api("api/kernels", { name: entry[0] });
    const settings = client.ServerConnection.makeSettings({
      baseUrl: baseUrl.href, token: server.token, appendToken: true,
      init: { credentials: "omit", mode: "cors", referrerPolicy: "no-referrer" }
    });
    const kernel = new client.KernelConnection({ model, serverSettings: settings, handleComms: false });
    kernel.statusChanged.connect((_, state) => {
      if (["dead", "restarting", "autorestarting"].includes(state)) endSession();
    });
    try {
      await request(kernel, 'ENV["GKSwstype"] = "100";', true);
    } catch (error) {
      kernel.dispose();
      throw error;
    }
    return kernel;
  }

  function displayResult(data, results) {
    if (data["image/png"]) results.push({ image: "data:image/png;base64," + data["image/png"] });
    else if (data["image/svg+xml"]) {
      const svg = data["image/svg+xml"];
      const text = Array.isArray(svg) ? svg.join("") : svg;
      results.push({ image: "data:image/svg+xml;charset=utf-8," + encodeURIComponent(text) });
    } else if (data["text/plain"] !== undefined) {
      const value = data["text/plain"];
      results.push({ text: Array.isArray(value) ? value.join("") : String(value), display: true });
    }
  }

  async function request(kernel, code, silent = false) {
    if (sessionEnded || kernel.isDisposed) throw new Error(endedMessage);
    const future = kernel.requestExecute({ code, silent, store_history: false, allow_stdin: false, stop_on_error: false });
    const results = [];
    future.onIOPub = msg => {
      const content = msg.content;
      switch (msg.header.msg_type) {
        case "display_data":
        case "execute_result": displayResult(content.data, results); break;
        case "stream":
          results.push({ text: content.text.replace(/\u001b\[[0-9;?]*[A-Za-z]/g, ""), stderr: content.name === "stderr" });
          break;
        case "clear_output": results.length = 0; break;
      }
    };
    let timer;
    try {
      const deadline = new Promise((_, reject) => {
        timer = setTimeout(() => {
          endSession();
          reject(new Error("Julia did not confirm completion. Reload the page to start a fresh session."));
        }, 480000);
      });
      const reply = await Promise.race([future.done, deadline]);
      if (sessionEnded) throw new Error(endedMessage);
      if (reply.content.status === "error") throw new Error(reply.content.ename + ": " + reply.content.evalue);
      if (reply.content.status !== "ok") throw new Error("Julia interrupted the calculation. Please retry.");
      return results.length ? results : [{ text: "Finished with no output." }];
    } finally {
      clearTimeout(timer);
      future.dispose();
    }
  }

  // This book example shows the value of each top-level expression at the Julia prompt.
  function showEachExpression(source) {
    const bytes = new TextEncoder().encode(source);
    return `let syntax = Meta.parseall(String(UInt8[${bytes.join(",")}]))
      for expr in syntax.args
        expr isa LineNumberNode && continue
        value = Core.eval(Main, expr)
        if value !== nothing
          display(value)
        end
      end
      nothing
    end`;
  }

  function start() {
    if (sessionEnded) return Promise.reject(new Error(endedMessage));
    if (!session) {
      sessionStatus("Starting Julia on Binder…");
      session = connect(sessionStatus).then(kernel => {
        if (sessionEnded) throw new Error(endedMessage);
        sessionStatus("Julia is ready.");
        return kernel;
      }).catch(error => {
        session = undefined;
        sessionStatus(sessionEnded ? endedMessage : "Binder could not start. Click Execute to retry.");
        throw error;
      });
    }
    return session;
  }

  let queue = Promise.resolve();
  let pending = 0;
  function execute(source, showEach, status) {
    status(pending > 0 ? "Queued. Waiting for the preceding execution…" : "Waiting for Julia…");
    pending++;
    const job = Promise.all([queue, start()]).then(([, kernel]) => {
      status("Running Julia…");
      return request(kernel, showEach ? showEachExpression(source) : source);
    }).finally(() => { pending--; });
    queue = job.catch(() => {});
    return job;
  }

  return { start, execute };
})();
