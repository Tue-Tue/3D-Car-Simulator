import * as THREE from 'three';
import * as CANNON from 'https://unpkg.com/cannon-es@latest/dist/cannon-es.js';
import { TeapotGeometry } from 'TeapotGeometry';
import { triggerFireworks } from './fireworks.js';

export function createTeaPot(context, x, y, z) {
    const teaPotGeometry = new TeapotGeometry(0.4, 8);
    const teaPotMaterial = new THREE.MeshLambertMaterial();
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load('../pic/texture.jpg', function(texture) {
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(1, 1);
        teaPotMaterial.map = texture;
        teaPotMaterial.needsUpdate = true;
    });
    const teaPotMesh = new THREE.Mesh(teaPotGeometry, teaPotMaterial);
    teaPotMesh.position.set(x, y, z);
    teaPotMesh.castShadow = true;
    teaPotMesh.receiveShadow = true;
    teaPotMesh.userData = {
        rotationSpeed: Math.random() * 0.02 + 0.01,
        bobSpeed: Math.random() * 0.003 + 0.002,
        bobOffset: Math.random() * Math.PI * 2,
        originalY: y
    };
    context.scene.add(teaPotMesh);
    const teaPotShape = new CANNON.Sphere(1.2);
    const teaPotBody = new CANNON.Body({ mass: 0, isTrigger: true });
    teaPotBody.addShape(teaPotShape);
    teaPotBody.position.set(x, y, z);
    teaPotBody.threemesh = teaPotMesh;
    context.world.addBody(teaPotBody);
    return { mesh: teaPotMesh, body: teaPotBody, collected: false };
}

export function spawnTeaPots(context) {
    context.teaPots.forEach(teaPot => {
        if (teaPot.mesh) {
            context.scene.remove(teaPot.mesh);
            context.world.removeBody(teaPot.body);
        }
    });
    context.teaPots = [];
    for (let i = 0; i < context.maxTeaPots; i++) {
        const t = Math.random();
        const point = context.roadCurve.getPoint(t);
        const offset = (Math.random() - 0.5) * 10;
        const tangent = context.roadCurve.getTangentAt(t);
        const perpendicular = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
        const teaPotPos = point.clone().add(perpendicular.multiplyScalar(offset));
        teaPotPos.y = 1.5;
        const teaPot = createTeaPot(context, teaPotPos.x, teaPotPos.y, teaPotPos.z);
        context.teaPots.push(teaPot);
    }
}

export function collectTeaPot(context, index) {
    const teaPot = context.teaPots[index];
    if (!teaPot || teaPot.collected) return;
    teaPot.collected = true;
    context.scene.remove(teaPot.mesh);
    context.world.removeBody(teaPot.body);
    context.score += 10;
    updateScoreDisplay(context);
    showCollectEffect(context, teaPot.mesh.position);
    if (context.score >= 100 && context.score % 100 === 0) {
        triggerFireworks(context);
    }
    setTimeout(() => {
        spawnNewTeaPot(context, index);
    }, 2000);
}

export function checkTeaPotCollision(context) {
    if (!context.vehicle || !context.vehicle.chassisBody) return;
    const carPos = context.vehicle.chassisBody.position;
    const collectDistance = 3;
    context.teaPots.forEach((teaPot, index) => {
        if (teaPot.collected) return;
        const teaPotPos = teaPot.body.position;
        const distance = Math.sqrt(
            Math.pow(carPos.x - teaPotPos.x, 2) +
            Math.pow(carPos.y - teaPotPos.y, 2) +
            Math.pow(carPos.z - teaPotPos.z, 2)
        );
        if (distance < collectDistance) {
            collectTeaPot(context, index);
        }
    });
}

export function updateScoreDisplay(context) {
    if (context.scoreDiv) {
        context.scoreDiv.textContent = `SCORE: ${context.score}`;
        context.scoreDiv.style.background = 'rgba(0, 255, 229, 0.9)';
        context.scoreDiv.style.transform = 'scale(1.1)';
        setTimeout(() => {
            context.scoreDiv.style.background = 'rgba(0, 100, 0, 0.8)';
            context.scoreDiv.style.transform = 'scale(1)';
        }, 200);
    }
}

export function worldToScreen(context, position) {
    const vector = new THREE.Vector3(position.x, position.y, position.z);
    vector.project(context.camera);
    const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
    const y = (vector.y * -0.5 + 0.5) * window.innerHeight;
    return { x: x, y: y };
}

export function showCollectEffect(context, position) {
    const effectDiv = document.createElement('div');
    effectDiv.style.position = 'absolute';
    effectDiv.style.color = '#00ff00';
    effectDiv.style.fontSize = '36px';
    effectDiv.style.fontWeight = 'bold';
    effectDiv.style.fontFamily = 'Arial';
    effectDiv.style.textShadow = '2px 2px 4px rgba(0,0,0,0.8)';
    effectDiv.style.pointerEvents = 'none';
    effectDiv.style.zIndex = '1001';
    effectDiv.textContent = '+10';
    const screenPos = worldToScreen(context, position);
    effectDiv.style.left = screenPos.x + 'px';
    effectDiv.style.top = screenPos.y + 'px';
    document.body.appendChild(effectDiv);
    let opacity = 1;
    let offsetY = 0;
    const animateEffect = () => {
        opacity -= 0.02;
        offsetY -= 2;
        effectDiv.style.opacity = opacity;
        effectDiv.style.transform = `translateY(${offsetY}px)`;
        if (opacity > 0) {
            requestAnimationFrame(animateEffect);
        } else {
            document.body.removeChild(effectDiv);
        }
    };

    if (context.audioContext) {
        const oscillator = context.audioContext.createOscillator();
        const gainNode = context.audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(context.audioContext.destination);
        oscillator.frequency.setValueAtTime(800, context.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(1200, context.audioContext.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.3, context.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, context.audioContext.currentTime + 0.3);
        oscillator.start();
        oscillator.stop(context.audioContext.currentTime + 0.3);
    }
    requestAnimationFrame(animateEffect);
}

export function spawnNewTeaPot(context, index) {
    if (index >= 0 && index < context.teaPots.length) {
        const t = Math.random();
        const point = context.roadCurve.getPoint(t);
        const offset = (Math.random() - 0.5) * 20;
        const tangent = context.roadCurve.getTangentAt(t);
        const perpendicular = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
        const newPos = point.clone().add(perpendicular.multiplyScalar(offset));
        newPos.y = 2;
        const newTeaPot = createTeaPot(context, newPos.x, newPos.y, newPos.z);
        context.teaPots[index] = newTeaPot;
    }
}

export function updateTeaPotAnimations(context) {
    context.teaPots.forEach(teaPot => {
        if (teaPot.collected || !teaPot.mesh) return;
        const userData = teaPot.mesh.userData;
        teaPot.mesh.rotation.y += userData.rotationSpeed;
        const bobOffset = Math.sin(Date.now() * userData.bobSpeed + userData.bobOffset) * 0.5;
        teaPot.mesh.position.y = userData.originalY + bobOffset;
        teaPot.body.position.y = teaPot.mesh.position.y;
    });
}
