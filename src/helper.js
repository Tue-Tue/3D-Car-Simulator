import * as THREE from 'three';
import * as CANNON from 'https://unpkg.com/cannon-es@latest/dist/cannon-es.js';

export class CannonHelper {
  constructor(scene) {
    this.scene = scene;
    this.currentMaterial = new THREE.MeshLambertMaterial({ color: 0x888888 });
    this.particleGeo = new THREE.SphereGeometry(1, 16, 8);
    this.particleMaterial = new THREE.MeshLambertMaterial({ color: 0xff0000 });
    this.settings = {
      stepFrequency: 60,
      quatNormalizeSkip: 2,
      quatNormalizeFast: true,
      gx: 0,
      gy: 0,
      gz: 0,
      iterations: 3,
      tolerance: 0.0001,
      k: 1e6,
      d: 3,
      scene: 0,
      paused: false,
      rendermode: 'solid',
      constraints: false,
      contacts: false,
      cm2contact: false,
      normals: false,
      axes: false,
      particleSize: 0.1,
      shadows: false,
      aabbs: false,
      profiling: false,
      maxSubSteps: 3,
    };
  }

  addLights(renderer) {
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const ambient = new THREE.AmbientLight(0xaaccff);
    this.scene.add(ambient);
    const light = new THREE.DirectionalLight(0xffffff);
    light.position.set(3, 10, 4);
    light.target.position.set(0, 0, 0);
    light.castShadow = true;
    const lightSize = 10;
    light.shadow.camera.near = 1;
    light.shadow.camera.far = 50;
    light.shadow.camera.left = light.shadow.camera.bottom = -lightSize;
    light.shadow.camera.right = light.shadow.camera.top = lightSize;
    light.shadow.mapSize.width = 1024;
    light.shadow.mapSize.height = 1024;
    this.sun = light;
    this.scene.add(light);
  }
  set shadowTarget(obj) {
    if (this.sun) this.sun.target = obj;
  }

  createCannonTrimesh(geometry) {
    if (!geometry.isBufferGeometry) return null;
    const posAttr = geometry.attributes.position;
    const vertices = posAttr.array;
    let indices = [];
    for (let i = 0; i < posAttr.count; i++) {
      indices.push(i);
    }
    return new CANNON.Trimesh(vertices, indices);
  }

  createCannonConvex(geometry) {
    if (!geometry.isBufferGeometry) return null;
    const posAttr = geometry.attributes.position;
    const floats = posAttr.array;
    const vertices = [];
    const faces = [];
    let face = [];
    let index = 0;
    for (let i = 0; i < posAttr.count; i += 3) {
      vertices.push(new CANNON.Vec3(floats[i], floats[i + 1], floats[i + 2]));
      face.push(index++);
      if (face.length === 3) {
        faces.push(face);
        face = [];
      }
    }
    return new CANNON.ConvexPolyhedron(vertices, faces);
  }

  addVisual(body, name, castShadow = true, receiveShadow = true) {
    body.name = name;
    let mesh;
    if (body instanceof CANNON.Body) {
      mesh = this.shape2Mesh(body, castShadow, receiveShadow);
    }
    if (mesh) {
      body.threemesh = mesh;
      mesh.castShadow = castShadow;
      mesh.receiveShadow = receiveShadow;
      this.scene.add(mesh);
    }
  }

  shape2Mesh(body, castShadow, receiveShadow) {
    const obj = new THREE.Object3D();
    const material = this.currentMaterial;
    let index = 0;
    body.shapes.forEach((shape) => {
      let mesh;
      let geometry;
      switch (shape.type) {
        case CANNON.Shape.types.SPHERE:
          geometry = new THREE.SphereGeometry(shape.radius, 16, 12);
          mesh = new THREE.Mesh(geometry, material);
          break;
        case CANNON.Shape.types.PARTICLE:
          mesh = new THREE.Mesh(this.particleGeo, this.particleMaterial);
          mesh.scale.set(this.settings.particleSize, this.settings.particleSize, this.settings.particleSize);
          break;
        case CANNON.Shape.types.PLANE:
          geometry = new THREE.PlaneGeometry(100, 100, 10, 10);
          mesh = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({ 
            color: 0x888888,
            side: THREE.DoubleSide
          }));
          break;
        case CANNON.Shape.types.BOX:
          geometry = new THREE.BoxGeometry(
            shape.halfExtents.x * 2,
            shape.halfExtents.y * 2,
            shape.halfExtents.z * 2
          );
          mesh = new THREE.Mesh(geometry, material);
          break;
        case CANNON.Shape.types.CONVEXPOLYHEDRON:
          const polyGeometry = new THREE.BufferGeometry();
          const vertices = [];
          shape.vertices.forEach((v) => {
            vertices.push(v.x, v.y, v.z);
          });
          const indices = [];
          shape.faces.forEach((face) => {
            for (let j = 1; j < face.length - 1; j++) {
              indices.push(face[0], face[j], face[j + 1]);
            }
          });
          polyGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
          polyGeometry.setIndex(indices);
          polyGeometry.computeVertexNormals();
          mesh = new THREE.Mesh(polyGeometry, material);
          break;
        case CANNON.Shape.types.HEIGHTFIELD:
          const heightfieldGeometry = new THREE.BufferGeometry();
          const heightfieldVertices = [];
          const heightfieldIndices = [];
          let v0 = new CANNON.Vec3();
          let v1 = new CANNON.Vec3();
          let v2 = new CANNON.Vec3();
          for (let xi = 0; xi < shape.data.length - 1; xi++) {
            for (let yi = 0; yi < shape.data[xi].length - 1; yi++) {
              for (let k = 0; k < 2; k++) {
                shape.getConvexTrianglePillar(xi, yi, k === 0);
                v0.copy(shape.pillarConvex.vertices[0]);
                v1.copy(shape.pillarConvex.vertices[1]);
                v2.copy(shape.pillarConvex.vertices[2]);
                v0.vadd(shape.pillarOffset, v0);
                v1.vadd(shape.pillarOffset, v1);
                v2.vadd(shape.pillarOffset, v2);
                heightfieldVertices.push(v0.x, v0.y, v0.z);
                heightfieldVertices.push(v1.x, v1.y, v1.z);
                heightfieldVertices.push(v2.x, v2.y, v2.z);
                const i = heightfieldVertices.length / 3 - 3;
                heightfieldIndices.push(i, i + 1, i + 2);
              }
            }
          }
          heightfieldGeometry.setAttribute('position', new THREE.Float32BufferAttribute(heightfieldVertices, 3));
          heightfieldGeometry.setIndex(heightfieldIndices);
          heightfieldGeometry.computeVertexNormals();
          mesh = new THREE.Mesh(heightfieldGeometry, material);
          break;
        case CANNON.Shape.types.TRIMESH:
          const trimeshGeometry = new THREE.BufferGeometry();
          const trimeshVertices = [];
          const trimeshIndices = [];
          let tv0 = new CANNON.Vec3();
          let tv1 = new CANNON.Vec3();
          let tv2 = new CANNON.Vec3();
          for (let i = 0; i < shape.indices.length / 3; i++) {
            shape.getTriangleVertices(i, tv0, tv1, tv2);
            trimeshVertices.push(tv0.x, tv0.y, tv0.z);
            trimeshVertices.push(tv1.x, tv1.y, tv1.z);
            trimeshVertices.push(tv2.x, tv2.y, tv2.z);
            const j = trimeshVertices.length / 3 - 3;
            trimeshIndices.push(j, j + 1, j + 2);
          }
          trimeshGeometry.setAttribute('position', new THREE.Float32BufferAttribute(trimeshVertices, 3));
          trimeshGeometry.setIndex(trimeshIndices);
          trimeshGeometry.computeVertexNormals();
          mesh = new THREE.Mesh(trimeshGeometry, material);
          break;
        default:
          return;
      }
      mesh.receiveShadow = receiveShadow;
      mesh.castShadow = castShadow;
      mesh.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = castShadow;
          child.receiveShadow = receiveShadow;
        }
      });
      const o = body.shapeOffsets[index];
      const q = body.shapeOrientations[index++];
      mesh.position.set(o.x, o.y, o.z);
      mesh.quaternion.set(q.x, q.y, q.z, q.w);
      obj.add(mesh);
    });

    return obj;
  }
  updateBodies(world) {
    world.bodies.forEach((body) => {
      if (body.threemesh) {
        body.threemesh.position.copy(body.position);
        body.threemesh.quaternion.copy(body.quaternion);
      }
    });
  }
}
