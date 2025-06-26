import * as THREE from 'three';
import { GLTFLoader } from 'GLTFLoader';

class CarSelector {
  constructor() {
    this.carModels = [
      { name: 'Car1', path: '../model/car1.glb' },
      { name: 'Car2', path: '../model/car2.glb' },
      { name: 'Car3', path: '../model/car3.glb' },
      { name: 'Car4', path: '../model/car4.glb' },
      { name: 'Car5', path: '../model/car5.glb' },
      { name: 'Car6', path: '../model/car6.glb' }
    ];
    this.currentCarIndex = 0;
    this.loader = new GLTFLoader();
    this.backgroundMusic = null;
    this.isMusicPlaying = false;
    this.musicOnIcon = '../pic/music_on.png';
    this.musicOffIcon = '../pic/music_mute.png';
    this.musicPath = '../music/MIX.mp3';

    this.init();
    this.setupControls();
    this.setupMusic();
    this.setupMouseControls();
    this.loadCurrentCar();
  }

  init() {
    const canvas = document.getElementById('carViewer');
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf0f0f0);

    this.camera = new THREE.PerspectiveCamera(75, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
    this.camera.position.set(5, 3, 5);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 5);
    directionalLight.castShadow = true;
    this.scene.add(directionalLight);

    const platform = new THREE.Mesh(
      new THREE.CylinderGeometry(3, 3, 0.2, 32),
      new THREE.MeshLambertMaterial({ color: 0xe0e0e0, transparent: true, opacity: 0.8 })
    );
    platform.position.y = -0.1;
    platform.receiveShadow = true;
    this.scene.add(platform);

    this.animate();
  }

  setupControls() {
    document.getElementById('prevBtn').onclick = () => this.previousCar();
    document.getElementById('nextBtn').onclick = () => this.nextCar();
    document.getElementById('playBtn').onclick = () => this.startGame();
    this.updateButtons();
  }

  setupMusic() {
    this.backgroundMusic = new Audio(this.musicPath);
    this.backgroundMusic.loop = true;
    this.backgroundMusic.volume = 0.3;

    const toggle = document.getElementById('musicToggle');
    const icon = document.getElementById('musicIcon');
    toggle.onclick = () => this.toggleMusic();
    document.addEventListener('click', () => this.playMusic(), { once: true });
  }

  toggleMusic() {
    this.isMusicPlaying ? this.pauseMusic() : this.playMusic();
  }
  playMusic() {
    const icon = document.getElementById('musicIcon');
    const toggle = document.getElementById('musicToggle');
    this.backgroundMusic.play().then(() => {
      this.isMusicPlaying = true;
      icon.src = this.musicOnIcon;
      toggle.classList.remove('muted');
    });
  }
  pauseMusic() {
    const icon = document.getElementById('musicIcon');
    const toggle = document.getElementById('musicToggle');
    this.backgroundMusic.pause();
    this.isMusicPlaying = false;
    icon.src = this.musicOffIcon;
    toggle.classList.add('muted');
  }
  stopMusic() {
    if (this.backgroundMusic) {
      this.backgroundMusic.pause();
      this.backgroundMusic.currentTime = 0;
      this.isMusicPlaying = false;
    }
  }

  previousCar() {
    if (this.currentCarIndex > 0) {
      this.currentCarIndex--;
      this.loadCurrentCar();
      this.updateButtons();
    }
  }
  nextCar() {
    if (this.currentCarIndex < this.carModels.length - 1) {
      this.currentCarIndex++;
      this.loadCurrentCar();
      this.updateButtons();
    }
  }
  updateButtons() {
    document.getElementById('prevBtn').disabled = this.currentCarIndex === 0;
    document.getElementById('nextBtn').disabled = this.currentCarIndex === this.carModels.length - 1;
  }

  loadCurrentCar() {
    if (this.currentCar) this.scene.remove(this.currentCar);
    document.getElementById('carInfo').textContent = this.carModels[this.currentCarIndex].name;

    this.loader.load(this.carModels[this.currentCarIndex].path, (gltf) => {
      this.currentCar = gltf.scene;
      this.currentCar.scale.set(1, 1, 1);
      this.currentCar.position.set(0, 0, 0);
      this.currentCar.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      this.scene.add(this.currentCar);
    });
  }

  setupMouseControls() {
    const canvas = document.getElementById('carViewer');
    this.isMouseDown = false;
    this.mouseX = 0;
    this.mouseY = 0;
    this.rotationSpeed = 0.005;
    this.zoomSpeed = 0.1;
    this.minZoom = 2;
    this.maxZoom = 15;

    canvas.addEventListener('mousedown', (e) => {
      this.isMouseDown = true;
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
      canvas.style.cursor = 'grabbing';
    });
    canvas.addEventListener('mousemove', (e) => {
      if (!this.isMouseDown) return;
      const dx = e.clientX - this.mouseX;
      const dy = e.clientY - this.mouseY;
      const s = new THREE.Spherical().setFromVector3(this.camera.position);
      s.theta -= dx * this.rotationSpeed;
      s.phi += dy * this.rotationSpeed;
      s.phi = Math.max(0.1, Math.min(Math.PI - 0.1, s.phi));
      this.camera.position.setFromSpherical(s);
      this.camera.lookAt(0, 0, 0);
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
    });
    canvas.addEventListener('mouseup', () => {
      this.isMouseDown = false;
      canvas.style.cursor = 'grab';
    });
    canvas.addEventListener('mouseleave', () => {
      this.isMouseDown = false;
      canvas.style.cursor = 'grab';
    });
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const d = this.camera.position.length();
      const nd = d + e.deltaY * this.zoomSpeed * 0.01;
      if (nd >= this.minZoom && nd <= this.maxZoom) {
        this.camera.position.setLength(nd);
      }
    });
    canvas.style.cursor = 'grab';
  }

  startGame() {
    this.stopMusic();
    document.querySelector('.selector-container').style.display = 'none';
    const selectedCar = this.carModels[this.currentCarIndex];
    import('./Game.js').then(module => new module.Game(selectedCar));
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    if (this.currentCar) this.currentCar.rotation.y += 0.01;
    this.renderer.render(this.scene, this.camera);
  }
}
new CarSelector();
window.addEventListener('resize', () => {
  const canvas = document.getElementById('carViewer');
  const aspect = canvas.clientWidth / canvas.clientHeight;
  const selector = window.carSelector;
  if (selector && selector.camera && selector.renderer) {
    selector.camera.aspect = aspect;
    selector.camera.updateProjectionMatrix();
    selector.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
  }
});
