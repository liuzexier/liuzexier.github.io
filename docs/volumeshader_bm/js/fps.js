// FPS统计模块，使用Web Worker
(function () {
  const fpsSpan = document.getElementById('fps');
  if (!fpsSpan) return;

  // 创建worker代码
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
  const blob = new Blob([workerCode], { type: 'application/javascript' });
  const worker = new Worker(URL.createObjectURL(blob));

  worker.onmessage = function (e) {
    fpsSpan.textContent = e.data;
  };
})();
