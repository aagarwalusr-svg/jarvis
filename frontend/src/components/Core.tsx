"use client";
import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function Core({ active }: { active: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const activity = useRef(active);
  useEffect(() => {
    activity.current = active;
  }, [active]);
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    } catch {
      return;
    } // The CSS orbital core remains visible if WebGL is unavailable.
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    element.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    camera.position.z = 5.5;
    const group = new THREE.Group();
    scene.add(group);
    const geometry = new THREE.IcosahedronGeometry(1.1, 2);
    const material = new THREE.MeshBasicMaterial({
      color: 0x45dcff,
      wireframe: true,
      transparent: true,
      opacity: 0.48,
    });
    const sphere = new THREE.Mesh(geometry, material);
    group.add(sphere);
    const innerGeometry = new THREE.IcosahedronGeometry(0.73, 1);
    const innerMaterial = new THREE.MeshBasicMaterial({
      color: 0x8aedff,
      wireframe: true,
      transparent: true,
      opacity: 0.7,
    });
    const inner = new THREE.Mesh(innerGeometry, innerMaterial);
    group.add(inner);
    const rings: THREE.Mesh[] = [];
    for (let i = 0; i < 3; i++) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(1.45 + i * 0.18, 0.008, 8, 140),
        new THREE.MeshBasicMaterial({
          color: 0x24bfe8,
          transparent: true,
          opacity: 0.6 - i * 0.12,
        }),
      );
      ring.rotation.set(i * 0.6 + 0.6, i * 0.4, i * 0.2);
      group.add(ring);
      rings.push(ring);
    }
    const positions = new Float32Array(240 * 3);
    for (let i = 0; i < positions.length; i++)
      positions[i] = (Math.random() - 0.5) * 5;
    const particlesGeometry = new THREE.BufferGeometry();
    particlesGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, 3),
    );
    const particlesMaterial = new THREE.PointsMaterial({
      color: 0x70e5ff,
      size: 0.014,
      transparent: true,
      opacity: 0.7,
    });
    const particles = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particles);
    const resize = () => {
      const width = element.clientWidth;
      const height = element.clientHeight;
      renderer.setSize(width, height);
      camera.aspect = width / Math.max(height, 1);
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    resize();
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    let frame = 0;
    let time = 0;
    const render = () => {
      if (!reduced && !document.hidden) {
        time += activity.current ? 0.018 : 0.005;
        sphere.rotation.y = time;
        sphere.rotation.x = time * 0.35;
        inner.rotation.y = -time;
        rings.forEach((ring, i) => {
          ring.rotation.z = time * (i + 1) * 0.25;
        });
        particles.rotation.y = time * 0.1;
        group.scale.setScalar(1 + Math.sin(time * 3) * 0.025);
      }
      renderer.render(scene, camera);
      frame = requestAnimationFrame(render);
    };
    render();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      geometry.dispose();
      material.dispose();
      innerGeometry.dispose();
      innerMaterial.dispose();
      rings.forEach((r) => {
        r.geometry.dispose();
        (r.material as THREE.Material).dispose();
      });
      particlesGeometry.dispose();
      particlesMaterial.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);
  return (
    <div className="core-stage">
      <div className="core-halo" />
      <div className="core-fallback" />
      <div
        ref={host}
        className="core-canvas"
        aria-label="Animated holographic JARVIS core"
        role="img"
      />
      <div className="holo-name">
        <strong>J A R V I S</strong>
        <span>AI CORE · {active ? "ACTIVE" : "STANDBY"}</span>
      </div>
      <span className="core-coordinate top-left">NEURAL ENGINE / 01</span>
      <span className="core-coordinate bottom-right">J.A.R.V.I.S.</span>
    </div>
  );
}
