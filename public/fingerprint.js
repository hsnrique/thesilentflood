async function generateFingerprint() {
  const signals = [];

  signals.push(navigator.userAgent);
  signals.push(navigator.language);
  signals.push(navigator.platform);
  signals.push(String(navigator.hardwareConcurrency || ""));
  signals.push(String(navigator.maxTouchPoints || 0));
  signals.push(`${screen.width}x${screen.height}x${screen.colorDepth}`);
  signals.push(Intl.DateTimeFormat().resolvedOptions().timeZone);

  try {
    const canvas = document.createElement("canvas");
    canvas.width = 200;
    canvas.height = 50;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.textBaseline = "top";
      ctx.font = "14px 'Arial'";
      ctx.fillStyle = "#f60";
      ctx.fillRect(125, 1, 62, 20);
      ctx.fillStyle = "#069";
      ctx.fillText("fingerprint", 2, 15);
      ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
      ctx.fillText("fingerprint", 4, 17);
      signals.push(canvas.toDataURL());
    }
  } catch (_) { }

  try {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    if (gl) {
      const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
      if (debugInfo) {
        signals.push(gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL));
        signals.push(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL));
      }
    }
  } catch (_) { }

  const raw = signals.join("|||");
  const hash = await sha256(raw);
  return hash;
}

async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export { generateFingerprint };
