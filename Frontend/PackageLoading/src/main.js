import * as THREE from 'three';
import "./main.css"
import {randomBox} from "./Box";
import {Algorithm} from "./Algorithms/Algorithm";
import {BestFitAlgorithm} from "./Algorithms/BestFitAlgorithm";
import {fetchVehicles} from "./VehicleHandler";
import {addGridCubes, controls, initScene, scene} from "./SceneHandler";
import {create3DArray} from "./Util";
import {getMaterials} from "./WeightOverview";
import {BestFitWeightAlgorithm} from "./Algorithms/BestFitWeightAlgorithm";

export const algorithms = {
    FirstFit: Algorithm,
    BestFit: BestFitAlgorithm,
    BestFitWeight: BestFitWeightAlgorithm
}

export let defaultSettings = {
    width: 20,
    height: 10,
    depth: 10,
}

export let renderOverlays = ["None", "Weight", "DeliveryOrder", "CarryWeight", "TippingRisk", "Stability"]

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
    weightOverview: false,
    renderOverlay: "None"
}

export let stats = {
    missedPackages: 0,
    runTime: "",
    runTimes: [],
    avgRunTime: ""
}

export const materialData = {
    color: 0x999999,
    side: THREE.DoubleSide,
    opacity: 0.3,
    transparent: true
}

export let cubes = [];
export let packages = [];
export let grid = [create3DArray(settings.width, settings.height, settings.depth)];

export function clearPackages() {
    packages = [];
}

export function setPackages(newPackages) {
    packages = newPackages;
}

export function clearGrid() {
    grid = [create3DArray(settings.width, settings.height, settings.depth)];
}

(async () => {
    initScene();

    await fetchVehicles();

    if (settings.DEBUG) {
        initPackages();
    }

    initCubes();
})();

export function reRenderCubes(){
    for (const cube of cubes) {
        scene.remove(cube);
    }

    cubes = [];

    addGridCubes();

    //Add the outline box
    const material = new THREE.MeshStandardMaterial(materialData);
    let materials;

    if(settings.weightOverview) {
        materials = getMaterials();
    }else{
        materials = [
            material, material, material, material, material, material,
        ];

    }
    const geometry = new THREE.BoxGeometry(settings.width + 0.1, settings.height + 0.1, settings.depth + 0.1);
    geometry.translate(settings.width / 2, settings.height / 2, settings.depth / 2); // pivot point is shifted
    const cube = new THREE.Mesh(geometry, materials);
    cube.position.set(-0.05, -0.05, -0.05);
    scene.add(cube);
    cubes.push(cube);
}

export function initCubes() {
    for (const cube of cubes) {
        scene.remove(cube);
    }

    cubes = [];

    if (controls) {
        controls.target.set(settings.width / 2, settings.height / 2, settings.depth / 2);
    }

    grid = create3DArray(settings.width, settings.height, settings.depth);
    generateCubes(packages);
    reRenderCubes();
}

export function initPackages() {
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