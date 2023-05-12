import * as THREE from "three";
import {cubes, grid, settings} from "./main";
import {OrbitControls} from "three/addons/controls/OrbitControls";
import {renderTooltip, setupTooltip} from "./TooltipHandler";

const {innerWidth, innerHeight} = window;

export const renderer = new THREE.WebGLRenderer({alpha: true, antialias: true});
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(2);

document.body.appendChild(renderer.domElement);

export const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
export const controls = new OrbitControls(camera, renderer.domElement);

controls.enableDamping = true;

export const scene = new THREE.Scene();
scene.background = new THREE.Color(0.4, 0.4, 0.4);

export function initScene() {
    const light = new THREE.HemisphereLight('white', "gray", 1);
    light.position.set(0, 100, 0);
    scene.add(light);

    controls.target.set(settings.width / 2, settings.height / 2, settings.depth / 2);

    camera.position.set(30, 10, 30);
    camera.lookAt(10, 0, 0);

    controls.update();

    // Handle window resize
    window.addEventListener('resize', () => {
        const {innerWidth, innerHeight} = window;

        renderer.setSize(innerWidth, innerHeight);
        camera.aspect = innerWidth / innerHeight;
        camera.updateProjectionMatrix();
    });

    setupTooltip();

    renderer.setAnimationLoop(() => {
        controls.update();
        // Render scene
        renderer.render(scene, camera);
        renderTooltip();
    });
}

export function addGridCubes() {
    for (let x = 0; x < settings.width; x++) {
        for (let y = 0; y < settings.height; y++) {
            for (let z = 0; z < settings.depth; z++) {
                addGridCube(grid, x, y, z, grid[x][y][z]);
            }
        }
    }
}

function addGridCube(grid, x, y, z, object) {
    let gridObject = grid[x][y][z];
    let size = 0.8;

    let width = isSame(x + 1, y, z, gridObject) ? 1 : size;
    let height = isSame(x, y + 1, z, gridObject) ? 1 : size;
    let depth = isSame(x, y, z + 1, gridObject) ? 1 : size;

    if (!settings.mergeSame) {
        width = height = depth = size;
    }

    const geometry = new THREE.BoxGeometry(width, height, depth);
    geometry.translate(width / 2, height / 2, depth / 2); // pivot point is shifted

    if (gridObject && gridObject.id) {
        const material = new THREE.MeshPhongMaterial({color: gridObject.color, emissive: 0x000000});
        const cube = new THREE.Mesh(geometry, material);

        cube.position.set(x, y, z);
        cube.package = object;

        scene.add(cube);
        cubes.push(cube);
    } else if (settings.renderEmpty) {
        const material = new THREE.MeshStandardMaterial({
            color: new THREE.Color(1, 0.3, 0.3), wireframe: true
        });
        const cube = new THREE.Mesh(geometry, material);
        cube.position.set(x, y, z);
        scene.add(cube);
        cubes.push(cube);
    }

    function isSame(x, y, z, obj) {
        const width = grid.length;
        const height = grid[0].length;
        const depth = grid[0][0].length;
        if (x >= 0 && y >= 0 && z >= 0) {
            if (x < width && y < height && z < depth) {
                if (obj && obj.id) {
                    return grid[x][y][z] && grid[x][y][z].id === obj.id;
                } else {
                    return !grid[x][y][z] || !grid[x][y][z].id;
                }
            }
        }
        return false;
    }
}