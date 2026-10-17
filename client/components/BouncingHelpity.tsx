"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

// Helpity as a real 3D ball bouncing around the landing page, drawn on top of everything.
// Load with next/dynamic({ ssr: false }): three.js needs WebGL and the window.

// Measured from public/helpity/helpity_happy_rendered.png (256px, centered at 127.5:
// outer edge of the drawn rim 116.5, yellow disc 106.9).
const ART = "/helpity/helpity_happy_rendered.png";
const ART_SIZE = 256;
const ART_CENTER = 127.5 / ART_SIZE;
const YELLOW_RADIUS = 106.9; // in art pixels; one sphere unit
const YELLOW = "#ffed00";
const CRESCENT = "#f3e200"; // the slightly darker crescent along the lower-right rim
const OUTLINE = 116.5 / YELLOW_RADIUS; // outer edge of the rim, as a multiple of the sphere radius
const ART_SCALE = YELLOW_RADIUS / ART_SIZE; // sphere units -> art UVs

// Motion, in CSS pixels and seconds.
const GRAVITY = 3400;
const MIN_APEX = 0.55; // each bounce rises to a random height, as a share of the room above the floor
const MAX_APEX = 0.95;
const MIN_SPEED_X = 300;
const MAX_SPEED_X = 560;
const MAX_SPIN = 10; // radians per second

const vertexShader = /* glsl */ `
  varying vec3 vObject;
  varying vec3 vNormal;
  void main() {
    vObject = position;
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// How dark an art pixel is (1 = ink), from its brightness and alpha.
const inkOf = /* glsl */ `
  float inkOf(vec4 art) {
    float luminance = dot(art.rgb, vec3(0.299, 0.587, 0.114));
    return (1.0 - smoothstep(0.25, 0.55, luminance)) * art.a;
  }
`;

// The drawing's flat yellow and crescent, with only a faint shade toward the lower-right edge so
// it reads as a ball. Shading and crescent are lighting, so they stay put on screen while the face
// (painted on the ball) rolls around.
const fragmentShader = /* glsl */ `
  uniform vec3 uBase;
  uniform vec3 uCrescent;
  uniform sampler2D uArt;
  varying vec3 vObject;
  varying vec3 vNormal;
  ${inkOf}
  void main() {
    vec3 n = normalize(vNormal);
    // The drawing's crescent is the rim outside a circle nudged up and left.
    float crescent = smoothstep(0.955, 0.97, length(n.xy - vec2(-0.08, 0.08)));
    vec3 color = mix(uBase, uCrescent, crescent);

    float edge = smoothstep(0.35, 1.0, 1.0 - n.z);
    float lowerRight = clamp(dot(n.xy, vec2(0.6, -0.8)) * 0.5 + 0.5, 0.0, 1.0);
    color *= 1.0 - 0.09 * edge * lowerRight;

    // The face: the drawing's ink projected straight onto the front of the ball, so it matches the
    // PNG exactly when facing the viewer. Only ink inside the yellow is used, not the rim.
    if (vObject.z > 0.0 && length(vObject.xy) < 0.85) {
      vec4 art = texture2D(uArt, vec2(${ART_CENTER.toFixed(4)}) + vObject.xy * ${ART_SCALE.toFixed(4)});
      color = mix(color, vec3(0.0), inkOf(art));
    }

    gl_FragColor = vec4(color, 1.0);
    // three.js works in linear color; convert back so the yellows match the PNG.
    #include <colorspace_fragment>
  }
`;

// The outline: the drawing's own hand-drawn rim, on a flat card that always faces the screen.
const rimVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const rimFragmentShader = /* glsl */ `
  uniform sampler2D uArt;
  varying vec2 vUv;
  ${inkOf}
  void main() {
    vec4 art = texture2D(uArt, vUv);
    // Ink outside the yellow disc only (the rim), so the face never shows up here.
    float rim = step(${(YELLOW_RADIUS - 3).toFixed(1)}, length(vUv - vec2(${ART_CENTER.toFixed(4)})) * ${ART_SIZE.toFixed(1)});
    gl_FragColor = vec4(0.0, 0.0, 0.0, inkOf(art) * rim);
  }
`;

function buildHelpity(onArtLoaded: () => void) {
  const sphere = new THREE.SphereGeometry(1, 96, 64);
  const art = new THREE.TextureLoader().load(ART, onArtLoaded);
  art.colorSpace = THREE.NoColorSpace; // only read for "how dark is this pixel"
  art.anisotropy = 4;
  const skin = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uBase: { value: new THREE.Color(YELLOW) },
      uCrescent: { value: new THREE.Color(CRESCENT) },
      uArt: { value: art },
    },
  });

  // The whole drawing spans ART_SIZE / YELLOW_RADIUS sphere units; drawn just in front of the ball.
  const card = new THREE.PlaneGeometry(ART_SIZE / YELLOW_RADIUS, ART_SIZE / YELLOW_RADIUS);
  const rimInk = new THREE.ShaderMaterial({
    vertexShader: rimVertexShader,
    fragmentShader: rimFragmentShader,
    uniforms: { uArt: { value: art } },
    transparent: true,
    depthWrite: false,
  });

  // `root` moves and squashes in screen space and carries the rim; `ball` spins inside it,
  // carrying the face.
  const root = new THREE.Group();
  const ball = new THREE.Mesh(sphere, skin);
  const rim = new THREE.Mesh(card, rimInk);
  rim.position.z = 2;
  root.add(ball, rim);

  return {
    root,
    ball,
    dispose() {
      sphere.dispose();
      card.dispose();
      art.dispose();
      skin.dispose();
      rimInk.dispose();
    },
  };
}

/** A damped spring that settles at 1, for squash and stretch. */
function spring() {
  let value = 1;
  let velocity = 0;
  return {
    get value() {
      return value;
    },
    kick(amount: number) {
      velocity += amount;
    },
    step(dt: number) {
      velocity += (-(value - 1) * 260 - velocity * 16) * dt;
      value += velocity * dt;
    },
  };
}

const random = (min: number, max: number) => min + Math.random() * (max - min);

export default function BouncingHelpity() {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = host.current;
    if (!element) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    element.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    // One world unit = one CSS pixel, origin at the center of the page.
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1000);
    camera.position.z = 500;

    // The animation loop picks the face up on its own; a still Helpity needs one more draw.
    const helpity = buildHelpity(() => {
      if (still) draw();
    });
    scene.add(helpity.root);

    let width = 0;
    let height = 0;
    let radius = 60;
    const position = new THREE.Vector2();
    const velocity = new THREE.Vector2();
    const spin = new THREE.Vector3(); // angular velocity, radians per second
    const turn = new THREE.Quaternion();
    const squashX = spring();
    const squashY = spring();

    function resize() {
      width = element!.clientWidth;
      height = element!.clientHeight;
      renderer.setSize(width, height, false);
      Object.assign(camera, { left: -width / 2, right: width / 2, top: height / 2, bottom: -height / 2 });
      camera.updateProjectionMatrix();
      radius = THREE.MathUtils.clamp(Math.min(width, height) * 0.07, 36, 64);
    }

    const reach = () => radius * OUTLINE; // the ball's full radius, outline included
    const floor = () => -height / 2 + reach();
    const wall = () => Math.max(0, width / 2 - reach());

    /** Launch upward so the next arc peaks at a fresh random height: it never loses energy. */
    function launch() {
      const room = Math.max(0, height - 2 * reach());
      velocity.y = Math.sqrt(2 * GRAVITY * room * random(MIN_APEX, MAX_APEX));
    }

    function clampSpin() {
      if (spin.length() > MAX_SPIN) spin.setLength(MAX_SPIN);
    }

    function step(dt: number) {
      velocity.y -= GRAVITY * dt;
      position.addScaledVector(velocity, dt);

      if (position.y < floor()) {
        position.y = floor();
        const impact = Math.abs(velocity.y);
        launch();
        // Friction with the floor: roll with the sideways speed, plus a random tumble so the
        // face comes around to the front, the side, or the back.
        velocity.x = Math.sign(velocity.x || 1) * random(MIN_SPEED_X, MAX_SPEED_X);
        spin.set(random(-3, 3), random(-3, 3), -velocity.x / radius);
        clampSpin();
        squashY.kick(-impact * 0.0011);
        squashX.kick(impact * 0.0007);
      }
      if (Math.abs(position.x) > wall()) {
        position.x = Math.sign(position.x) * wall();
        if (Math.sign(velocity.x) === Math.sign(position.x)) {
          const impact = Math.abs(velocity.x);
          velocity.x *= -1;
          spin.y += random(-2, 2);
          spin.z *= -0.8;
          clampSpin();
          squashX.kick(-impact * 0.005);
          squashY.kick(impact * 0.003);
        }
      }

      // In the air the spin carries on unchanged, like a real ball.
      const angle = spin.length() * dt;
      if (angle > 0) {
        turn.setFromAxisAngle(spin.clone().normalize(), angle);
        helpity.ball.quaternion.premultiply(turn);
      }

      squashX.step(dt);
      squashY.step(dt);
    }

    function draw() {
      // Squash toward the floor rather than the center when it lands.
      const onFloor = THREE.MathUtils.clamp(1 - (position.y - floor()) / radius, 0, 1);
      const sink = (1 - squashY.value) * reach() * onFloor;
      helpity.root.position.set(position.x, position.y - sink, 0);
      helpity.root.scale.set(radius * squashX.value, radius * squashY.value, radius);
      renderer.render(scene, camera);
    }

    resize();
    if (still) {
      position.set(wall() * 0.7, floor());
    } else {
      position.set(random(-wall(), wall()), random(floor(), height / 2 - reach()));
      velocity.x = (Math.random() < 0.5 ? -1 : 1) * random(MIN_SPEED_X, MAX_SPEED_X);
      spin.set(random(-2, 2), random(-2, 2), -velocity.x / radius);
    }

    const observer = new ResizeObserver(() => {
      resize();
      position.x = THREE.MathUtils.clamp(position.x, -wall(), wall());
      position.y = Math.max(position.y, floor());
      if (still) draw();
    });
    observer.observe(element);

    let frame = 0;
    let last = performance.now();
    function loop(now: number) {
      step(Math.min((now - last) / 1000, 1 / 30)); // clamp so a background tab doesn't teleport it
      last = now;
      draw();
      frame = requestAnimationFrame(loop);
    }
    frame = requestAnimationFrame(still ? () => draw() : loop);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      helpity.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return (
    <div
      ref={host}
      aria-hidden
      className="pointer-events-none absolute inset-0 z-20 [&>canvas]:block [&>canvas]:size-full"
    />
  );
}
