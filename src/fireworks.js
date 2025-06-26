import * as THREE from 'three';

export function createFirework(context, x, y, z) {
    const firework = {
        particles: [],
        position: new THREE.Vector3(x, y, z),
        life: 0,
        maxLife: 2000,
        exploded: false
    };
    const rocketGeometry = new THREE.SphereGeometry(0.2, 8, 8);
    const rocketMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const rocket = new THREE.Mesh(rocketGeometry, rocketMaterial);
    rocket.position.copy(firework.position);
    context.scene.add(rocket);

    firework.rocket = rocket;
    firework.rocketSpeed = new THREE.Vector3(
        (Math.random()) * 10,
        20 + Math.random() * 10,
        (Math.random()) * 10
    );
    return firework;
}

export function triggerFireworks(context) {
    const carPos = context.vehicle.chassisBody.position;
    const carRotation = context.vehicle.chassisBody.quaternion;
    const forwardDirection = new THREE.Vector3(0, 0, -1);
    forwardDirection.applyQuaternion(carRotation);
    const distanceInFront = 100;
    const frontPosition = new THREE.Vector3(
        carPos.x + forwardDirection.x * distanceInFront,
        carPos.y + 5,
        carPos.z + forwardDirection.z * distanceInFront
    );
    const numFireworks = 80;
    for (let i = 0; i < numFireworks; i++) {
        setTimeout(() => {
            const firework = createFirework(
                context,
                frontPosition.x + (Math.random() - 0.5) * 30,
                frontPosition.y,
                frontPosition.z + (Math.random() - 0.5) * 30
            );
            context.fireworks.push(firework);
        }, i * 200);
    }
}

export function updateFireworks(context, deltaTime) {
    context.fireworks = context.fireworks.filter(firework => {
        firework.life += deltaTime * 1000;
        if (!firework.exploded && firework.life > 800) {
            explodeFirework(context, firework);
            firework.exploded = true;
            if (firework.rocket) {
                context.scene.remove(firework.rocket);
            }
        }
        if (firework.exploded) {
            firework.particles.forEach(particle => {
                particle.position.add(particle.velocity.clone().multiplyScalar(deltaTime));
                particle.velocity.y -= 20 * deltaTime;
                particle.material.opacity -= deltaTime * 0.8;
                if (particle.material.opacity <= 0) {
                    context.scene.remove(particle);
                }
            });
            firework.particles = firework.particles.filter(p => p.material.opacity > 0);
        } else if (firework.rocket) {
            firework.rocket.position.add(firework.rocketSpeed.clone().multiplyScalar(deltaTime));
            firework.rocketSpeed.y -= 10 * deltaTime;
        }
        return firework.life < firework.maxLife &&
            (firework.particles.length > 0 || !firework.exploded);
    });
}

export function explodeFirework(context, firework) {
    const numParticles = 30;
    const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff, 0xffffff];
    for (let i = 0; i < numParticles; i++) {
        const particleGeometry = new THREE.SphereGeometry(0.1, 4, 4);
        const particleMaterial = new THREE.MeshBasicMaterial({
            color: colors[Math.floor(Math.random() * colors.length)],
            transparent: true,
            opacity: 1
        });
        const particle = new THREE.Mesh(particleGeometry, particleMaterial);
        if (firework.rocket) {
            particle.position.copy(firework.rocket.position);
        } else {
            particle.position.copy(firework.position);
        }
        const speed = 10 + Math.random() * 15;
        const phi = Math.random() * Math.PI * 2;
        const theta = Math.random() * Math.PI;
        particle.velocity = new THREE.Vector3(
            speed * Math.sin(theta) * Math.cos(phi),
            speed * Math.cos(theta),
            speed * Math.sin(theta) * Math.sin(phi)
        );
        context.scene.add(particle);
        firework.particles.push(particle);
    }
}
