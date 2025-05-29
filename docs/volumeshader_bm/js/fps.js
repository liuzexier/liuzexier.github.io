// FPS统计模块
(function () {
  let frame = 0;
  let fps = 0;
  let lastFpsUpdate = performance.now();
  const fpsSpan = document.getElementById('fps');

  function updateFPS() {
    frame++;
    const now = performance.now();
    if (now - lastFpsUpdate >= 1000) { // 每1秒更新一次显示
      fps = Math.round((frame * 1000) / (now - lastFpsUpdate));
      if (fpsSpan) {
        fpsSpan.textContent = fps;
      }
      lastFpsUpdate = now;
      frame = 0;
    }
    window.requestAnimationFrame(updateFPS);
  }

  if (fpsSpan) {
    window.requestAnimationFrame(updateFPS);
  }
})();
