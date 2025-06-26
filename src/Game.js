import * as THREE from 'three';
import * as CANNON from 'cannon';
import {GLTFLoader} from 'GLTFLoader';
import { TeapotGeometry } from 'TeapotGeometry';
import { createRoad } from '../src/road.js';
import { createTrafficCone, createRoadBarriers, updateTrafficCones } from '../src/traffic.js';
import { createTeaPot, spawnTeaPots, checkTeaPotCollision, collectTeaPot, updateScoreDisplay, showCollectEffect, spawnNewTeaPot, updateTeaPotAnimations } from '../src/teapot.js';
import { createFirework, triggerFireworks, updateFireworks, explodeFirework } from '../src/fireworks.js';
import { createHouses, isPositionOccupied, loadHouseModel } from '../src/house.js';
import { createTrees, createForestArea, createPineTree, isPositionOnRoad } from '../src/tree.js';
import { CannonHelper } from '../src/helper.js';
import { ChunkManager } from '../src/chunking.js';
import { createBotCars, updateBotCars } from '../src/agent.js';

export class Game {
  constructor(selectedCar) {
    this.selectedCar = selectedCar;
    this.container = document.createElement('div');
    this.container.style.height = '100%';
    document.body.appendChild(this.container);
    this.keys = { w: false, s: false, a: false, d: false };
    this.clock = new THREE.Clock();
    this.fixedTimeStep = 1.0 / 60.0;
    this.debug = true;
    this.debugPhysics = true;
    this.lastTime = undefined;
    this.FPSFactor = 1;
    this.score = 0;
    this.teaPots = [];
    this.maxTeaPots = 50;
    this.fireworks = [];
    this.botCars = [];
    this.maxBotCars = 20;
    this.botCarModels = [
      '../model/agent1.glb',
      '../model/agent2.glb',
      '../model/agent3.glb',
      '../model/agent4.glb'
    ];
    this.minimap = {
    canvas: null,
    ctx: null,
    size: 200,
    scale: 0.1, 
    centerX: 100,
    centerY: 100
  };
    this.engineSound = new Audio('../music/car.mp3');
    this.engineSound.loop = true;
    this.engineSound.volume = 0;
    this.previousCameraPosition = new THREE.Vector3();
    this.previousCameraTarget = new THREE.Vector3();
    this.currentSteerValue = 0;
    this.resetPosition = new THREE.Vector3(0, 2, 0);
    this.resetRotation = new THREE.Quaternion(0, 0, 0, 1);
    this.houseFiles = [
      '../model/house1.glb',
      '../model/house2.glb',
      '../model/house3.glb',
    ];
    this.houses = [];
    this.occupiedPositions = [];
    
    this.init();
    this.initCameraPosition();
    this.setupKeyboardControls();
  }
  createMinimap() {
  const minimapDiv = document.createElement('div');
  minimapDiv.style.position = 'absolute';
  minimapDiv.style.top = '20px';
  minimapDiv.style.right = '20px';
  minimapDiv.style.width = this.minimap.size + 'px';
  minimapDiv.style.height = this.minimap.size + 'px';
  minimapDiv.style.border = '3px solid white';
  minimapDiv.style.borderRadius = '10px';
  minimapDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
  minimapDiv.style.zIndex = '1000';
  minimapDiv.style.overflow = 'hidden';
  const canvas = document.createElement('canvas');
  canvas.width = this.minimap.size;
  canvas.height = this.minimap.size;
  canvas.style.display = 'block';
  minimapDiv.appendChild(canvas);
  document.body.appendChild(minimapDiv);
  this.minimap.canvas = canvas;
  this.minimap.ctx = canvas.getContext('2d');
  this.drawRoadOnMinimap();
}
  drawRoadOnMinimap() {
    const ctx = this.minimap.ctx;
    const scale = this.minimap.scale;
    ctx.clearRect(0, 0, this.minimap.size, this.minimap.size);

    ctx.fillStyle = '#2d5016';
    ctx.fillRect(0, 0, this.minimap.size, this.minimap.size);
    if (this.roadPoints && this.roadPoints.length > 0) {
      ctx.strokeStyle = '#444444';
      ctx.lineWidth = 4;
      ctx.beginPath();

      for (let i = 0; i < this.roadPoints.length; i++) {
        const point = this.roadPoints[i];
        const x = this.minimap.centerX + point.x * scale;
        const y = this.minimap.centerY + point.z * scale;
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.closePath();
      ctx.stroke();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 6;
      ctx.stroke();
      
      ctx.strokeStyle = '#444444';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  }

  updateMinimap() {
    if (!this.minimap.canvas || !this.vehicle || !this.vehicle.chassisBody) return;
    
    const ctx = this.minimap.ctx;
    const carPos = this.vehicle.chassisBody.position;
    const carQuat = this.vehicle.chassisBody.quaternion;
    this.drawRoadOnMinimap();
    const carX = this.minimap.centerX + carPos.x * this.minimap.scale;
    const carY = this.minimap.centerY + carPos.z * this.minimap.scale;
    const carRotation = Math.atan2(
      2 * (carQuat.y * carQuat.w - carQuat.x * carQuat.z),
      1 - 2 * (carQuat.y * carQuat.y + carQuat.z * carQuat.z)
    );
    ctx.save();
    ctx.translate(carX, carY);
    ctx.rotate(carRotation);
    
    ctx.fillStyle = '#ff0000';
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    if (this.teaPots && this.teaPots.length > 0) {
      ctx.fillStyle = '#00ff00';
      this.teaPots.forEach(teapot => {
        if (teapot.mesh && teapot.mesh.visible) {
          const teapotX = this.minimap.centerX + teapot.mesh.position.x * this.minimap.scale;
          const teapotY = this.minimap.centerY + teapot.mesh.position.z * this.minimap.scale;
          ctx.beginPath();
          ctx.arc(teapotX, teapotY, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    }
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, this.minimap.size, this.minimap.size);
  }

    init() {
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 20000);
        this.camera.position.set(0, 10, 15);

        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.Fog(0x888888, 100, 2000);
        this.createSkybox();
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.container.appendChild(this.renderer.domElement);
        this.helper = new CannonHelper(this.scene);
        this.helper.addLights(this.renderer);
        this.followCam = new THREE.Object3D();
        this.followCam.position.copy(this.camera.position);
        this.scene.add(this.followCam);
        window.addEventListener('resize', () => this.onWindowResize(), false);
        const instructions = document.createElement('div');
        instructions.style.position = 'absolute';
        instructions.style.top = '20px';
        instructions.style.width = '100%';
        instructions.style.textAlign = 'center';
        instructions.style.color = 'white';
        instructions.style.fontSize = '20px';
        instructions.style.fontFamily = 'Arial';
        instructions.style.textShadow = '0 0 3px black';
        instructions.innerHTML = 'Sử dụng phím W,A,S,D để điều khiển xe<br>W: Tăng tốc, S: Phanh/Lùi, A/D: Rẽ trái/phải';
        document.body.appendChild(instructions);
  setTimeout(() => {
    instructions.style.opacity = '0';
    instructions.style.transition = 'opacity 1s';
  }, 5000);
        createRoad(this);
        this.initPhysics();
        this.createScoreUI();
        this.addSpeedometer();
        spawnTeaPots(this);
    }
    createScoreUI() {
        const scoreDiv = document.createElement('div');
        scoreDiv.id = 'scoreDisplay';
        scoreDiv.style.position = 'absolute';
        scoreDiv.style.top = '20px';
        scoreDiv.style.left = '20px';
        scoreDiv.style.background = 'rgba(0, 100, 0, 0.8)';
        scoreDiv.style.color = 'white';
        scoreDiv.style.padding = '15px 20px';
        scoreDiv.style.borderRadius = '10px';
        scoreDiv.style.fontFamily = 'Arial';
        scoreDiv.style.fontSize = '24px';
        scoreDiv.style.fontWeight = 'bold';
        scoreDiv.style.textAlign = 'center';
        scoreDiv.style.zIndex = '1000';
        scoreDiv.style.border = '2px solid white';
        scoreDiv.textContent = 'SCORE: 0';
        document.body.appendChild(scoreDiv);
        this.scoreDiv = scoreDiv;
    }
    createSkybox() {
        const skyboxTextures = [
        '../pic/skybox/divine_rt.jpg', 
        '../pic/skybox/divine_lf.jpg',   
        '../pic/skybox/divine_dn.jpg', 
        '../pic/skybox/divine_up.jpg', 
        '../pic/skybox/divine_ft.jpg', 
        '../pic/skybox/divine_bk.jpg'  
        ];
        const loader = new THREE.CubeTextureLoader();
        loader.load(
            skyboxTextures,
            (cubeTexture) => {
            const skyboxGeo = new THREE.BoxGeometry(1000, 1000, 1000);
            const skyboxMat = new THREE.MeshBasicMaterial({
                envMap: cubeTexture,
                side: THREE.BackSide
            });
            this.skybox = new THREE.Mesh(skyboxGeo, skyboxMat);
            this.scene.add(this.skybox);
            }
        );
    }
    updateSkybox() {
        if (this.skybox) {
        this.skybox.position.copy(this.camera.position);
        }
    }
    setupKeyboardControls() {
        document.addEventListener('keydown', (event) => {
            switch (event.key.toLowerCase()) {
                case 'w': this.keys.w = true; break;
                case 's': this.keys.s = true; break;
                case 'a': this.keys.a = true; break;
                case 'd': this.keys.d = true; break;
                case 'r': 
                this.resetCar();
                break;
            }
        });
        document.addEventListener('keyup', (event) => {
            switch (event.key.toLowerCase()) {
                case 'w': this.keys.w = false; break;
                case 's': this.keys.s = false; break;
                case 'a': this.keys.a = false; break;
                case 'd': this.keys.d = false; break;
            }
        });
    }
    resetCar() {
        if (!this.vehicle || !this.vehicle.chassisBody) return;
        const currentPos = this.vehicle.chassisBody.position;
        const safeResetPos = new CANNON.Vec3(
        currentPos.x + (Math.random()) * 10,
        currentPos.y + 5,
        currentPos.z + (Math.random()) * 10
        );
        this.vehicle.chassisBody.position.copy(safeResetPos);
        this.vehicle.chassisBody.quaternion.set(0, 0, 0, 1);
        this.vehicle.chassisBody.velocity.set(0, 0, 0);
        this.vehicle.chassisBody.angularVelocity.set(0, 0, 0);
        this.vehicle.chassisBody.force.set(0, 0, 0);
        this.vehicle.chassisBody.torque.set(0, 0, 0);
        if (this.wheelBodies) {
        this.wheelBodies.forEach((wheelBody) => {
            if (wheelBody) {
            wheelBody.velocity.set(0, 0, 0);
            wheelBody.angularVelocity.set(0, 0, 0);
            }
        });
        }
    }
  loadCarModel(chassisBody) {
    const loader = new GLTFLoader();
    const modelPath = this.selectedCar.path;
    loader.load(
      modelPath,
      (gltf) => {
        const object = gltf.scene;
        object.scale.set(1, 1, 1);
        object.position.set(0, 0, 0);
        object.rotation.set(0, Math.PI * 1.5, 0);
        object.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        chassisBody.threemesh = object;
        this.scene.add(object);
        this.helper.shadowTarget = object;
      }
    );
  }
  initPhysics() {
    this.physics = {};
    const world = new CANNON.World();
    this.world = world;
    world.broadphase = new CANNON.SAPBroadphase(world);
    world.gravity.set(0, -10, 0);
    world.defaultContactMaterial.friction = 0;
    const groundMaterial = new CANNON.Material('groundMaterial');
    const wheelMaterial = new CANNON.Material('wheelMaterial');
    const wheelGroundContactMaterial = new CANNON.ContactMaterial(wheelMaterial, groundMaterial, {
      friction: 0.6,
      restitution: 0.1,
      contactEquationStiffness: 1000,
    });
    world.addContactMaterial(wheelGroundContactMaterial);
    const chassisShape = new CANNON.Box(new CANNON.Vec3(1, 0.5, 2));
    const chassisBody = new CANNON.Body({ mass: 150, material: groundMaterial });
    chassisBody.addShape(chassisShape);
    const startPoint = this.roadCurve.getPointAt(0.5);
    chassisBody.position.set(startPoint.x, startPoint.y, startPoint.z);
    chassisBody.linearDamping = 0.1;
    chassisBody.angularDamping = 0.4;
    world.addBody(chassisBody);
    this.loadCarModel(chassisBody);
    const options = {
      radius: 0.5,
      directionLocal: new CANNON.Vec3(0, -1, 0),
      suspensionStiffness: 20,
      suspensionRestLength: 0.3,
      frictionSlip: 2,
      dampingRelaxation: 3,
      dampingCompression: 5,
      maxSuspensionForce: 100000,
      rollInfluence: 0.01,
      axleLocal: new CANNON.Vec3(-1, 0, 0),
      chassisConnectionPointLocal: new CANNON.Vec3(1, 1, 0),
      maxSuspensionTravel: 0.3,
      customSlidingRotationalSpeed: -30,
      useCustomSlidingRotationalSpeed: true,
    };
    const vehicle = new CANNON.RaycastVehicle({
      chassisBody: chassisBody,
      indexRightAxis: 0,
      indexUpAxis: 1,
      indexForwardAxis: 2,
    });
    options.chassisConnectionPointLocal.set(1, 0, -1);
    vehicle.addWheel(options);
    options.chassisConnectionPointLocal.set(-1, 0, -1);
    vehicle.addWheel(options);
    options.chassisConnectionPointLocal.set(1, 0, 1);
    vehicle.addWheel(options);
    options.chassisConnectionPointLocal.set(-1, 0, 1);
    vehicle.addWheel(options);
    vehicle.addToWorld(world);
    const wheelBodies = [];
    vehicle.wheelInfos.forEach((wheel) => {
      const cylinderShape = new CANNON.Cylinder(wheel.radius, wheel.radius, wheel.radius / 2, 20);
      const wheelBody = new CANNON.Body({ mass: 5, material: wheelMaterial });
      const q = new CANNON.Quaternion();
      q.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), Math.PI / 2);
      wheelBody.addShape(cylinderShape, new CANNON.Vec3(), q);
      wheelBodies.push(wheelBody);
      this.helper.addVisual(wheelBody, 'wheel');
    });
    world.addEventListener('postStep', () => {
      let index = 0;
      vehicle.wheelInfos.forEach((wheel) => {
        vehicle.updateWheelTransform(index);
        const t = wheel.worldTransform;
        if (wheelBodies[index] && wheelBodies[index].threemesh) {
          wheelBodies[index].threemesh.position.copy(t.position);
          const wheelQuat = new THREE.Quaternion().copy(t.quaternion);
          if (index === 0 || index === 1) {
            const steerQuat = new THREE.Quaternion();
            steerQuat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.currentSteerValue);
            wheelQuat.multiply(steerQuat);
          }
          wheelBodies[index].threemesh.quaternion.copy(wheelQuat);
        }
        index++;
      });
    });

    this.vehicle = vehicle;
    this.wheelBodies = wheelBodies;

    const groundSize = 5000;
    const groundShape = new CANNON.Plane();
    const groundBody = new CANNON.Body({ mass: 0, material: groundMaterial });
    groundBody.addShape(groundShape);
    groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
    groundBody.position.set(0, -0.25, 0);
    world.addBody(groundBody);
    const groundGeometry = new THREE.PlaneGeometry(groundSize, groundSize, 50, 50);
    const textureLoader = new THREE.TextureLoader();
    const grassTexture = textureLoader.load(
    '../pic/grass.jpg'
    );
    grassTexture.wrapS = grassTexture.wrapT = THREE.RepeatWrapping;
    grassTexture.repeat.set(200, 200);
    const grassMaterial = new THREE.MeshLambertMaterial({ 
    map: grassTexture,
    side: THREE.DoubleSide
    });
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 512;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#4a4a4a';
    ctx.fillRect(0, 0, 512, 512);
    ctx.strokeStyle = '#666666';
    ctx.lineWidth = 2;
    for (let i = 0; i <= 512; i += 32) {
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 512);
    ctx.moveTo(0, i);
    ctx.lineTo(512, i);
    }
    ctx.stroke();

    const gridTexture = new THREE.CanvasTexture(canvas);
    gridTexture.wrapS = gridTexture.wrapT = THREE.RepeatWrapping;

    const groundMesh = new THREE.Mesh(groundGeometry, grassMaterial);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.position.set(0, -0.5, 0);
    groundMesh.receiveShadow = true;
    this.scene.add(groundMesh);
    groundBody.threemesh = groundMesh;
    this.groundBody = groundBody;
    createTrees(this);
    createHouses(this);
    createRoadBarriers(this);
    this.createMinimap();
    setTimeout(() => {
      createBotCars(this);
    }, 1000);
    this.animate();
    this.chunkManager = new ChunkManager(this);
  }

    updateDrive() {
        const maxSteerVal = 0.5;
        const maxForce = 700;
        const brakeForce = 10;
        let forward = 0; 
        let turn = 0;
        if (this.keys.w) forward = 1;
        if (this.keys.s) forward = -1;
        if (this.keys.a) turn = 1;
        if (this.keys.d) turn = -1;

        const force = maxForce * forward;
        const steer = maxSteerVal * turn;
        this.currentSteerValue = steer;
        if (forward !== 0) {
          this.vehicle.setBrake(0, 0);
          this.vehicle.setBrake(0, 1);
          this.vehicle.setBrake(0, 2);
          this.vehicle.setBrake(0, 3);
          this.vehicle.applyEngineForce(force, 2);
          this.vehicle.applyEngineForce(force, 3);
        } 
        else {
          this.vehicle.setBrake(brakeForce, 0);
          this.vehicle.setBrake(brakeForce, 1);
          this.vehicle.setBrake(brakeForce, 2);
          this.vehicle.setBrake(brakeForce, 3);
        }
        this.vehicle.setSteeringValue(steer, 0);
        this.vehicle.setSteeringValue(steer, 1);
    }
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    updateCamera() {
      if (!this.vehicle || !this.vehicle.chassisBody || !this.vehicle.chassisBody.threemesh) return;
      const carPosition = this.vehicle.chassisBody.position;
      const carQuaternion = this.vehicle.chassisBody.quaternion;
      const carPos = new THREE.Vector3(carPosition.x, carPosition.y, carPosition.z);
      const carQuat = new THREE.Quaternion(carQuaternion.x, carQuaternion.y, carQuaternion.z, carQuaternion.w);
      const cameraDistance = 5; 
      const cameraHeight = 3;
      const backwardVector = new THREE.Vector3(0, 0, 1);
      backwardVector.applyQuaternion(carQuat);
      const cameraPosition = new THREE.Vector3()
          .copy(carPos)
          .add(backwardVector.multiplyScalar(cameraDistance))
          .setY(carPos.y + cameraHeight);
      this.camera.position.copy(cameraPosition);
      const lookAtPoint = new THREE.Vector3().copy(carPos).setY(carPos.y + 1);
      this.camera.lookAt(lookAtPoint);
      if (this.helper.sun) {
          const lightOffset = new THREE.Vector3(10, 20, 10);
          this.helper.sun.position.copy(this.camera.position).add(lightOffset);
          this.helper.sun.target.position.copy(carPos);
      }
    }
    initCameraPosition() {
      this.camera.position.set(0, 5, 10);
      this.camera.lookAt(0, 0, 0);
    }
    addSpeedometer() {
        const speedDiv = document.createElement('div');
        speedDiv.id = 'speedometer';
        speedDiv.style.position = 'absolute';
        speedDiv.style.bottom = '20px';
        speedDiv.style.left = '20px';
        speedDiv.style.background = 'rgba(0, 0, 0, 0.5)';
        speedDiv.style.color = 'white';
        speedDiv.style.padding = '10px';
        speedDiv.style.borderRadius = '5px';
        speedDiv.style.fontFamily = 'Arial';
        speedDiv.style.fontSize = '24px';
        speedDiv.textContent = '0 km/h';
        document.body.appendChild(speedDiv);
        this.speedDiv = speedDiv;
    }
    updateSpeedometer() {
        if (!this.vehicle || !this.speedDiv) return;
        const velocity = this.vehicle.chassisBody.velocity;
        const speed = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z);
        const speedKmh = Math.round(speed * 3.6);
        this.speedDiv.textContent = `${speedKmh} km/h`;
        const volume = Math.min(speedKmh / 100, 1);
        this.engineSound.volume = volume;
        if (speedKmh > 0 && this.engineSound.paused) {
            this.engineSound.play();
        } 
        else if (speedKmh === 0 && !this.engineSound.paused) {
            this.engineSound.pause();
        }
    }
  animate() {
    const game = this;
    requestAnimationFrame(() => game.animate());
    const now = Date.now();
    if (this.lastTime === undefined) this.lastTime = now;
    const dt = (Date.now() - this.lastTime) / 1000.0;
    this.FPSFactor = dt;
    this.lastTime = now;
    if (this.world) {
      this.world.step(this.fixedTimeStep, dt);
      this.helper.updateBodies(this.world);
    }
    if (this.vehicle) {
      this.updateDrive();
      this.updateSpeedometer();
      this.checkCarBounds();
      checkTeaPotCollision(this);
      updateTeaPotAnimations(this);
      updateFireworks(this, dt);
      updateBotCars(this);
      this.updateCamera();
    }
    if (this.chunkManager) {
      this.chunkManager.updateChunks();
    }
    this.updateSkybox();
    updateTrafficCones(this);
    this.updateMinimap();
    this.renderer.render(this.scene, this.camera);
  }
  checkCarBounds() {
    if (!this.vehicle || !this.vehicle.chassisBody) return;
    const carPos = this.vehicle.chassisBody.position;
    const mapLimit = 1000;
    if (Math.abs(carPos.x) > mapLimit || Math.abs(carPos.z) > mapLimit) {
      this.resetCar();
    }
  }
}