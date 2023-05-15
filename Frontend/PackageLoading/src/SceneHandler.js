import * as THREE from "three";
import {cubes, grid, packages, settings} from "./main";
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
        let color = gridObject.color;

        if(settings.renderOverlay === "Weight"){
            let maxValue = -Infinity;

            for(let x = 0; x < settings.width; x++){
                for(let y = 0; y < settings.height; y++){
                    for(let z = 0; z < settings.depth; z++){
                        let pack = grid[x][y][z];
                        if(pack && pack.weight > maxValue){
                            maxValue = pack.weight;
                        }
                    }
                }
            }

            let value = gridObject.weight;
            let normalizedValue = 1 - (value / (maxValue * 0.75));

            // Map the normalized value to a hue between 0 (red) and 120 (green)
            let hue = Math.max(0, normalizedValue) * 120;
            color = new THREE.Color(`hsla(${hue}, 100%, 50%, 1.0)`);
        }else if(settings.renderOverlay === "DeliveryOrder"){
            let maxValue = -Infinity;

            for(let x = 0; x < settings.width; x++){
                for(let y = 0; y < settings.height; y++){
                    for(let z = 0; z < settings.depth; z++){
                        let pack = grid[x][y][z];
                        if(pack && pack.deliveryOrder > maxValue){
                            maxValue = pack.deliveryOrder;
                        }
                    }
                }
            }

            let value = gridObject.deliveryOrder;
            let normalizedValue = 1 - value / maxValue;

            // Map the normalized value to a hue between 0 (red) and 120 (green)
            let hue = Math.max(0, normalizedValue) * 120;
            color = new THREE.Color(`hsla(${hue}, 100%, 50%, 1.0)`);
        }else if(settings.renderOverlay === "CarryWeight"){
            let maxValue = object.weight;
            let value = 0;
            let ids = [];
            for(let dx = 0; dx < object.width; dx++){
                for(let dz = 0; dz < object.depth; dz++){
                    let dy = y + object.height + 1;

                    if(dy >= settings.height || dx + object.origin.x >= settings.width || dz + object.origin.z >= settings.depth){
                        continue;
                    }

                    for(let dy = 0; dy < object.height; dy++){
                        if(dy + object.origin.y + object.height >= settings.height){
                            continue;
                        }

                        let pack = grid[dx + object.origin.x][object.height + dy + object.origin.y][dz + object.origin.z];

                        if(pack && !ids.includes(pack.id)){
                            value += pack.weight;
                            ids.push(pack.id);
                        }
                    }
                }
            }

            let normalizedValue = 1 - (value / maxValue);

            // Map the normalized value to a hue between 0 (red) and 120 (green)
            let hue = Math.max(0, normalizedValue) * 120;
            color = new THREE.Color(`hsla(${hue}, 100%, 50%, 1.0)`);
        }else if (settings.renderOverlay === "TippingRisk"){
            let value = object.heightRatio;
            let maxValue = 5;
            let normalizedValue = 1 - value / maxValue;

            // Map the normalized value to a hue between 0 (red) and 120 (green)
            let hue = Math.max(0, normalizedValue) * 120;
            color = new THREE.Color(`hsla(${hue}, 100%, 50%, 1.0)`);
        }else if(settings.renderOverlay === "Stability"){
            let value = 0;
            let maxValue = 0.75;

            // Calculate the amount of free space remaining around the cube (lower is better)
            let freeSpace = 0;
            let totalSpace = 0;

            for (let dx = 0; dx < object.width; dx++) {
                for (let dy = 0; dy < object.height; dy++) {
                    for (let dz = 0; dz < object.depth; dz++) {
                        for (let offsetX = -1; offsetX <= 1; offsetX++) {
                            for (let offsetY = -1; offsetY <= 1; offsetY++) {
                                for (let offsetZ = -1; offsetZ <= 1; offsetZ++) {
                                    if (object.origin.x + offsetX + dx < 0 || object.origin.x + offsetX + dx >= settings.width || object.origin.y + offsetY + dy < 0 || object.origin.y + offsetY + dy >= settings.height || object.origin.z + offsetZ + dz < 0 || object.origin.z + offsetZ + dz >= settings.depth) {
                                        continue;
                                    }

                                    if (grid[object.origin.x + dx + offsetX][object.origin.y + dy + offsetY][object.origin.z + dz + offsetZ] === 0) {
                                        freeSpace++;
                                    }
                                    totalSpace++;
                                }
                            }
                        }
                    }
                }
            }
            value = freeSpace / totalSpace;

            if(object.isTippingRisk()){
                value *= 1.5;
            }

            let normalizedValue = 1 - value / maxValue;

            // Map the normalized value to a hue between 0 (red) and 120 (green)
            let hue = Math.max(0, normalizedValue) * 120;
            color = new THREE.Color(`hsla(${hue}, 100%, 50%, 1.0)`);
        }

        const material = new THREE.MeshPhongMaterial({color: color, emissive: 0x000000});
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