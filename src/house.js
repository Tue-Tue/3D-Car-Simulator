import * as THREE from 'three';
import * as CANNON from 'https://unpkg.com/cannon-es@latest/dist/cannon-es.js';
import { GLTFLoader } from 'GLTFLoader';

export function createHouses(context) {
    const mapSize = 5000;
    const numHouses = 25;
    const minDistanceFromRoad = 500;
    const minDistanceBetweenHouses = 80;
    const houseSize = { width: 15, height: 10, depth: 15 };
    let attempts = 0;
    let housesCreated = 0;
    while (housesCreated < numHouses && attempts < 500) {
        attempts++;
        const x = (Math.random()) * mapSize;
        const z = (Math.random()) * mapSize;
        const distanceFromCenter = Math.sqrt(x * x + z * z);
        if (distanceFromCenter < minDistanceFromRoad) continue;
        if (isPositionOccupied(context, x, z, minDistanceBetweenHouses)) continue;
        const houseFile = context.houseFiles[Math.floor(Math.random() * context.houseFiles.length)];
        loadHouseModel(context, houseFile, x, z, houseSize, housesCreated);
        context.occupiedPositions.push({ x, z, radius: minDistanceBetweenHouses });
        housesCreated++;
    }
}

export function isPositionOccupied(context, x, z, minDistance) {
    return context.occupiedPositions.some(pos => {
        const distance = Math.sqrt((x - pos.x) ** 2 + (z - pos.z) ** 2);
        return distance < minDistance;
    });
}

export function loadHouseModel(context, filePath, x, z, houseSize, houseId) {
    const loader = new GLTFLoader();
    const collisionShape = new CANNON.Box(new CANNON.Vec3(
        houseSize.width / 2, 
        houseSize.height / 2, 
        houseSize.depth / 2
    ));
        
    const houseBody = new CANNON.Body({ 
        mass: 0,
        material: context.world.defaultMaterial
    });
    houseBody.addShape(collisionShape);
    houseBody.position.set(x, houseSize.height / 2, z);
    context.world.addBody(houseBody);
    loader.load(
        filePath,
        (gltf) => {
        const houseModel = gltf.scene;
        houseModel.position.set(x, 0, z);
        houseModel.scale.set(1, 1, 1);
        houseModel.rotation.y = Math.random() * Math.PI * 2;
        houseModel.traverse((child) => {
            if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            if (child.material) {
                child.material.needsUpdate = true;
            }
            }
        });
        context.scene.add(houseModel);
        const houseInfo = {
            id: houseId,
            model: houseModel,
            body: houseBody,
            position: { x, z },
            size: houseSize,
            filePath: filePath
        };
        context.houses.push(houseInfo);
        }
    );
}
