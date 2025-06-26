import * as THREE from 'three';
import * as CANNON from 'https://unpkg.com/cannon-es@latest/dist/cannon-es.js';

export function createTrafficCone(context, x, y, z, scale = 1) {
    const coneGroup = new THREE.Group();
    const mainConeGeometry = new THREE.ConeGeometry(0.3 * scale, 1, 8);
    const mainConeMaterial = new THREE.MeshLambertMaterial({ color: 0xff4500 });
    const mainCone = new THREE.Mesh(mainConeGeometry, mainConeMaterial);
    mainCone.position.y = 0.4 * scale;
    mainCone.castShadow = true;
    mainCone.receiveShadow = true;
    coneGroup.add(mainCone);
    const baseGeometry = new THREE.ConeGeometry(0.4 * scale, 0.15 * scale, 8);
    const baseMaterial = new THREE.MeshLambertMaterial({ color: 0xff6600 });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = 0.075 * scale;
    base.castShadow = true;
    base.receiveShadow = true;
    coneGroup.add(base);
    coneGroup.position.set(x, y, z);
    context.scene.add(coneGroup);
    const coneShape = new CANNON.Cylinder(0.4 * scale, 0.1 * scale, 0.8 * scale, 8);
    const coneBody = new CANNON.Body({ 
        mass: 1, 
        material: context.world.defaultMaterial
    });
    coneBody.addShape(coneShape);
    coneBody.position.set(x, y + 0.1 * scale, z);
    coneBody.linearDamping = 0.8;
    coneBody.angularDamping = 0.8;
    context.world.addBody(coneBody);
    if (!context.trafficCones) context.trafficCones = [];
    context.trafficCones.push({ mesh: coneGroup, body: coneBody });
    const updateCone = () => {
        if (coneBody && coneGroup) {
            coneGroup.position.copy(coneBody.position);
            coneGroup.quaternion.copy(coneBody.quaternion);
        }
    };

    if (!context.coneUpdaters) context.coneUpdaters = [];
    context.coneUpdaters.push(updateCone);
    return { mesh: coneGroup, body: coneBody };
}

export function createRoadBarriers(context) {
    if (!context.roadPoints || context.roadPoints.length === 0) {
        context.createDefaultBarriers();
        return;
    }
    const numBarriers = 50;
    const roadWidth = 5;
    for (let i = 0; i < numBarriers; i++) {
        const roadIndex = Math.floor(Math.random() * context.roadPoints.length);
        const roadPoint = context.roadPoints[roadIndex];
        let tangent;
        if (roadIndex === 0) {
            tangent = new THREE.Vector3().subVectors(context.roadPoints[1], context.roadPoints[0]).normalize();
        } else if (roadIndex === context.roadPoints.length - 1) {
            tangent = new THREE.Vector3().subVectors(context.roadPoints[roadIndex], context.roadPoints[roadIndex - 1]).normalize();
        } else {
            const tangent1 = new THREE.Vector3().subVectors(context.roadPoints[roadIndex], context.roadPoints[roadIndex - 1]).normalize();
            const tangent2 = new THREE.Vector3().subVectors(context.roadPoints[roadIndex + 1], context.roadPoints[roadIndex]).normalize();
            tangent = new THREE.Vector3().addVectors(tangent1, tangent2).normalize();
        }
        const up = new THREE.Vector3(0, 1, 0);
        const perpendicular = new THREE.Vector3().crossVectors(tangent, up).normalize();
        const side = Math.random() > 0.5 ? 1 : -1;
        const distance = roadWidth - (Math.random());
        const barrierPos = roadPoint.clone().add(perpendicular.clone().multiplyScalar(side * distance));
        const scale = 1 + Math.random() * 0.5;
        createTrafficCone(context, barrierPos.x, 0, barrierPos.z, scale);
    }
}

export function updateTrafficCones(context) {
    if (context.coneUpdaters) {
        context.coneUpdaters.forEach(updater => updater());
    }
    if (context.trafficCones) {
        context.trafficCones.forEach(cone => {
            if (cone.body && cone.body.position.y < -10) {
                cone.body.position.y = 1;
                cone.body.velocity.set(0, 0, 0);
                cone.body.angularVelocity.set(0, 0, 0);
            }
        });
    }
}
