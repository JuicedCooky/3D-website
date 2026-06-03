import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import barrelUrl       from '../../3d_models/objects/random_objects/barrel/barrel.glb?url';
import barrelOpenUrl   from '../../3d_models/objects/random_objects/barrel/barrel-open.glb?url';
import boxUrl          from '../../3d_models/objects/random_objects/box/box.glb?url';
import boxLargeUrl     from '../../3d_models/objects/random_objects/box/box-large.glb?url';
import boxOpenUrl      from '../../3d_models/objects/random_objects/box/box-open.glb?url';
import boxLargeOpenUrl from '../../3d_models/objects/random_objects/box/box-large-open.glb?url';

export const RANDOM_OBJ_CLUSTERS         = 50;
export const RANDOM_OBJ_SCALE            = 2.0;
const RANDOM_OBJ_SPREAD                  = 1.0;
const RANDOM_OBJ_EXCL_RADIUS             = 2.5;
export const RANDOM_OBJ_COLLISION_RADIUS = RANDOM_OBJ_SCALE * 0.45;
const PHYS_HALF_EXT                      = RANDOM_OBJ_SCALE * 0.35;

export let cosObjCollision = 0;
export let cosObjExcl      = 0;
export let physicsObjects  = [];

let _scene          = null;
let _physicsWorld   = null;
let _objectMaterial = null;
let _settings       = null;
let _schoolNormal   = null;
let _sphereRadius   = 0;
let randomObjRoot   = null;
let barrelTemplates = null;
let boxTemplates    = null;

export function spawnRandomObjects() {
    if (!barrelTemplates || !boxTemplates) return;
    if (randomObjRoot) { _scene.remove(randomObjRoot); randomObjRoot = null; }
    for (const po of physicsObjects) _physicsWorld.removeBody(po.body);
    physicsObjects = [];
    const count = _settings.objClusters;
    if (count <= 0) return;

    randomObjRoot = new THREE.Group();
    const groups = [barrelTemplates, boxTemplates];
    const _n = new THREE.Vector3();
    const _tangent = new THREE.Vector3();

    const itemFootprint = RANDOM_OBJ_SCALE * 0.4;
    const minItemSep    = 2 * itemFootprint;
    const minClusterSep = RANDOM_OBJ_SPREAD + minItemSep;
    const cosMinCluster = Math.cos(minClusterSep / _sphereRadius);
    const cosMinItem    = Math.cos(minItemSep     / _sphereRadius);

    const clusterCenters = [];

    for (let c = 0; c < count; c++) {
        let theta, phi, attempts = 0, valid = false;
        do {
            theta = Math.random() * Math.PI * 2;
            phi   = Math.acos(2 * Math.random() - 1);
            _n.set(
                Math.sin(phi) * Math.cos(theta),
                Math.cos(phi),
                Math.sin(phi) * Math.sin(theta)
            );
            attempts++;
            if (_n.dot(_schoolNormal) > cosObjExcl) continue;
            if (clusterCenters.some(cc => cc.dot(_n) > cosMinCluster)) continue;
            valid = true;
        } while (!valid && attempts < 100);
        if (!valid) continue;

        clusterCenters.push(_n.clone());
        const grp      = groups[Math.floor(Math.random() * groups.length)];
        const itemCnt  = 1 + Math.floor(Math.random() * 4);
        const itemNormals = [];

        for (let i = 0; i < itemCnt; i++) {
            let itemNormal = null;
            for (let att = 0; att < 20; att++) {
                _tangent.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5)
                        .addScaledVector(_n, -_tangent.dot(_n)).normalize();
                const arc = Math.random() * RANDOM_OBJ_SPREAD / _sphereRadius;
                const candidate = _n.clone()
                    .applyQuaternion(new THREE.Quaternion().setFromAxisAngle(_tangent, arc))
                    .normalize();
                if (!itemNormals.some(p => p.dot(candidate) > cosMinItem)) {
                    itemNormal = candidate;
                    itemNormals.push(candidate);
                    break;
                }
            }
            if (!itemNormal) continue;

            const template = grp[Math.floor(Math.random() * grp.length)];
            const obj    = template.clone();
            const alignQ = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), itemNormal);
            const yawQ   = new THREE.Quaternion().setFromAxisAngle(itemNormal, Math.random() * Math.PI * 2);
            obj.quaternion.copy(yawQ).multiply(alignQ);

            const rawHe = template.userData.halfExtents ?? new THREE.Vector3(PHYS_HALF_EXT, PHYS_HALF_EXT, PHYS_HALF_EXT);
            const he = rawHe.clone().multiplyScalar(RANDOM_OBJ_SCALE);
            const groundDist = _sphereRadius + he.y;

            const bboxCenterY      = template.userData.bboxCenterY ?? 0;
            const meshOriginOffset = bboxCenterY * RANDOM_OBJ_SCALE;
            const meshDist         = groundDist - meshOriginOffset;

            obj.position.copy(itemNormal).multiplyScalar(meshDist);
            obj.scale.setScalar(RANDOM_OBJ_SCALE);
            randomObjRoot.add(obj);

            const body = new CANNON.Body({
                mass: 1,
                shape: new CANNON.Box(new CANNON.Vec3(he.x, he.y, he.z)),
                material: _objectMaterial,
                linearDamping:  0.4,
                angularDamping: 0.8,
            });
            body.position.set(
                itemNormal.x * groundDist,
                itemNormal.y * groundDist,
                itemNormal.z * groundDist,
            );
            body.quaternion.set(obj.quaternion.x, obj.quaternion.y, obj.quaternion.z, obj.quaternion.w);
            _physicsWorld.addBody(body);
            body.sleep();
            physicsObjects.push({ body, mesh: obj, surfaceNormal: itemNormal.clone(), colliding: false, groundDist, meshOriginOffset });
        }
    }
    _scene.add(randomObjRoot);
}

export function initScatter(scene, loader, physicsWorld, objectMaterial, settings, SPHERE_RADIUS, schoolNormal) {
    _scene          = scene;
    _physicsWorld   = physicsWorld;
    _objectMaterial = objectMaterial;
    _settings       = settings;
    _sphereRadius   = SPHERE_RADIUS;
    _schoolNormal   = schoolNormal;

    cosObjExcl      = Math.cos(RANDOM_OBJ_EXCL_RADIUS      / SPHERE_RADIUS);
    cosObjCollision = Math.cos(RANDOM_OBJ_COLLISION_RADIUS / SPHERE_RADIUS);

    const loadGlb = (url) => new Promise((res, rej) => loader.load(url, (gltf) => res(gltf.scene), undefined, rej));
    Promise.all([
        loadGlb(barrelUrl),
        loadGlb(barrelOpenUrl),
        loadGlb(boxUrl),
        loadGlb(boxLargeUrl),
        loadGlb(boxOpenUrl),
        loadGlb(boxLargeOpenUrl),
    ]).then(([barrel, barrelOpen, box, boxLarge, boxOpen, boxLargeOpen]) => {
        const _bsize   = new THREE.Vector3();
        const _bcenter = new THREE.Vector3();
        const _bbox    = new THREE.Box3();
        [barrel, barrelOpen, box, boxLarge, boxOpen, boxLargeOpen].forEach(obj => {
            obj.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
            _bbox.setFromObject(obj);
            _bbox.getSize(_bsize);
            _bbox.getCenter(_bcenter);
            obj.userData.halfExtents = _bsize.clone().divideScalar(2);
            obj.userData.bboxCenterY = _bcenter.y;
        });
        barrelTemplates = [barrel, barrelOpen];
        boxTemplates    = [box, boxLarge, boxOpen, boxLargeOpen];
        spawnRandomObjects();
    }).catch(e => console.error('random_objects:', e));
}
