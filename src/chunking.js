// chunk.js
import { createTrees, createForestArea } from './tree.js';
import { spawnTeaPots } from './teapot.js';
import { createHouses } from './house.js';

const CHUNK_SIZE = 100;
const ACTIVE_RADIUS = 1;

export class ChunkManager {
  constructor(game) {
    this.game = game;
    this.loadedChunks = new Map();
  }
  getChunkCoord(x, z) {
    return [Math.floor(x / CHUNK_SIZE), Math.floor(z / CHUNK_SIZE)];
  }
  updateChunks() {
    const playerPos = this.game.vehicle?.chassisBody?.position;
    if (!playerPos) return;
    const [cx, cz] = this.getChunkCoord(playerPos.x, playerPos.z);
    const activeChunks = new Set();
    for (let dx = -ACTIVE_RADIUS; dx <= ACTIVE_RADIUS; dx++) {
      for (let dz = -ACTIVE_RADIUS; dz <= ACTIVE_RADIUS; dz++) {
        const key = `${cx + dx},${cz + dz}`;
        activeChunks.add(key);
        if (!this.loadedChunks.has(key)) {
          this.loadChunk(cx + dx, cz + dz);
        }
      }
    }
    for (const key of this.loadedChunks.keys()) {
      if (!activeChunks.has(key)) {
        this.unloadChunk(key);
      }
    }
  }

  loadChunk(i, j) {
    const key = `${i},${j}`;
    const centerX = i * CHUNK_SIZE + CHUNK_SIZE / 2;
    const centerZ = j * CHUNK_SIZE + CHUNK_SIZE / 2;
    const objects = {
      trees: createForestArea(this.game, centerX, centerZ, CHUNK_SIZE / 2, 15),
    };
    this.loadedChunks.set(key, objects);
  }

  unloadChunk(key) {
    const chunkData = this.loadedChunks.get(key);
    if (!chunkData) return;
    const { trees = [] } = chunkData;
    const removeObjects = (list) => {
      list.forEach(obj => {
        if (obj.mesh) this.game.scene.remove(obj.mesh);
        if (obj.body) this.game.world.removeBody(obj.body);
      });
    };
    removeObjects(trees);
    this.loadedChunks.delete(key);
  }
}
