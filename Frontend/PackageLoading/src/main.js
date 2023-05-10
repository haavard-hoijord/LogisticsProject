import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import "./main.css"
import {initGUI, selectVehicle, updateGUI} from "./Gui";
import {renderTooltip, setupTooltip} from "./Tooltip";
import {Box} from "./Box";
import {Algorithm} from "./Algorithms/Algorithm";
import {BestFitAlgorithm} from "./Algorithms/BestFitAlgorithm";

export const algorithms = {
    default: Algorithm,
    bestFit: BestFitAlgorithm,
}

export let settings = JSON.parse(sessionStorage.getItem("settings")) || {
    DEBUG: true,
    width: 20,
    height: 10,
    depth: 10,
    maxSize: 5,
    packageCount: 100,
    uniformSizes: false,
    renderEmpty: false,
    mergeSame: true,
    algorithm: Object.keys(algorithms)[0],
    checkBelowWeight: true,
}

export let stats = {
    missedPackages: 0,
    runTime: "",
    runTimes: [],
    avgRunTime: ""
}

export let cubes = [];
export let packages = [];
export let grid = create3DArray(settings.width, settings.height, settings.depth);

export function setCubes(newCubes){
    cubes = newCubes;
}

export function setPackages(newPackages){
    packages = newPackages;
}

export function setGrid(newGrid){
    grid = newGrid;
}

export let vehicles = [];

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

(async () => {
    const light = new THREE.HemisphereLight('white', "gray", 1);
    light.position.set(0, 100, 0);
    scene.add(light);

    const DAPR_URL = `http://localhost:5000/dapr`;
    fetch(`${DAPR_URL}/v1.0/invoke/Data/method/track/all`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    })
        .then(response => response.json())
        .then(data => {
            vehicles = data

            if (!settings.DEBUG && vehicles && vehicles.length > 0) {
                selectVehicle(vehicles.filter(vehicles => vehicles.route)[0]);
                updateGUI();
            }
        });


    if (settings.DEBUG) {
        initPackages();
    }

    initCubes();
    initGUI();

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
})();

export function initCubes() {
    console.log("initCubes");

    for (const cube of cubes) {
        scene.remove(cube);
    }

    cubes = [];

    if (controls) {
        controls.target.set(settings.width / 2, settings.height / 2, settings.depth / 2);
    }

    grid = create3DArray(settings.width, settings.height, settings.depth);
    fill3DArray(packages);
    addGridCubes();

    const planeMaterial = new THREE.MeshStandardMaterial({
        color: 0x999999, side: THREE.DoubleSide, opacity: 0.3, transparent: true
    });

    const geometry = new THREE.BoxGeometry(settings.width + 0.1, settings.height + 0.1, settings.depth + 0.1);
    geometry.translate(settings.width / 2, settings.height / 2, settings.depth / 2); // pivot point is shifted
    const cube = new THREE.Mesh(geometry, planeMaterial);
    cube.position.set(-0.05, -0.05, -0.05);
    scene.add(cube);
    cubes.push(cube);
}

export function initPackages() {
    console.log("initPackages");

    packages = [];
    for (let i = 0; i < settings.packageCount; i++) {
        let randomSize = () => Math.max(1, Math.round(Math.random() * settings.maxSize));
        let size = randomSize();
        let box = new Box({
            width: settings.uniformSizes ? size : randomSize(),
            height: settings.uniformSizes ? size : randomSize(),
            depth: settings.uniformSizes ? size : randomSize(),
            weight: Math.max(1, Math.round(Math.random() * 20)),
            id: i + 1,
            color: new THREE.Color(Math.random(), Math.random(), Math.random())
        });
        packages.push(box);
    }
}

function create3DArray(width, height, depth) {
    const arr = new Array(width);
    for (let i = 0; i < width; i++) {
        arr[i] = new Array(height);
        for (let j = 0; j < height; j++) {
            arr[i][j] = new Array(depth).fill(0);
        }
    }
    return arr;
}
function fill3DArray(objects) {
    const width = grid.length;
    const height = grid[0].length;
    const depth = grid[0][0].length;

    let algorithmClass = algorithms[settings.algorithm];
    let algorithm = new algorithmClass(width, height, depth, objects);

    console.log("Running algorithm " + algorithmClass.name + "...");

    const startTime = performance.now();
    let result = algorithm.run();
    const endTime = performance.now();

    const unplacedObjects = result.map(object => object.id);
    if (unplacedObjects.length > 0) {
        console.log(`${unplacedObjects.length} boxes with IDs [${unplacedObjects.join(', ')}] could not be placed.`);
    }

    let runtime = endTime - startTime;
    stats.missedPackages = unplacedObjects.length;
    stats.runTime = runtime + "ms";
    stats.runTimes.push(runtime);
    stats.avgRunTime = Math.round(stats.runTimes.reduce((a, b) => a + b, 0) / stats.runTimes.length) + "ms";
}
function addGridCubes() {
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

export function stableSort(array, compareFn) {
    return array
        .map((item, index) => ({ item, index }))
        .sort((a, b) => {
            const result = compareFn(a.item, b.item);
            return result !== 0 ? result : a.index - b.index;
        })
        .map(({ item }) => item);
}
