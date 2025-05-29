alert(
  "Trigonometric and inverse trigonometric functions test.\n" +
    "Created by cznull\n" +
    "Modified by livcm\n" +
    "WebGPU version by AI"
);

let cx, cy;
let mx = 0,
  my = 0,
  mx1 = 0,
  my1 = 0,
  lasttimen = 0;
let ml = 0,
  mr = 0,
  mm = 0;
let len = 1.6;
let ang1 = 2.8;
let ang2 = 0.4;
let cenx = 0.0,
  ceny = 0.0,
  cenz = 0.0;
let date = new Date();
let t1 = date.getTime();
let KERNEL = `
  fn kernel(ver: vec3<f32>) -> f32 {
      var a = ver;
      var b: f32;
      var c: f32;
      var d: f32;
      var e: f32;
      for (var i = 0; i < 5; i = i + 1) {
          b = length(a);
          c = atan2(a.y, a.x) * 8.0;
          e = 1.0 / b;
          d = acos(a.z / b) * 8.0;
          b = pow(b, 8.0);
          a = vec3<f32>(b * sin(d) * cos(c), b * sin(d) * sin(c), b * cos(d)) + ver;
          if (b > 6.0) {
              break;
          }
      }
      return 4.0 - a.x * a.x - a.y * a.y - a.z * a.z;
  }
  `;

let device,
  context,
  format,
  pipeline,
  uniformBuffer,
  uniformBindGroup,
  vertexBuffer;
let canvas;
let shaderModule;
let renderPassDescriptor;
let positions = new Float32Array([
  -1.0, -1.0, 0.0, 1.0, -1.0, 0.0, 1.0, 1.0, 0.0, -1.0, -1.0, 0.0, 1.0, 1.0,
  0.0, -1.0, 1.0, 0.0,
]);

// Uniforms layout: [right.xyz, forward.xyz, up.xyz, origin.xyz, x, y, len]
function getUniformData() {
  // Calculate camera vectors
  let right = [Math.sin(ang1), 0, -Math.cos(ang1)];
  let up = [
    -Math.sin(ang2) * Math.cos(ang1),
    Math.cos(ang2),
    -Math.sin(ang2) * Math.sin(ang1),
  ];
  let forward = [
    -Math.cos(ang1) * Math.cos(ang2),
    -Math.sin(ang2),
    -Math.sin(ang1) * Math.cos(ang2),
  ];
  let origin = [
    len * Math.cos(ang1) * Math.cos(ang2) + cenx,
    len * Math.sin(ang2) + ceny,
    len * Math.sin(ang1) * Math.cos(ang2) + cenz,
  ];
  let x = (cx * 2.0) / (cx + cy);
  let y = (cy * 2.0) / (cx + cy);

  // Create a properly sized array for all the data
  const data = new Float32Array(20);
  data.set(right, 0);
  data[3] = 0;
  data.set(forward, 4);
  data[7] = 0;
  data.set(up, 8);
  data[11] = 0;
  data.set(origin, 12);
  data[15] = 0;
  data[16] = x;
  data[17] = y;
  data[18] = len;
  data[19] = 0;
  return data;

  return data;
}

async function initWebGPU() {
  canvas = document.getElementById("c1");
  if (!navigator.gpu) {
    alert("WebGPU not supported!");
    return;
  }
  const adapter = await navigator.gpu.requestAdapter();
  device = await adapter.requestDevice();
  context = canvas.getContext("webgpu");
  format = navigator.gpu.getPreferredCanvasFormat();
  context.configure({
    device,
    format,
    alphaMode: "opaque",
  });

  // Vertex buffer
  vertexBuffer = device.createBuffer({
    size: positions.byteLength,
    usage: GPUBufferUsage.VERTEX,
    mappedAtCreation: true,
  });
  new Float32Array(vertexBuffer.getMappedRange()).set(positions);
  vertexBuffer.unmap();

  // Uniform buffer
  uniformBuffer = device.createBuffer({
    size: 20 * 4, // 16 个 float32 数值 (4 bytes each)
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  // Shader code (WGSL)
  function getShaderSource(kernelCode) {
    return `
  struct Uniforms {
      right: vec3<f32>,
      pad0: f32,
      forward: vec3<f32>,
      pad1: f32,
      up: vec3<f32>,
      pad2: f32,
      origin: vec3<f32>,
      pad3: f32,
      x: f32,
      y: f32,
      len: f32,
      pad4: f32,
  };
  @group(0) @binding(0) var<uniform> uniforms: Uniforms;
  
  struct VertexOutput {
      @builtin(position) position: vec4<f32>,
      @location(0) dir: vec3<f32>,
      @location(1) localdir: vec3<f32>,
  };
  
  @vertex
  fn vs_main(@location(0) position: vec3<f32>) -> VertexOutput {
      var out: VertexOutput;
      out.position = vec4<f32>(position, 1.0);
      out.dir = uniforms.forward + uniforms.right * position.x * uniforms.x + uniforms.up * position.y * uniforms.y;
      out.localdir = vec3<f32>(position.x * uniforms.x, position.y * uniforms.y, -1.0);
      return out;
  }
  
  ${kernelCode}
  
  @fragment
  fn fs_main(@location(0) dir: vec3<f32>, @location(1) localdir: vec3<f32>) -> @location(0) vec4<f32> {
      let PI = 3.14159265358979324;
      let M_L = 0.3819660113;
      let M_R = 0.6180339887;
      let MAXR = 8;
      let SOLVER = 8;
      var color = vec3<f32>(0.0, 0.0, 0.0);
      var sign = 0;
      let step = 0.002;
      var v: f32;
      var v1: f32 = kernel(uniforms.origin + dir * (step * uniforms.len));
      var v2: f32 = kernel(uniforms.origin);
      var ver: vec3<f32>;
      var r1: f32;
      var r2: f32;
      var r3: f32 = 0.0;
      var r4: f32;
      var m1: f32;
      var m2: f32;
      var m3: f32;
      var m4: f32;
      var n: vec3<f32>;
      var reflect: vec3<f32>;
      for (var k = 2; k < 1002; k = k + 1) {
          ver = uniforms.origin + dir * (step * uniforms.len * f32(k));
          v = kernel(ver);
          if (v > 0.0 && v1 < 0.0) {
              r1 = step * uniforms.len * f32(k - 1);
              r2 = step * uniforms.len * f32(k);
              m1 = kernel(uniforms.origin + dir * r1);
              m2 = kernel(uniforms.origin + dir * r2);
              for (var l = 0; l < SOLVER; l = l + 1) {
                  r3 = r1 * 0.5 + r2 * 0.5;
                  m3 = kernel(uniforms.origin + dir * r3);
                  if (m3 > 0.0) {
                      r2 = r3;
                      m2 = m3;
                  } else {
                      r1 = r3;
                      m1 = m3;
                  }
              }
              if (r3 < 2.0 * uniforms.len) {
                  sign = 1;
                  break;
              }
          }
          if (v < v1 && v1 > v2 && v1 < 0.0 && (v1 * 2.0 > v || v1 * 2.0 > v2)) {
              r1 = step * uniforms.len * f32(k - 2);
              r2 = step * uniforms.len * (f32(k) - 2.0 + 2.0 * M_L);
              r3 = step * uniforms.len * (f32(k) - 2.0 + 2.0 * M_R);
              r4 = step * uniforms.len * f32(k);
              m2 = kernel(uniforms.origin + dir * r2);
              m3 = kernel(uniforms.origin + dir * r3);
              for (var l = 0; l < MAXR; l = l + 1) {
                  if (m2 > m3) {
                      r4 = r3;
                      r3 = r2;
                      r2 = r4 * M_L + r1 * M_R;
                      m3 = m2;
                      m2 = kernel(uniforms.origin + dir * r2);
                  } else {
                      r1 = r2;
                      r2 = r3;
                      r3 = r4 * M_R + r1 * M_L;
                      m2 = m3;
                      m3 = kernel(uniforms.origin + dir * r3);
                  }
              }
              if (m2 > 0.0) {
                  r1 = step * uniforms.len * f32(k - 2);
                  r2 = r2;
                  m1 = kernel(uniforms.origin + dir * r1);
                  m2 = kernel(uniforms.origin + dir * r2);
                  for (var l = 0; l < SOLVER; l = l + 1) {
                      r3 = r1 * 0.5 + r2 * 0.5;
                      m3 = kernel(uniforms.origin + dir * r3);
                      if (m3 > 0.0) {
                          r2 = r3;
                          m2 = m3;
                      } else {
                          r1 = r3;
                          m1 = m3;
                      }
                  }
                  if (r3 < 2.0 * uniforms.len && r3 > step * uniforms.len) {
                      sign = 1;
                      break;
                  }
              } else if (m3 > 0.0) {
                  r1 = step * uniforms.len * f32(k - 2);
                  r2 = r3;
                  m1 = kernel(uniforms.origin + dir * r1);
                  m2 = kernel(uniforms.origin + dir * r2);
                  for (var l = 0; l < SOLVER; l = l + 1) {
                      r3 = r1 * 0.5 + r2 * 0.5;
                      m3 = kernel(uniforms.origin + dir * r3);
                      if (m3 > 0.0) {
                          r2 = r3;
                          m2 = m3;
                      } else {
                          r1 = r3;
                          m1 = m3;
                      }
                  }
                  if (r3 < 2.0 * uniforms.len && r3 > step * uniforms.len) {
                      sign = 1;
                      break;
                  }
              }
          }
          v2 = v1;
          v1 = v;
      }
      if (sign == 1) {
          ver = uniforms.origin + dir * r3;
          let r1 = ver.x * ver.x + ver.y * ver.y + ver.z * ver.z;
          n.x = kernel(ver - uniforms.right * (r3 * 0.00025)) - kernel(ver + uniforms.right * (r3 * 0.00025));
          n.y = kernel(ver - uniforms.up * (r3 * 0.00025)) - kernel(ver + uniforms.up * (r3 * 0.00025));
          n.z = kernel(ver + uniforms.forward * (r3 * 0.00025)) - kernel(ver - uniforms.forward * (r3 * 0.00025));
          let nlen = sqrt(n.x * n.x + n.y * n.y + n.z * n.z);
          n = n * (1.0 / nlen);
          var ldir = localdir;
          let ldirlen = sqrt(ldir.x * ldir.x + ldir.y * ldir.y + ldir.z * ldir.z);
          ldir = ldir * (1.0 / ldirlen);
          reflect = n * (-2.0 * dot(ldir, n)) + ldir;
          var r3v = reflect.x * 0.276 + reflect.y * 0.920 + reflect.z * 0.276;
          var r4 = n.x * 0.276 + n.y * 0.920 + n.z * 0.276;
          r3v = max(0.0, r3v);
          r3v = r3v * r3v * r3v * r3v;
          r3v = r3v * 0.45 + r4 * 0.25 + 0.3;
          n.x = sin(r1 * 10.0) * 0.5 + 0.5;
          n.y = sin(r1 * 10.0 + 2.05) * 0.5 + 0.5;
          n.z = sin(r1 * 10.0 - 2.05) * 0.5 + 0.5;
          color = n * r3v;
      }
      return vec4<f32>(color, 1.0);
  }
          `;
  }

  shaderModule = device.createShaderModule({
    code: getShaderSource(KERNEL),
  });

  pipeline = device.createRenderPipeline({
    layout: "auto",
    vertex: {
      module: shaderModule,
      entryPoint: "vs_main",
      buffers: [
        {
          arrayStride: 12,
          attributes: [
            {
              shaderLocation: 0,
              offset: 0,
              format: "float32x3",
            },
          ],
        },
      ],
    },
    fragment: {
      module: shaderModule,
      entryPoint: "fs_main",
      targets: [
        {
          format: format,
        },
      ],
    },
    primitive: {
      topology: "triangle-list",
    },
  });

  uniformBindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      {
        binding: 0,
        resource: {
          buffer: uniformBuffer,
        },
      },
    ],
  });

  renderPassDescriptor = {
    colorAttachments: [
      {
        view: undefined,
        clearValue: { r: 0, g: 0, b: 0, a: 1 },
        loadOp: "clear",
        storeOp: "store",
      },
    ],
  };
}

let lastUniformData = null;

function updateUniforms() {
  const uniformData = getUniformData();
  if (
    !lastUniformData ||
    !uniformData.every((v, i) => v === lastUniformData[i])
  ) {
    device.queue.writeBuffer(
      uniformBuffer,
      0,
      uniformData.buffer,
      uniformData.byteOffset,
      uniformData.byteLength
    );
    lastUniformData = uniformData;
  }
}

function draw() {
  date = new Date();
  let t2 = date.getTime();
  t1 = t2;
  updateUniforms();
  renderPassDescriptor.colorAttachments[0].view = context
    .getCurrentTexture()
    .createView();
  const commandEncoder = device.createCommandEncoder();
  const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
  passEncoder.setPipeline(pipeline);
  passEncoder.setVertexBuffer(0, vertexBuffer);
  passEncoder.setBindGroup(0, uniformBindGroup);
  passEncoder.draw(6, 1, 0, 0);
  passEncoder.end();
  device.queue.submit([commandEncoder.finish()]);
}

function ontimer() {
  ang1 += 0.01;
  draw();
  window.requestAnimationFrame(ontimer);
}

window.onresize = function () {
  cx = document.body.clientWidth;
  cy = document.body.clientHeight;
  if (cx > cy) {
    cx = cy;
  } else {
    cy = cx;
  }
  document.getElementById("main").style.width = 1024 + "px";
  document.getElementById("main").style.height = 1024 + "px";
  document.getElementById("main").style.transform =
    "scale(" + cx / 1024 + "," + cy / 1024 + ")";
};

window.onload = async function () {
  cx = document.body.clientWidth;
  cy = document.body.clientHeight;
  if (cx > cy) {
    cx = cy;
  } else {
    cy = cx;
  }
  document.getElementById("main").style.width = 1024 + "px";
  document.getElementById("main").style.height = 1024 + "px";
  document.getElementById("main").style.transform =
    "scale(" + cx / 1024 + "," + cy / 1024 + ")";
  await initWebGPU();
  draw();
  window.requestAnimationFrame(ontimer);
  document.getElementById("kernel").value = KERNEL;
  document.getElementById("btn").addEventListener("click", function () {
    var state = this.innerText == "CONFIG";
    this.innerText = state ? "HIDE" : "CONFIG";
    document.getElementById("config").style.display = state ? "inline" : "none";
  });
  document.getElementById("apply").addEventListener("click", async function () {
    KERNEL = document.getElementById("kernel").value;
    // Recreate shader module and pipeline
    shaderModule = device.createShaderModule({
      code: (function getShaderSource(kernelCode) {
        return `
  struct Uniforms {
      right: vec3<f32>,
      pad0: f32,
      forward: vec3<f32>,
      pad1: f32,
      up: vec3<f32>,
      pad2: f32,
      origin: vec3<f32>,
      pad3: f32,
      x: f32,
      y: f32,
      len: f32,
      pad4: f32,
  };
  @group(0) @binding(0) var<uniform> uniforms: Uniforms;
  
  struct VertexOutput {
      @builtin(position) position: vec4<f32>,
      @location(0) dir: vec3<f32>,
      @location(1) localdir: vec3<f32>,
  };
  
  @vertex
  fn vs_main(@location(0) position: vec3<f32>) -> VertexOutput {
      var out: VertexOutput;
      out.position = vec4<f32>(position, 1.0);
      out.dir = uniforms.forward + uniforms.right * position.x * uniforms.x + uniforms.up * position.y * uniforms.y;
      out.localdir = vec3<f32>(position.x * uniforms.x, position.y * uniforms.y, -1.0);
      return out;
  }
  
  ${kernelCode}
  
  @fragment
  fn fs_main(@location(0) dir: vec3<f32>, @location(1) localdir: vec3<f32>) -> @location(0) vec4<f32> {
      let PI = 3.14159265358979324;
      let M_L = 0.3819660113;
      let M_R = 0.6180339887;
      let MAXR = 8;
      let SOLVER = 8;
      var color = vec3<f32>(0.0, 0.0, 0.0);
      var sign = 0;
      let step = 0.002;
      var v: f32;
      var v1: f32 = kernel(uniforms.origin + dir * (step * uniforms.len));
      var v2: f32 = kernel(uniforms.origin);
      var ver: vec3<f32>;
      var r1: f32;
      var r2: f32;
      var r3: f32 = 0.0;
      var r4: f32;
      var m1: f32;
      var m2: f32;
      var m3: f32;
      var m4: f32;
      var n: vec3<f32>;
      var reflect: vec3<f32>;
      for (var k = 2; k < 1002; k = k + 1) {
          ver = uniforms.origin + dir * (step * uniforms.len * f32(k));
          v = kernel(ver);
          if (v > 0.0 && v1 < 0.0) {
              r1 = step * uniforms.len * f32(k - 1);
              r2 = step * uniforms.len * f32(k);
              m1 = kernel(uniforms.origin + dir * r1);
              m2 = kernel(uniforms.origin + dir * r2);
              for (var l = 0; l < SOLVER; l = l + 1) {
                  r3 = r1 * 0.5 + r2 * 0.5;
                  m3 = kernel(uniforms.origin + dir * r3);
                  if (m3 > 0.0) {
                      r2 = r3;
                      m2 = m3;
                  } else {
                      r1 = r3;
                      m1 = m3;
                  }
              }
              if (r3 < 2.0 * uniforms.len) {
                  sign = 1;
                  break;
              }
          }
          if (v < v1 && v1 > v2 && v1 < 0.0 && (v1 * 2.0 > v || v1 * 2.0 > v2)) {
              r1 = step * uniforms.len * f32(k - 2);
              r2 = step * uniforms.len * (f32(k) - 2.0 + 2.0 * M_L);
              r3 = step * uniforms.len * (f32(k) - 2.0 + 2.0 * M_R);
              r4 = step * uniforms.len * f32(k);
              m2 = kernel(uniforms.origin + dir * r2);
              m3 = kernel(uniforms.origin + dir * r3);
              for (var l = 0; l < MAXR; l = l + 1) {
                  if (m2 > m3) {
                      r4 = r3;
                      r3 = r2;
                      r2 = r4 * M_L + r1 * M_R;
                      m3 = m2;
                      m2 = kernel(uniforms.origin + dir * r2);
                  } else {
                      r1 = r2;
                      r2 = r3;
                      r3 = r4 * M_R + r1 * M_L;
                      m2 = m3;
                      m3 = kernel(uniforms.origin + dir * r3);
                  }
              }
              if (m2 > 0.0) {
                  r1 = step * uniforms.len * f32(k - 2);
                  r2 = r2;
                  m1 = kernel(uniforms.origin + dir * r1);
                  m2 = kernel(uniforms.origin + dir * r2);
                  for (var l = 0; l < SOLVER; l = l + 1) {
                      r3 = r1 * 0.5 + r2 * 0.5;
                      m3 = kernel(uniforms.origin + dir * r3);
                      if (m3 > 0.0) {
                          r2 = r3;
                          m2 = m3;
                      } else {
                          r1 = r3;
                          m1 = m3;
                      }
                  }
                  if (r3 < 2.0 * uniforms.len && r3 > step * uniforms.len) {
                      sign = 1;
                      break;
                  }
              } else if (m3 > 0.0) {
                  r1 = step * uniforms.len * f32(k - 2);
                  r2 = r3;
                  m1 = kernel(uniforms.origin + dir * r1);
                  m2 = kernel(uniforms.origin + dir * r2);
                  for (var l = 0; l < SOLVER; l = l + 1) {
                      r3 = r1 * 0.5 + r2 * 0.5;
                      m3 = kernel(uniforms.origin + dir * r3);
                      if (m3 > 0.0) {
                          r2 = r3;
                          m2 = m3;
                      } else {
                          r1 = r3;
                          m1 = m3;
                      }
                  }
                  if (r3 < 2.0 * uniforms.len && r3 > step * uniforms.len) {
                      sign = 1;
                      break;
                  }
              }
          }
          v2 = v1;
          v1 = v;
      }
      if (sign == 1) {
          ver = uniforms.origin + dir * r3;
          let r1 = ver.x * ver.x + ver.y * ver.y + ver.z * ver.z;
          n.x = kernel(ver - uniforms.right * (r3 * 0.00025)) - kernel(ver + uniforms.right * (r3 * 0.00025));
          n.y = kernel(ver - uniforms.up * (r3 * 0.00025)) - kernel(ver + uniforms.up * (r3 * 0.00025));
          n.z = kernel(ver + uniforms.forward * (r3 * 0.00025)) - kernel(ver - uniforms.forward * (r3 * 0.00025));
          let nlen = sqrt(n.x * n.x + n.y * n.y + n.z * n.z);
          n = n * (1.0 / nlen);
          var ldir = localdir;
          let ldirlen = sqrt(ldir.x * ldir.x + ldir.y * ldir.y + ldir.z * ldir.z);
          ldir = ldir * (1.0 / ldirlen);
          reflect = n * (-2.0 * dot(ldir, n)) + ldir;
          var r3v = reflect.x * 0.276 + reflect.y * 0.920 + reflect.z * 0.276;
          var r4 = n.x * 0.276 + n.y * 0.920 + n.z * 0.276;
          r3v = max(0.0, r3v);
          r3v = r3v * r3v * r3v * r3v;
          r3v = r3v * 0.45 + r4 * 0.25 + 0.3;
          n.x = sin(r1 * 10.0) * 0.5 + 0.5;
          n.y = sin(r1 * 10.0 + 2.05) * 0.5 + 0.5;
          n.z = sin(r1 * 10.0 - 2.05) * 0.5 + 0.5;
          color = n * r3v;
      }
      return vec4<f32>(color, 1.0);
  }
                  `;
      })(KERNEL),
    });
    pipeline = device.createRenderPipeline({
      layout: "auto",
      vertex: {
        module: shaderModule,
        entryPoint: "vs_main",
        buffers: [
          {
            arrayStride: 12,
            attributes: [
              {
                shaderLocation: 0,
                offset: 0,
                format: "float32x3",
              },
            ],
          },
        ],
      },
      fragment: {
        module: shaderModule,
        entryPoint: "fs_main",
        targets: [
          {
            format: format,
          },
        ],
      },
      primitive: {
        topology: "triangle-list",
      },
    });
    uniformBindGroup = device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        {
          binding: 0,
          resource: {
            buffer: uniformBuffer,
          },
        },
      ],
    });
  });
  document.getElementById("cancel").addEventListener("click", function () {
    document.getElementById("kernel").value = KERNEL;
  });
};

// Mouse and touch event handling (same as before, but no gl context)
document.addEventListener(
  "mousedown",
  function (ev) {
    var oEvent = ev || event;
    if (oEvent.button == 0) {
      ml = 1;
      mm = 0;
    }
    if (oEvent.button == 2) {
      mr = 1;
      mm = 0;
    }
    mx = oEvent.clientX;
    my = oEvent.clientY;
  },
  false
);
document.addEventListener(
  "mouseup",
  function (ev) {
    var oEvent = ev || event;
    if (oEvent.button == 0) {
      ml = 0;
    }
    if (oEvent.button == 2) {
      mr = 0;
    }
  },
  false
);
document.addEventListener(
  "mousemove",
  function (ev) {
    var oEvent = ev || event;
    if (ml == 1) {
      ang1 += (oEvent.clientX - mx) * 0.002;
      ang2 += (oEvent.clientY - my) * 0.002;
      if (oEvent.clientX != mx || oEvent.clientY != my) {
        mm = 1;
      }
    }
    if (mr == 1) {
      var l = (len * 4.0) / (cx + cy);
      cenx +=
        l *
        (-(oEvent.clientX - mx) * Math.sin(ang1) -
          (oEvent.clientY - my) * Math.sin(ang2) * Math.cos(ang1));
      ceny += l * ((oEvent.clientY - my) * Math.cos(ang2));
      cenz +=
        l *
        ((oEvent.clientX - mx) * Math.cos(ang1) -
          (oEvent.clientY - my) * Math.sin(ang2) * Math.sin(ang1));
      if (oEvent.clientX != mx || oEvent.clientY != my) {
        mm = 1;
      }
    }
    mx = oEvent.clientX;
    my = oEvent.clientY;
  },
  false
);
document.addEventListener(
  "mousewheel",
  function (ev) {
    ev.preventDefault();
    var oEvent = ev || event;
    len *= Math.exp(-0.001 * oEvent.wheelDelta);
  },
  false
);
document.addEventListener(
  "touchstart",
  function (ev) {
    var n = ev.touches.length;
    if (n == 1) {
      var oEvent = ev.touches[0];
      mx = oEvent.clientX;
      my = oEvent.clientY;
    } else if (n == 2) {
      var oEvent = ev.touches[0];
      mx = oEvent.clientX;
      my = oEvent.clientY;
      oEvent = ev.touches[1];
      mx1 = oEvent.clientX;
      my1 = oEvent.clientY;
    }
    lasttimen = n;
  },
  false
);
document.addEventListener(
  "touchend",
  function (ev) {
    var n = ev.touches.length;
    if (n == 1) {
      var oEvent = ev.touches[0];
      mx = oEvent.clientX;
      my = oEvent.clientY;
    } else if (n == 2) {
      var oEvent = ev.touches[0];
      mx = oEvent.clientX;
      my = oEvent.clientY;
      oEvent = ev.touches[1];
      mx1 = oEvent.clientX;
      my1 = oEvent.clientY;
    }
    lasttimen = n;
  },
  false
);
document.addEventListener(
  "touchmove",
  function (ev) {
    ev.preventDefault();
    var n = ev.touches.length;
    if (n == 1 && lasttimen == 1) {
      var oEvent = ev.touches[0];
      ang1 += (oEvent.clientX - mx) * 0.002;
      ang2 += (oEvent.clientY - my) * 0.002;
      mx = oEvent.clientX;
      my = oEvent.clientY;
    } else if (n == 2) {
      var oEvent = ev.touches[0];
      var oEvent1 = ev.touches[1];
      var l = (len * 2.0) / (cx + cy),
        l1;
      cenx +=
        l *
        (-(oEvent.clientX + oEvent1.clientX - mx - mx1) * Math.sin(ang1) -
          (oEvent.clientY + oEvent1.clientY - my - my1) *
            Math.sin(ang2) *
            Math.cos(ang1));
      ceny +=
        l * ((oEvent.clientY + oEvent1.clientY - my - my1) * Math.cos(ang2));
      cenz +=
        l *
        ((oEvent.clientX + oEvent1.clientX - mx - mx1) * Math.cos(ang1) -
          (oEvent.clientY + oEvent1.clientY - my - my1) *
            Math.sin(ang2) *
            Math.sin(ang1));
      l1 = Math.sqrt((mx - mx1) * (mx - mx1) + (my - my1) * (my - my1) + 1.0);
      mx = oEvent.clientX;
      my = oEvent.clientY;
      mx1 = oEvent1.clientX;
      my1 = oEvent1.clientY;
      l = Math.sqrt((mx - mx1) * (mx - mx1) + (my - my1) * (my - my1) + 1.0);
      len *= l1 / l;
    }
    lasttimen = n;
  },
  false
);
document.oncontextmenu = function (event) {
  if (mm == 1) {
    event.preventDefault();
  }
};
