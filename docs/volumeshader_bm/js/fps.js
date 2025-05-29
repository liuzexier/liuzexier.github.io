
function isIOS() {
  // 检查是否为iOS浏览器
  const ua = window.navigator.userAgent;
  return /iP(hone|od|ad)/i.test(ua);
}

// FPS统计
(function () {
  const fpsSpan = document.getElementById("fps");
  if (!fpsSpan) return;

  if (isIOS() || !Worker) {
    alert("未使用 Web Worker 计算 FPS，仅供参考");
    fpsSpan.style.color = "red";
    let frame = 0;
    let lastFpsUpdate = performance.now();
    function tick() {
      frame++;
      const now = performance.now();
      if (now - lastFpsUpdate >= 500) {
        const fps = Math.round((frame * 1000) / (now - lastFpsUpdate));
        fpsSpan.textContent = fps;
        lastFpsUpdate = now;
        frame = 0;
      }
      requestAnimationFrame(tick);
    }
    tick();
  } else {
    // 非iOS设备：使用Web Worker
    const workerCode = `
      let frame = 0;
      let lastFpsUpdate = performance.now();
      function tick() {
        frame++;
        const now = performance.now();
        if (now - lastFpsUpdate >= 500) {
          const fps = Math.round((frame * 1000) / (now - lastFpsUpdate));
          postMessage(fps);
          lastFpsUpdate = now;
          frame = 0;
        }
        requestAnimationFrame(tick);
      }
      tick();
    `;

    // 创建Blob和Worker
    const blob = new Blob([workerCode], { type: "application/javascript" });
    const worker = new Worker(URL.createObjectURL(blob));

    worker.onmessage = function (e) {
      fpsSpan.textContent = e.data;
    };
  }
})();
