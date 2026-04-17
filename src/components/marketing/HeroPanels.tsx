"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * Hero object — a black satin-metal sphere lit from upper-right.
 *
 * The "glow" is *not* a separate halo. It comes from a strong key light
 * creating a bright specular highlight on the metal surface, which the bloom
 * pass picks up and softly spreads. Same approach as Resend's cube.
 *
 * Pure decoration. Parent must be `relative` and have a defined size.
 */
export function HeroPanels({ className }: { className?: string }) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth;
    const height = mount.clientHeight;

    /* ---------------- scene / camera / renderer ---------------- */
    const scene = new THREE.Scene();
    scene.background = null;

    const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 100);
    camera.position.set(0, 0, 7);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      premultipliedAlpha: false,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);
    renderer.setClearAlpha(0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.domElement.style.background = "transparent";
    mount.appendChild(renderer.domElement);

    /* ---------------- procedural textures ----------------
     * Two layers:
     *  1. Fine satin grain  → tight repeat, drives small normal detail.
     *  2. Large value-noise blobs → low frequency contrast, drives roughness
     *     so light catches different patches as the sphere turns. This is
     *     what makes the rotation read clearly.
     */
    const makeFineNoise = () => {
      const c = document.createElement("canvas");
      c.width = c.height = 512;
      const x = c.getContext("2d")!;
      const id = x.createImageData(512, 512);
      for (let i = 0; i < id.data.length; i += 4) {
        const v = 90 + Math.random() * 130;
        id.data[i] = id.data[i + 1] = id.data[i + 2] = v;
        id.data[i + 3] = 255;
      }
      x.putImageData(id, 0, 0);
      return c;
    };
    const makeBlobNoise = () => {
      // Two octaves of smoothed value noise → soft, organic blobs.
      const draw = (size: number) => {
        const c = document.createElement("canvas");
        c.width = c.height = size;
        const cx = c.getContext("2d")!;
        const id = cx.createImageData(size, size);
        for (let i = 0; i < id.data.length; i += 4) {
          const v = Math.random() * 255;
          id.data[i] = id.data[i + 1] = id.data[i + 2] = v;
          id.data[i + 3] = 255;
        }
        cx.putImageData(id, 0, 0);
        return c;
      };
      const a = draw(8);   // very large blobs
      const b = draw(20);  // medium blobs

      const big = document.createElement("canvas");
      big.width = big.height = 512;
      const bx = big.getContext("2d")!;
      bx.imageSmoothingEnabled = true;
      bx.imageSmoothingQuality = "high";
      bx.drawImage(a, 0, 0, 512, 512);
      // Blend the medium octave on top at lower weight
      bx.globalAlpha = 0.45;
      bx.drawImage(b, 0, 0, 512, 512);
      bx.globalAlpha = 1;
      // Soften further with a blur pass
      bx.filter = "blur(8px)";
      bx.drawImage(big, 0, 0);
      bx.filter = "none";
      return big;
    };

    const fineTex = new THREE.CanvasTexture(makeFineNoise());
    fineTex.wrapS = fineTex.wrapT = THREE.MirroredRepeatWrapping;
    fineTex.repeat.set(6, 6);
    fineTex.anisotropy = 4;

    const blobTex = new THREE.CanvasTexture(makeBlobNoise());
    blobTex.wrapS = blobTex.wrapT = THREE.MirroredRepeatWrapping;
    blobTex.repeat.set(1.4, 1.4);
    blobTex.anisotropy = 4;

    /* ---------------- lighting ---------------- */
    // Very dark scene; one strong key light + a faint cool fill.
    scene.add(new THREE.AmbientLight(0xffffff, 0.18));

    // Key light — high intensity so the spec highlight is bright enough to bloom.
    const key = new THREE.DirectionalLight(0xffffff, 4.5);
    key.position.set(4, 5, 4);
    scene.add(key);

    // Cool fill from the opposite side — shapes the dark side without lifting it.
    const fill = new THREE.DirectionalLight(0x88a0b8, 0.4);
    fill.position.set(-5, -1, 2);
    scene.add(fill);

    /* ---------------- main orb ---------------- */
    const group = new THREE.Group();
    scene.add(group);

    const orbGeom = new THREE.SphereGeometry(1.55, 96, 96);
    const orbMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0x1f1f1f),
      metalness: 0.55,
      roughness: 0.6,
      roughnessMap: blobTex,
      normalMap: fineTex,
      normalScale: new THREE.Vector2(0.45, 0.45),
    });
    const orb = new THREE.Mesh(orbGeom, orbMat);
    group.add(orb);

    /* ---------------- particles ---------------- */
    // Dust orbiting the orb on independent random axes.
    const PARTICLE_COUNT = 320;
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    // Per-particle orbit axis (unit vector) + angular speed
    const axes = new Float32Array(PARTICLE_COUNT * 3);
    const speeds = new Float32Array(PARTICLE_COUNT);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      const r = 1.95 + Math.random() * 1.1;
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      // Random orbit axis
      const au = Math.random();
      const av = Math.random();
      const at = 2 * Math.PI * au;
      const ap = Math.acos(2 * av - 1);
      axes[i * 3] = Math.sin(ap) * Math.cos(at);
      axes[i * 3 + 1] = Math.sin(ap) * Math.sin(at);
      axes[i * 3 + 2] = Math.cos(ap);
      speeds[i] = (0.05 + Math.random() * 0.12) * (Math.random() < 0.5 ? 1 : -1);
    }
    const pGeom = new THREE.BufferGeometry();
    pGeom.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    // Soft round dot
    const dotCanvas = document.createElement("canvas");
    dotCanvas.width = dotCanvas.height = 64;
    const dctx = dotCanvas.getContext("2d")!;
    const grad = dctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.5, "rgba(255,255,255,0.4)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    dctx.fillStyle = grad;
    dctx.fillRect(0, 0, 64, 64);
    const dotTex = new THREE.CanvasTexture(dotCanvas);

    const pMat = new THREE.PointsMaterial({
      size: 0.034,
      map: dotTex,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      color: 0xffffff,
      opacity: 0.7,
    });
    const points = new THREE.Points(pGeom, pMat);
    // Add to scene root, not the orb group, so particles orbit independently.
    scene.add(points);

    /* ---------------- animation loop ---------------- */
    let raf = 0;
    let prev = performance.now();
    const start = prev;
    const _v = new THREE.Vector3();
    const _axis = new THREE.Vector3();
    const animate = () => {
      const now = performance.now();
      const dt = Math.min((now - prev) / 1000, 0.05);
      prev = now;
      const t = (now - start) / 1000;

      // Slow, tidy rotation
      group.rotation.y = t * 0.16;
      group.rotation.x = Math.sin(t * 0.2) * 0.06;

      // Particles orbit each on their own axis at their own speed
      const arr = pGeom.attributes.position.array as Float32Array;
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const ix = i * 3;
        _v.set(arr[ix], arr[ix + 1], arr[ix + 2]);
        _axis.set(axes[ix], axes[ix + 1], axes[ix + 2]);
        _v.applyAxisAngle(_axis, speeds[i] * dt);
        arr[ix] = _v.x;
        arr[ix + 1] = _v.y;
        arr[ix + 2] = _v.z;
      }
      pGeom.attributes.position.needsUpdate = true;

      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    };
    animate();

    /* ---------------- resize ---------------- */
    const onResize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      if (!w || !h) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(mount);

    /* ---------------- cleanup ---------------- */
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      orbGeom.dispose();
      orbMat.dispose();
      pGeom.dispose();
      pMat.dispose();
      fineTex.dispose();
      blobTex.dispose();
      dotTex.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div ref={mountRef} className={className} aria-hidden />;
}
