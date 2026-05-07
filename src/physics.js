import * as CANNON from 'cannon-es';

const PHYS_GRAVITY    = 20;
export const PHYS_IMPULSE_STR = 10;

export function initPhysics(sphereRadius) {
    const world = new CANNON.World();
    world.gravity.set(0, 0, 0);
    world.allowSleep      = true;
    world.sleepSpeedLimit = 0.4;
    world.sleepTimeLimit  = 1.5;
    world.solver.iterations = 40;
    world.solver.tolerance  = 0.001;

    const planetMaterial = new CANNON.Material('planet');
    const objectMaterial = new CANNON.Material('object');

    const planetBody = new CANNON.Body({
        mass: 0,
        shape: new CANNON.Sphere(sphereRadius),
        position: new CANNON.Vec3(0, 0, 0),
    });
    planetBody.material = planetMaterial;

    world.addContactMaterial(new CANNON.ContactMaterial(planetMaterial, objectMaterial, {
        friction: 0.8,
        restitution: 0.1,
        contactEquationStiffness: 1e8,
        contactEquationRelaxation: 3,
    }));
    world.addBody(planetBody);

    function stepPhysics(delta, physicsObjects) {
        for (const po of physicsObjects) {
            if (po.body.sleepState < 2) {
                const p = po.body.position;
                const len = p.length();
                if (len > 0.001) {
                    const s = -po.body.mass * PHYS_GRAVITY / len;
                    po.body.force.set(p.x * s, p.y * s, p.z * s);
                }
            }
        }

        world.step(1 / 60, delta, 3);

        // Ground clamp — prevent objects from sinking below the sphere surface
        for (const po of physicsObjects) {
            if (po.body.sleepState === 2) continue;
            const p = po.body.position;
            const dist = p.length();
            if (dist < po.groundDist && dist > 0.001) {
                const scale = po.groundDist / dist;
                p.x *= scale; p.y *= scale; p.z *= scale;
                const nx = p.x / po.groundDist, ny = p.y / po.groundDist, nz = p.z / po.groundDist;
                const v = po.body.velocity;
                const vn = v.x*nx + v.y*ny + v.z*nz;
                if (vn < 0) { v.x -= vn*nx; v.y -= vn*ny; v.z -= vn*nz; }
            }
        }

        // Sync Three.js meshes with Cannon bodies
        for (const po of physicsObjects) {
            if (po.body.sleepState === 2) continue;
            const p  = po.body.position;
            const bq = po.body.quaternion;
            po.mesh.quaternion.set(bq.x, bq.y, bq.z, bq.w);
            if (Math.abs(po.meshOriginOffset) > 0.0001) {
                const byX = 2*(bq.x*bq.y - bq.w*bq.z);
                const byY = 1 - 2*(bq.x*bq.x + bq.z*bq.z);
                const byZ = 2*(bq.y*bq.z + bq.w*bq.x);
                const off = po.meshOriginOffset;
                po.mesh.position.set(p.x - byX*off, p.y - byY*off, p.z - byZ*off);
            } else {
                po.mesh.position.set(p.x, p.y, p.z);
            }
            const dist = p.length();
            if (dist > 0.001) po.surfaceNormal.set(p.x / dist, p.y / dist, p.z / dist);
        }
    }

    return { physicsWorld: world, objectMaterial, stepPhysics };
}
