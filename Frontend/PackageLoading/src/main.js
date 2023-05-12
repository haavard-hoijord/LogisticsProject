import * as THREE from 'three';
import "./main.css"
import {randomBox} from "./Box";
import {Algorithm} from "./Algorithms/Algorithm";
import {BestFitAlgorithm} from "./Algorithms/BestFitAlgorithm";
import {fetchVehicles} from "./VehicleHandler";
import {addGridCubes, controls, initScene, scene} from "./SceneHandler";
import {create3DArray} from "./Util";

export const algorithms = {
    Default: Algorithm,
    BestFit: BestFitAlgorithm,
}

export let defaultSettings = {
    width: 20,
    height: 10,
    depth: 10,
}

export let settings = JSON.parse(sessionStorage.getItem("settings")) || {
    DEBUG: true,
    width: defaultSettings.width,
    height: defaultSettings.height,
    depth: defaultSettings.depth,
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
export let grid = [create3DArray(settings.width, settings.height, settings.depth)];

export function setCubes(newCubes) {
    cubes = newCubes;
}

export function setPackages(newPackages) {
    packages = newPackages;
}

export function setGrid(newGrid) {
    grid = newGrid;
}

(async () => {
    initScene();

    await fetchVehicles();

    if (settings.DEBUG) {
        initPackages();
    }

    initCubes();
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
    generateCubes(packages);
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
        let box = randomBox(i + 1);
        packages.push(box);
    }
}

function generateCubes(objects) {
    let algorithmClass = algorithms[settings.algorithm];
    let algorithm = new algorithmClass(settings.width, settings.height, settings.depth, objects);

    console.log(`Running "${settings.algorithm} - ${algorithmClass.name}"`);

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
