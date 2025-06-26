import * as THREE from 'three';
import * as CANNON from 'https://unpkg.com/cannon-es@latest/dist/cannon-es.js';

export function isPositionOnRoad(context, x, z, buffer = 40) {
    if (!context.roadPoints) return false;
    const testPoint = new THREE.Vector3(x, 0, z);
    let minDistance = Infinity;
    for (let i = 0; i < context.roadPoints.length; i++) {
        const roadPoint = context.roadPoints[i];
        const distance = testPoint.distanceTo(roadPoint);
        minDistance = Math.min(minDistance, distance);
    }
    return minDistance < buffer;
}

export function createTrees(context, centerX = 0, centerZ = 0, count = 30) {
    const created = [];
    const range = 100;
    
    for (let i = 0; i < count; i++) {
        const x = centerX + (Math.random() - 0.5) * range * 2;
        const z = centerZ + (Math.random() - 0.5) * range * 2;
        if (isPositionOnRoad(context, x, z, 60)) continue;
        
        const treeType = Math.random() < 0.6 ? 'pine' : 'green';
        let tree;
        
        if (treeType === 'pine') {
            const treeHeight = Math.random() * 10 + 6;
            const trunkRadius = Math.random() * 0.3 + 0.2;
            const canopyRadius = Math.random() * 3 + 2;
            tree = createPineTree(context, x, z, treeHeight, trunkRadius, canopyRadius);
        } else {
            const treeHeight = Math.random() * 8 + 8;
            const scale = Math.random() * 1.5 + 1.2;
            tree = createGreenTree(context, x, z, scale, treeHeight);
        }
        if (tree) created.push(tree);
    }
    return created;
}

export function createForestArea(context, centerX, centerZ, radius, density) {
    let attempts = 0;
    let treesCreated = 0;
    const trees = [];
    
    while (treesCreated < density && attempts < density * 3) {
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * radius;
        const x = centerX + Math.cos(angle) * distance;
        const z = centerZ + Math.sin(angle) * distance;
        attempts++;
        
        if (isPositionOnRoad(context, x, z, 50)) continue;
        
        const treeType = Math.random() < 0.5 ? 'pine' : 'green';
        let tree;
        
        if (treeType === 'pine') {
            const treeHeight = Math.random() * 10 + 5;
            const trunkRadius = Math.random() * 0.2 + 0.15;
            const canopyRadius = Math.random() * 2 + 1.5;
            tree = createPineTree(context, x, z, treeHeight, trunkRadius, canopyRadius);
        } else {
            const treeHeight = Math.random() * 8 + 7;
            const scale = Math.random() * 1.3 + 1.0;
            tree = createGreenTree(context, x, z, scale, treeHeight);
        }
        
        if (tree) {
            trees.push(tree);
            treesCreated++;
        }
    }
    return trees;
}

export function createPineTree(context, x, z, height, trunkRadius = 0.3, canopyRadius = 3) {
    const group = new THREE.Group();
    
    const trunkGeometry = new THREE.CylinderGeometry(trunkRadius, trunkRadius, height * 0.3, 8);
    const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x4a3728 });
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.set(x, height * 0.15, z);
    trunk.castShadow = true;
    group.add(trunk);
    
    const numLayers = 4;
    const layerMaterial = new THREE.MeshLambertMaterial({ color: 0x1a4d0f });
    
    for (let i = 0; i < numLayers; i++) {
        const layerRadius = (numLayers - i) * 0.8 + 1;
        const layerHeight = height * 0.3;
        const layerY = height * 0.3 + (i * height * 0.15);
        
        const layerGeometry = new THREE.ConeGeometry(layerRadius, layerHeight, 8);
        const layer = new THREE.Mesh(layerGeometry, layerMaterial);
        layer.position.set(x, layerY, z);
        layer.castShadow = true;
        group.add(layer);
    }
    
    context.scene.add(group);
    
    const trunkShape = new CANNON.Cylinder(trunkRadius, trunkRadius, height * 0.3, 8);
    const trunkBody = new CANNON.Body({ mass: 0 });
    trunkBody.addShape(trunkShape);
    trunkBody.position.set(x, height * 0.15, z);
    context.world.addBody(trunkBody);
    
    return {
        mesh: trunk,
        children: group,
        body: trunkBody,
        type: 'pine'
    };
}

export function createGreenTree(context, x, z, scale = 1, customHeight = null) {
    const group = new THREE.Group();
    
    const baseHeight = customHeight || (8 * scale);
    const trunkHeight = baseHeight * 0.4;
    const canopyHeight = baseHeight * 0.6;
    
    const trunkGeometry = new THREE.CylinderGeometry(
        0.4 * scale,
        0.6 * scale,
        trunkHeight, 
        8
    );
    const trunkMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x8b5a2b, 
        flatShading: true 
    });
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.set(x, trunkHeight / 2, z);
    trunk.castShadow = true;
    group.add(trunk);
    
    const canopyRadius = Math.max(2.5 * scale, 3);
    const canopyGeometry = new THREE.IcosahedronGeometry(canopyRadius, 1);
    const canopyMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x0b6e4f, 
        flatShading: true 
    });
    const canopy = new THREE.Mesh(canopyGeometry, canopyMaterial);
    canopy.position.set(x, trunkHeight + canopyRadius * 0.8, z);
    canopy.castShadow = true;
    group.add(canopy);
    
    context.scene.add(group);
    
    const trunkShape = new CANNON.Cylinder(0.4 * scale, 0.6 * scale, trunkHeight, 8);
    const trunkBody = new CANNON.Body({ mass: 0 });
    trunkBody.addShape(trunkShape);
    trunkBody.position.set(x, trunkHeight / 2, z);
    context.world.addBody(trunkBody);
    
    const canopyShape = new CANNON.Sphere(canopyRadius);
    trunkBody.addShape(canopyShape, new CANNON.Vec3(0, trunkHeight / 2 + canopyRadius * 0.8, 0));
    
    return {
        mesh: trunk,
        children: group,
        body: trunkBody,
        type: 'green',
        scale: scale,
        height: baseHeight
    };
}