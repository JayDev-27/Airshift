import React, { useEffect, useRef, useState } from 'react';
import { Box, Minus, Plus, RotateCcw } from 'lucide-react';
import {
  AmbientLight, BufferGeometry, Color, DirectionalLight, ExtrudeGeometry, Float32BufferAttribute,
  Fog, HemisphereLight, Mesh, MeshLambertMaterial, OrthographicCamera, PlaneGeometry,
  PCFShadowMap, Scene, Shape, ShapeGeometry, Vector3, WebGLRenderer
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const startView = { angle: .68, zoom: 1 };
const tones = { good: '#a6ce67', moderate: '#ddc351', poor: '#e9b05d', 'very-poor': '#f1a053', severe: '#edaa4d' };
let atlasRequest;

function atlasData() {
  atlasRequest ??= fetch(`${import.meta.env.BASE_URL}atlas/old-delhi.json`).then(response => {
    if (!response.ok) throw new Error('City model unavailable');
    return response.json();
  }).catch(error => { atlasRequest = null; throw error; });
  return atlasRequest;
}

function shapeFrom(points) {
  const shape = new Shape();
  points.forEach(([x, z], index) => index ? shape.lineTo(x, -z) : shape.moveTo(x, -z));
  shape.closePath();
  return shape;
}

function quad(vertices, x, z, nx, nz, halfWidth) {
  const length = Math.hypot(nx - x, nz - z);
  if (!length) return;
  const dx = -(nz - z) / length * halfWidth;
  const dz = (nx - x) / length * halfWidth;
  const a = [x + dx, .3, z + dz], b = [nx + dx, .3, nz + dz];
  const c = [nx - dx, .3, nz - dz], d = [x - dx, .3, z - dz];
  vertices.push(...a, ...b, ...c, ...a, ...c, ...d);
}

function addCity(scene, data) {
  const ground = new Mesh(new PlaneGeometry(6800, 6800), new MeshLambertMaterial({ color: '#d8dedb' }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  for (const wet of [0, 1]) {
    const patches = data.parks.filter(([water]) => water === wet).map(([, points]) => {
      const geometry = new ShapeGeometry(shapeFrom(points));
      geometry.rotateX(-Math.PI / 2);
      geometry.translate(0, .13, 0);
      return geometry;
    });
    if (!patches.length) continue;
    const park = new Mesh(mergeGeometries(patches), new MeshLambertMaterial({ color: wet ? '#a8bdbe' : '#bec8b4' }));
    park.receiveShadow = true;
    scene.add(park);
    patches.forEach(patch => patch.dispose());
  }

  for (const major of [false, true]) {
    const vertices = [];
    for (const [width, path] of data.roads) {
      if ((width >= 7) !== major) continue;
      for (let i = 1; i < path.length; i++) quad(vertices, ...path[i - 1], ...path[i], width / 2 + 1);
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3));
    geometry.computeVertexNormals();
    const roads = new Mesh(geometry, new MeshLambertMaterial({ color: major ? '#b6beb9' : '#e3e6df' }));
    roads.receiveShadow = true;
    scene.add(roads);
  }

  const footprints = [...data.buildings, ...data.infill].map(([height, points], index) => {
    const roof = height || 13 + (index * 29 % 18);
    const geometry = new ExtrudeGeometry(shapeFrom(points), { depth: Math.max(5, roof) * 1.7, bevelEnabled: false });
    geometry.rotateX(-Math.PI / 2);
    return geometry;
  });
  const buildings = mergeGeometries(footprints);
  footprints.forEach(geometry => geometry.dispose());
  const positions = buildings.attributes.position;
  const colors = new Float32Array(positions.count * 3);
  buildings.setAttribute('color', new Float32BufferAttribute(colors, 3));
  const city = new Mesh(buildings, new MeshLambertMaterial({ vertexColors: true }));
  city.castShadow = true;
  city.receiveShadow = true;
  scene.add(city);

  function colorBuildings(tone, tinted) {
    const stone = new Color('#fbfcf8');
    const shade = new Color('#ccd4c9');
    const glow = new Color(tones[tone] ?? tones.severe);
    const color = new Color();
    const attribute = buildings.attributes.color;
    for (let index = 0; index < positions.count; index++) {
      const x = positions.getX(index);
      const z = positions.getZ(index);
      const y = positions.getY(index);
      const distance = Math.abs(z + .47 * x - 55);
      const weight = tinted ? Math.max(0, 1 - distance / 310) * .87 : 0;
      color.copy(stone).lerp(shade, .34 - Math.min(.27, y / 145)).lerp(glow, weight);
      attribute.setXYZ(index, color.r, color.g, color.b);
    }
    attribute.needsUpdate = true;
  }

  return colorBuildings;
}

function setup(canvas, data) {
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;
  const scene = new Scene();
  scene.background = new Color('#d6dcd9');
  scene.fog = new Fog('#d6dcd9', 1350, 2580);
  const camera = new OrthographicCamera(-500, 500, 320, -320, 10, 5800);
  scene.add(new AmbientLight('#d6ddd5', .42));
  scene.add(new HemisphereLight('#fffdf5', '#888e84', 1.45));
  const sun = new DirectionalLight('#fff9e7', 2.05);
  sun.position.set(-650, 1000, 320);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1536, 1536);
  sun.shadow.camera.left = -1050;
  sun.shadow.camera.right = 1050;
  sun.shadow.camera.top = 900;
  sun.shadow.camera.bottom = -900;
  sun.shadow.camera.far = 2650;
  sun.shadow.bias = -.0008;
  sun.shadow.normalBias = .5;
  scene.add(sun);
  const updateColors = addCity(scene, data);
  const widthAt = () => canvas.clientWidth;
  const heightAt = () => canvas.clientHeight;

  function draw(view) {
    const width = widthAt(), height = heightAt();
    if (!width || !height) return {};
    const aspect = width / height;
    const halfWidth = (aspect > 1.45 ? 820 : 420) / view.zoom;
    camera.left = -halfWidth;
    camera.right = halfWidth;
    camera.top = halfWidth / aspect;
    camera.bottom = -camera.top;
    const target = new Vector3(-180, 12, -45);
    camera.position.set(target.x + Math.sin(view.angle) * 1060, 980, target.z + Math.cos(view.angle) * 1060);
    camera.lookAt(target);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    if (canvas.width !== Math.floor(width * renderer.getPixelRatio()) ||
      canvas.height !== Math.floor(height * renderer.getPixelRatio())) renderer.setSize(width, height, false);
    renderer.render(scene, camera);
    return Object.fromEntries(Object.entries(data.landmarks).map(([name, [x, z]]) => {
      const point = new Vector3(x, 25, z).project(camera);
      return [name, { x: (point.x + 1) * 50, y: (1 - point.y) * 50 }];
    }));
  }

  function dispose() {
    scene.traverse(object => {
      object.geometry?.dispose();
      object.material?.dispose();
    });
    sun.shadow.dispose();
    renderer.dispose();
  }

  return { draw, updateColors, dispose };
}

export default function CityModel({ tone, tinted }) {
  const canvas = useRef(null);
  const renderer = useRef(null);
  const drag = useRef(null);
  const frame = useRef(null);
  const flight = useRef(null);
  const view = useRef({ ...startView });
  const palette = useRef({ tone, tinted });
  const [state, setState] = useState('loading');
  const [labels, setLabels] = useState({});
  const [zoom, setZoom] = useState(startView.zoom);

  function repaint() {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      if (renderer.current) setLabels(renderer.current.draw(view.current));
    });
  }

  useEffect(() => {
    const element = canvas.current;
    let disposed = false;
    let observer;
    function useFallback() {
      if (disposed) return;
      observer?.disconnect();
      cancelAnimationFrame(frame.current);
      cancelAnimationFrame(flight.current);
      renderer.current?.dispose();
      renderer.current = null;
      setState('fallback');
    }
    element.addEventListener('webglcontextlost', useFallback);
    atlasData().then(data => {
      if (disposed) return;
      renderer.current = setup(element, data);
      renderer.current.updateColors(palette.current.tone, palette.current.tinted);
      const firstFrame = () => {
        if (!element.clientWidth || !element.clientHeight) return;
        setLabels(renderer.current.draw(view.current));
        setState('ready');
        observer.disconnect();
        observer = new ResizeObserver(repaint);
        observer.observe(element);
      };
      observer = new ResizeObserver(firstFrame);
      observer.observe(element);
      firstFrame();
    }).catch(useFallback);
    return () => {
      disposed = true;
      observer?.disconnect();
      element.removeEventListener('webglcontextlost', useFallback);
      cancelAnimationFrame(frame.current);
      cancelAnimationFrame(flight.current);
      renderer.current?.dispose();
      renderer.current = null;
    };
  }, []);

  useEffect(() => {
    palette.current = { tone, tinted };
    renderer.current?.updateColors(tone, tinted);
    repaint();
  }, [tone, tinted]);

  function moveCamera(next) {
    cancelAnimationFrame(flight.current);
    setZoom(next.zoom);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !renderer.current) {
      view.current = next;
      repaint();
      return;
    }
    const previous = { ...view.current };
    const start = performance.now();
    const step = time => {
      const progress = Math.min(1, Math.max(0, (time - start) / 380));
      const amount = 1 - (1 - progress) ** 3;
      view.current = {
        zoom: previous.zoom + (next.zoom - previous.zoom) * amount,
        angle: previous.angle + (next.angle - previous.angle) * amount
      };
      setLabels(renderer.current.draw(view.current));
      if (progress < 1) flight.current = requestAnimationFrame(step);
    };
    flight.current = requestAnimationFrame(step);
  }

  function changeZoom(amount) {
    moveCamera({ angle: view.current.angle, zoom: Math.max(.8, Math.min(1.85, zoom + amount)) });
  }

  function reset() {
    const turn = 2 * Math.PI;
    const nearest = startView.angle + turn * Math.round((view.current.angle - startView.angle) / turn);
    moveCamera({ ...startView, angle: nearest });
  }

  return <>
    <div className={`model-visual model-${state}`} data-tint={tinted} style={{ '--model-zoom': zoom }}>
      <canvas ref={canvas} className="model-canvas" aria-label="Interactive 3D model of Old Delhi. Use left and right arrow keys to rotate." tabIndex={state === 'ready' ? 0 : -1}
        onKeyDown={event => {
          if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
          event.preventDefault();
          moveCamera({ zoom, angle: view.current.angle + (event.key === 'ArrowRight' ? .16 : -.16) });
        }}
        onPointerDown={event => {
          if (state !== 'ready' || event.button !== 0) return;
          cancelAnimationFrame(flight.current);
          setZoom(view.current.zoom);
          drag.current = { x: event.clientX, angle: view.current.angle };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={event => {
          if (!drag.current) return;
          view.current.angle = drag.current.angle + (event.clientX - drag.current.x) * .004;
          repaint();
        }}
        onLostPointerCapture={() => { drag.current = null; }} />
      {state === 'ready' && Object.entries(labels).map(([name, point]) =>
        point.x > 4 && point.x < 91 && point.y > 25 && point.y < 68 &&
        <div className="model-pin" key={name} style={{ left: `${point.x}%`, top: `${point.y}%` }}><i />{name}</div>
      )}
    </div>
    <div className="model-controls" role="group" aria-label="City model controls">
      <button onClick={() => changeZoom(.18)} aria-label="Zoom in" title="Zoom in" disabled={zoom >= 1.85}><Plus size={17} /></button>
      <button onClick={() => changeZoom(-.18)} aria-label="Zoom out" title="Zoom out" disabled={zoom <= .8}><Minus size={17} /></button>
      <button onClick={reset} aria-label="Reset city view" title="Reset city view"><RotateCcw size={15} /></button>
    </div>
    <div className="model-credit">
      <Box size={13} /> {state === 'ready' ? 'Stylized Old Delhi model' : 'Old Delhi model preview'}
      <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap</a>
    </div>
  </>;
}
