import * as THREE from 'three';

export function createRoad(context) {
    const roadWidth = 30;
    const roadSegments = 500;
    const radius = 800;
    const curvePoints = [];

    for (let i = 0; i <= 16; i++) {
        const angle = (i / 16) * Math.PI * 2;
        let x = Math.cos(angle) * radius;
        let z = Math.sin(angle) * radius;
        const waveX = Math.sin(angle * 3) * 200;
        const waveZ = Math.cos(angle * 2.5) * 150;
        x += waveX;
        z += waveZ;
        curvePoints.push(new THREE.Vector3(x, 0, z));
    }

    const curve = new THREE.CatmullRomCurve3(curvePoints);
    curve.closed = true;
    curve.curveType = 'centripetal';

    const points = curve.getPoints(roadSegments);
    context.roadCurve = curve;
    context.roadPoints = points;

    const roadGeometry = new THREE.BufferGeometry();
    const vertices = [];
    const indices = [];
    const uvs = [];

    for (let i = 0; i < points.length; i++) {
        const point = points[i];
        let tangent;
        if (i === 0) {
            tangent = new THREE.Vector3().subVectors(points[1], points[0]).normalize();
        } else if (i === points.length - 1) {
            tangent = new THREE.Vector3().subVectors(points[i], points[i - 1]).normalize();
        } else {
            const tangent1 = new THREE.Vector3().subVectors(points[i], points[i - 1]).normalize();
            const tangent2 = new THREE.Vector3().subVectors(points[i + 1], points[i]).normalize();
            tangent = new THREE.Vector3().addVectors(tangent1, tangent2).normalize();
        }

        const up = new THREE.Vector3(0, 1, 0);
        const perpendicular = new THREE.Vector3().crossVectors(tangent, up).normalize();

        if (perpendicular.length() < 0.1) {
            perpendicular.set(-tangent.z, 0, tangent.x).normalize();
        }

        const leftPoint = point.clone().add(perpendicular.clone().multiplyScalar(roadWidth / 2));
        const rightPoint = point.clone().add(perpendicular.clone().multiplyScalar(-roadWidth / 2));

        vertices.push(leftPoint.x, leftPoint.y, leftPoint.z);
        vertices.push(rightPoint.x, rightPoint.y, rightPoint.z);

        const u = i / (points.length - 1);
        uvs.push(0, u * 10);
        uvs.push(1, u * 10);

        if (i < points.length - 1) {
            const curr = i * 2;
            const next = (i + 1) * 2;
            indices.push(curr, next, curr + 1);
            indices.push(curr + 1, next, next + 1);
        }
    }

    roadGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    roadGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    roadGeometry.setIndex(indices);
    roadGeometry.computeVertexNormals();

    const roadCanvas = document.createElement('canvas');
    roadCanvas.width = 512;
    roadCanvas.height = 2048;
    const ctx = roadCanvas.getContext('2d');

    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(0, 0, 512, 2048);

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(50, 0);
    ctx.lineTo(50, 2048);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(462, 0);
    ctx.lineTo(462, 2048);
    ctx.stroke();

    ctx.strokeStyle = '#ffff00';
    ctx.lineWidth = 6;
    for (let i = 0; i < 2048; i += 60) {
        ctx.beginPath();
        ctx.moveTo(256, i);
        ctx.lineTo(256, i + 30);
        ctx.stroke();
    }

    const roadTexture = new THREE.CanvasTexture(roadCanvas);
    roadTexture.wrapS = THREE.RepeatWrapping;
    roadTexture.wrapT = THREE.RepeatWrapping;

    const roadMaterial = new THREE.MeshLambertMaterial({ 
        map: roadTexture,
        transparent: false,
        side: THREE.DoubleSide
    });

    const roadMesh = new THREE.Mesh(roadGeometry, roadMaterial);
    roadMesh.receiveShadow = true;
    context.scene.add(roadMesh);

    context.roadCurve = curve;
    context.roadPoints = points;
}
