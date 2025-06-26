import * as THREE from 'three';
import * as CANNON from 'https://unpkg.com/cannon-es@latest/dist/cannon-es.js';
import { GLTFLoader } from 'GLTFLoader';

class BotCar {
  constructor(game, modelPath, startPosition = 0) {
    this.game = game;
    this.modelPath = modelPath;
    this.mesh = null;
    this.body = null;
    this.currentPosition = startPosition;
    this.speed = 0.0002 + Math.random() * 0.0003;
    this.roadOffset = (Math.random() - 0.5) * 10;
    this.direction = Math.random() > 0.5 ? 1 : -1;
    this.lane = Math.floor(Math.random() * 2);
    this.targetSpeed = this.speed;
    this.currentSpeed = this.speed;
    this.lastPosition = new THREE.Vector3();
    this.avoidanceTimer = 0;
    this.loadModel();
    this.createPhysicsBody();
  }

  loadModel() {
    const loader = new GLTFLoader();
    loader.load(
      this.modelPath,
      (gltf) => {
        this.mesh = gltf.scene;
        this.mesh.scale.set(1, 1, 1);
        this.mesh.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        this.game.scene.add(this.mesh);
        this.updatePosition();
      }
    );
  }

  createPhysicsBody() {
    const shape = new CANNON.Box(new CANNON.Vec3(1, 1, 2));
    this.body = new CANNON.Body({ mass: 100 });
    this.body.addShape(shape);
    this.body.material = new CANNON.Material('botCarMaterial');
    this.body.linearDamping = 0.4;
    this.body.angularDamping = 0.4;
    this.game.world.addBody(this.body);
  }

  updatePosition() {
    if (!this.game.roadCurve || !this.mesh) return;

    this.currentPosition += this.currentSpeed * this.direction;
    if (this.currentPosition > 1) this.currentPosition = 0;
    if (this.currentPosition < 0) this.currentPosition = 1;

    const roadPoint = this.game.roadCurve.getPointAt(this.currentPosition);
    const tangent = this.game.roadCurve.getTangentAt(this.currentPosition);

    const perpendicular = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
    const laneOffset = this.lane === 0 ? -7 : 7;

    const finalPosition = roadPoint.clone().add(
      perpendicular.multiplyScalar(laneOffset + this.roadOffset)
    );
    finalPosition.y += 0.5;

    this.mesh.position.copy(finalPosition);

    const lookDirection = tangent.clone();
    if (this.direction < 0) lookDirection.negate();
    this.mesh.lookAt(this.mesh.position.clone().add(lookDirection));

    if (this.body) {
      this.body.position.copy(finalPosition);
      const quaternion = new THREE.Quaternion();
      const up = new THREE.Vector3(0, 1, 0);
      const matrix = new THREE.Matrix4().lookAt(
        finalPosition,
        finalPosition.clone().add(lookDirection),
        up
      );
      quaternion.setFromRotationMatrix(matrix);
      this.body.quaternion.set(quaternion.x, quaternion.y, quaternion.z, quaternion.w);
    }

    this.lastPosition.copy(finalPosition);
  }

  updateAI() {
    if (!this.game.vehicle || !this.game.vehicle.chassisBody) return;

    const playerPos = this.game.vehicle.chassisBody.position;
    const botPos = this.mesh.position;
    const distance = botPos.distanceTo(new THREE.Vector3(playerPos.x, playerPos.y, playerPos.z));

    if (distance < 15) {
      this.targetSpeed = this.speed * 0.5;
      this.avoidanceTimer = 60;
    } else if (this.avoidanceTimer > 0) {
      this.avoidanceTimer--;
    } else {
      this.targetSpeed = this.speed;
    }

    this.game.botCars.forEach(otherBot => {
      if (otherBot === this || !otherBot.mesh) return;
      const otherDistance = botPos.distanceTo(otherBot.mesh.position);
      if (otherDistance < 8) {
        this.targetSpeed = this.speed * 0.3;
        this.avoidanceTimer = Math.max(this.avoidanceTimer, 30);
      }
    });

    this.currentSpeed = THREE.MathUtils.lerp(this.currentSpeed, this.targetSpeed, 0.05);
  }

  update() {
    this.updateAI();
    this.updatePosition();
  }

  dispose() {
    if (this.mesh) {
      this.game.scene.remove(this.mesh);
    }
    if (this.body) {
      this.game.world.removeBody(this.body);
    }
  }
}

export function createBotCars(context) {
  context.botCars.forEach(bot => bot.dispose());
  context.botCars = [];

  for (let i = 0; i < context.maxBotCars; i++) {
    const modelPath = context.botCarModels[i % context.botCarModels.length];
    const startPosition = i / context.maxBotCars;
    const botCar = new BotCar(context, modelPath, startPosition);
    context.botCars.push(botCar);
  }
}

export function updateBotCars(context) {
  context.botCars.forEach(bot => {
    if (bot.mesh) {
      bot.update();
    }
  });
}
