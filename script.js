import * as THREE from "three";
import { GLTFLoader } from "https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js";

const MODEL_URL = "./models/headphone.glb";

function scene(canvas, hero=false){
  const renderer = new THREE.WebGLRenderer({ canvas, antialias:true, alpha:true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;

  const sc = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.01, 100);
  camera.position.set(0, 0.1, hero ? 5.2 : 4.2);

  sc.add(new THREE.HemisphereLight(0xffffff, 0x111118, 2.2));

  const key = new THREE.DirectionalLight(0xffffff, 4);
  key.position.set(4,5,5);
  sc.add(key);

  const cyan = new THREE.PointLight(0x00e5ff, 15, 12);
  cyan.position.set(-4,2,3);
  sc.add(cyan);

  const red = new THREE.PointLight(0xff3155, 12, 10);
  red.position.set(4,-1,2);
  sc.add(red);

  // Front/fill lights: keep the black finish visible instead of turning
  // into a silhouette against the dark background.
  const front = new THREE.DirectionalLight(0xffffff, 5.5);
  front.position.set(0, 2.5, 6);
  sc.add(front);

  const leftFill = new THREE.DirectionalLight(0x9beeff, 3.2);
  leftFill.position.set(-5, 1.5, 2.5);
  sc.add(leftFill);

  const rightFill = new THREE.DirectionalLight(0xff8fa3, 2.4);
  rightFill.position.set(5, 1, 2);
  sc.add(rightFill);

  const group = new THREE.Group();
  sc.add(group);

  // Fallback 3D headphone so the page remains visible even if the GLB fails.
  const material = new THREE.MeshStandardMaterial({
    color:0x101014, metalness:0.7, roughness:0.2
  });
  const band = new THREE.Mesh(
    new THREE.TorusGeometry(1.15,0.09,24,96,Math.PI), material
  );
  band.rotation.z = Math.PI;
  band.position.y = 0.45;
  group.add(band);

  [-1.15,1.15].forEach(x=>{
    const cup = new THREE.Mesh(
      new THREE.CylinderGeometry(0.52,0.6,0.35,48), material
    );
    cup.rotation.z = Math.PI/2;
    cup.position.set(x,-0.05,0);
    group.add(cup);
  });

  let loaded = false;

  new GLTFLoader().load(
    MODEL_URL,
    gltf=>{
      group.clear();
      const model = gltf.scene;
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const scale = 2.7 / Math.max(size.x,size.y,size.z);
      model.scale.setScalar(scale);
      model.position.sub(center.multiplyScalar(scale));

      // Premium studio lighting/material pass so dark headphone models
      // retain visible shape and surface detail.
      model.traverse(obj => {
        if (obj.isMesh) {
          obj.castShadow = true;
          obj.receiveShadow = true;
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          mats.forEach(mat => {
            if (!mat) return;
            if ("roughness" in mat) mat.roughness = Math.min(mat.roughness ?? 0.35, 0.38);
            if ("metalness" in mat) mat.metalness = Math.min(mat.metalness ?? 0.5, 0.72);
            if ("emissive" in mat) {
              mat.emissive.setRGB(0.035, 0.035, 0.045);
              mat.emissiveIntensity = 0.55;
            }
            if ("envMapIntensity" in mat) mat.envMapIntensity = 1.6;
            mat.needsUpdate = true;
          });
        }
      });

      group.add(model);
      loaded = true;
    },
    undefined,
    error=>{
      console.warn("Could not load headphone.glb; using built-in fallback.", error);
    }
  );

  // Reliable mouse + touch rotation; no OrbitControls dependency.
  let targetX = 0;
  let targetY = 0;
  let currentX = 0;
  let currentY = 0;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;

  const pointerDown = e=>{
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    canvas.setPointerCapture?.(e.pointerId);
  };
  const pointerMove = e=>{
    if(!dragging) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    targetX += dx * 0.012;
    targetY += dy * 0.008;
    targetY = Math.max(-0.45, Math.min(0.45, targetY));
    lastX = e.clientX;
    lastY = e.clientY;
  };
  const pointerUp = ()=>{ dragging = false; };

  canvas.style.touchAction = "none";
  canvas.addEventListener("pointerdown", pointerDown);
  canvas.addEventListener("pointermove", pointerMove);
  canvas.addEventListener("pointerup", pointerUp);
  canvas.addEventListener("pointercancel", pointerUp);
  canvas.addEventListener("pointerleave", pointerUp);

  const resize=()=>{
    const q=canvas.getBoundingClientRect();
    const w=Math.max(1,q.width);
    const h=Math.max(1,q.height);
    renderer.setSize(w,h,false);
    camera.aspect=w/h;
    camera.updateProjectionMatrix();
  };
  new ResizeObserver(resize).observe(canvas);
  resize();

  function animate(){
    requestAnimationFrame(animate);

    if(!dragging) targetX += 0.0018;
    currentX += (targetX-currentX)*0.07;
    currentY += (targetY-currentY)*0.07;

    group.rotation.y = currentX;
    group.rotation.x = currentY;

    renderer.render(sc,camera);
  }
  animate();

  return group;
}

const hero = scene(document.querySelector("#hero-canvas"), true);
const product = scene(document.querySelector("#product-canvas"));

addEventListener("scroll",()=>{
  document.querySelector(".nav").classList.toggle("scrolled", scrollY>40);
  hero.rotation.y += 0.0008;
  product.rotation.y += 0.0005;
});

let cart=0;
window.addToCart=()=>{
  cart=1;
  document.querySelector("#cartCount").textContent=cart;
  toast("SONIC X1 added to cart.");
};
window.openCart=()=>document.querySelector("#cartModal").classList.add("show");
window.closeCart=()=>document.querySelector("#cartModal").classList.remove("show");
window.checkout=()=>openAbhinavModal();
window.buyNow=()=>openAbhinavModal();
window.openAbhinavModal=()=>document.querySelector("#abhinavModal").classList.add("show");
window.closeAbhinavModal=()=>document.querySelector("#abhinavModal").classList.remove("show");

function toast(message){
  const e=document.querySelector("#toast");
  e.textContent=message;
  e.classList.add("show");
  setTimeout(()=>e.classList.remove("show"),2200);
}

addEventListener("load",()=>{
  setTimeout(()=>{
    const l=document.querySelector("#loader");
    if(l){
      l.style.opacity="0";
      setTimeout(()=>l.remove(),700);
    }
  },900);
});

document.querySelector("#abhinavModal")?.addEventListener("click", e=>{
  if(e.target.id==="abhinavModal") closeAbhinavModal();
});
