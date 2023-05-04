import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GUI} from "dat.gui";

const DAPR_URL = `http://localhost:5000/dapr`;
let DEBUG = false;

let width = 20;
let height = 10;
let depth = 10;

let limitHeight = height;

let uniformSizes = true;
let renderEmpty = false;
let mergeSame = true;

let packageCount = 100;

let cubes = [];
let packages = [];
let grid = create3DArray(width, height, depth);

let vehicles = [];

const renderer = new THREE.WebGLRenderer();
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const controls = new OrbitControls(camera, renderer.domElement);

(async () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Enable softer shadows

    document.body.appendChild(renderer.domElement);

    scene.background = new THREE.Color(0.4, 0.4, 0.4);

    const light = new THREE.HemisphereLight('white', 10);
    light.position.set(0, 100, 0);
    scene.add(light);


    vehicles = await fetch(`${DAPR_URL}/v1.0/invoke/Data/method/track/all`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    }).then(response => response.json());

    if(DEBUG){
        initPackages();
    }else{
        selectVehicle(vehicles.filter(vehicles => vehicles.route)[0]);
    }

    initCubes();
    initGUI();

    controls.target.set(width / 2, height / 2, depth / 2);

    camera.position.set(30, 10, 30);
    camera.lookAt(10, 0, 0);

    controls.update();

    animate();
})();

function reInitCubes() {
    for (const cube of cubes) {
        scene.remove(cube);
    }

    cubes = [];
    initCubes();
}

function initCubes() {
    if(controls){
        controls.target.set(width / 2, height / 2, depth / 2);
    }
    grid = create3DArray(width, height, depth);
    fill3DArray(grid, packages);
    addGridCubes();

    const planeMaterial = new THREE.MeshStandardMaterial({
        color: 0x999999, side: THREE.DoubleSide, opacity: 0.3, transparent: true
    });

    const geometry = new THREE.BoxGeometry(width + 0.1, height + 0.1, depth + 0.1);
    geometry.translate(width / 2, height / 2, depth / 2); // pivot point is shifted
    const cube = new THREE.Mesh(geometry, planeMaterial);
    cube.position.set(-0.05, -0.05, -0.05);
    scene.add(cube);
    cubes.push(cube);
}

function initPackages() {
    packages = [];
    for (let i = 0; i < packageCount; i++) {
        let randomSize = () => Math.max(1, Math.round(Math.random() * 5));
        let size = randomSize();
        packages.push({
            width: uniformSizes ? size : randomSize(),
            height: uniformSizes ? size : randomSize(),
            depth: uniformSizes ? size : randomSize(),
            weight: Math.max(1, Math.round(Math.random() * 20)),
            id: i + 1,
            color: new THREE.Color(Math.random(), Math.random(), Math.random())
        })
    }
}


function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
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

function fill3DArray(array, objects,) {
    const width = array.length;
    const height = array[0].length;
    const depth = array[0][0].length;

    objects.sort((a, b) => (b.width * b.height * b.depth) - (a.width * a.height * a.depth));

    function objectFits(x, y, z, objectWidth, objectHeight, objectDepth) {
        if (x + objectWidth > width || y + objectHeight > height || z + objectDepth > depth) {
            return false;
        }

        if (!isOnFloor(x, y, z, objectWidth, objectDepth)) {
            return false;
        }

        for (let dx = 0; dx < objectWidth; dx++) {
            for (let dy = 0; dy < objectHeight; dy++) {
                for (let dz = 0; dz < objectDepth; dz++) {
                    if (array[x + dx][y + dy][z + dz] !== 0) {
                        return false;
                    }
                }
            }
        }

        return true;
    }

    function isOnFloor(x, y, z, objectWidth, objectDepth) {
        if (y === 0) {
            return true;
        }

        for (let dx = 0; dx < objectWidth; dx++) {
            for (let dz = 0; dz < objectDepth; dz++) {
                if (!hasFloor(x + dx, y, z + dz)) {
                    return false;
                }
            }
        }
        return true;
    }

    function placeObject(x, y, z, object) {
        for (let dx = 0; dx < object.width; dx++) {
            for (let dy = 0; dy < object.height; dy++) {
                for (let dz = 0; dz < object.depth; dz++) {
                    array[x + dx][y + dy][z + dz] = object;
                }
            }
        }
    }

    let remainingObjects = [...objects];

    while (remainingObjects.length > 0) {
        let objectPlaced = false;

        for (let i = 0; i < remainingObjects.length; i++) {
            const object = remainingObjects[i];
            const obSize = object.width * object.height * object.depth;

            if (obSize <= (2 * 2 * 2)) {
                for (let y = 0; y < height && !objectPlaced; y++) {

                    for (let x = 0; x < width && !objectPlaced; x++) {
                        for (let z = 0; z < depth && !objectPlaced; z++) {
                            if (objectFits(x, y, z, object.width, object.height, object.depth)) {
                                placeObject(x, y, z, object);
                                objectPlaced = true;
                                remainingObjects.splice(i, 1);
                            }
                        }
                    }
                }
            } else {
                for (let x = 0; x < width && !objectPlaced; x++) {
                    for (let y = 0; y < height && !objectPlaced; y++) {
                        for (let z = 0; z < depth && !objectPlaced; z++) {
                            if (objectFits(x, y, z, object.width, object.height, object.depth)) {
                                placeObject(x, y, z, object);
                                objectPlaced = true;
                                remainingObjects.splice(i, 1);
                            }
                        }
                    }
                }
            }
        }

        if (!objectPlaced) {
            break;
        }
    }

    const unplacedObjects = remainingObjects.map(object => object.id);
    if (unplacedObjects.length > 0) {
        console.log(`Objects with IDs [${unplacedObjects.join(', ')}] could not be placed.`);
    }
}

function hasFloor(x, y, z) {
    return y === 0 || grid[x][y - 1][z] !== 0;
}

function addGridCubes() {
    let ignoredCubes = [];

    for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
            for (let z = 0; z < depth; z++) {
                let gridObject = grid[x][y][z];

                if (y > limitHeight) {
                    ignoredCubes.push(gridObject.id);
                }
            }
        }
    }

    for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
            for (let z = 0; z < depth; z++) {
                let gridObject = grid[x][y][z];

                if (!ignoredCubes.includes(gridObject.id)) {
                    addGridCube(grid, x, y, z);
                }
            }
        }
    }
}

function addGridCube(grid, x, y, z) {
    let gridObject = grid[x][y][z];
    let size = 0.8;

    let width = isSame(x + 1, y, z, gridObject) ? 1 : size;
    let height = isSame(x, y + 1, z, gridObject) ? 1 : size;
    let depth = isSame(x, y, z + 1, gridObject) ? 1 : size;

    if (!mergeSame) {
        width = height = depth = size;
    }

    const geometry = new THREE.BoxGeometry(width, height, depth);
    geometry.translate(width / 2, height / 2, depth / 2); // pivot point is shifted

    if (gridObject && gridObject.id) {
        const material = new THREE.MeshStandardMaterial({color: gridObject.color});
        const cube = new THREE.Mesh(geometry, material);

        cube.position.set(x, y, z);

        scene.add(cube);
        cubes.push(cube);
    } else if (renderEmpty) {
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

let curVehicle;
function selectVehicle(vehicle){
    packages = [];

    curVehicle = vehicle;

    if(vehicle.route){
        vehicle.route.destinations.filter((destination, index) => destination.isPickup).map((destination, index) => destination.package).map((pk) => {
            return {
                ...pk,
                id: pk.routeId,
                color: new THREE.Color(Math.random(), Math.random(), Math.random())
            }
        }).forEach((pk) => {
            packages.push(pk);
        });
    }
    width = vehicle.width;
    height = vehicle.height;
    depth = vehicle.depth;
    reInitCubes();
}

function initGUI(){
    const gui = new GUI();

    const packagesFolder = gui.addFolder("Packages");
    let packageData = {packageCount, uniformSizes, renderEmpty, mergeSame};
    packagesFolder.add(packageData, "packageCount").onChange(() => {
        packageCount = packageData.packageCount;
        initPackages()
        reInitCubes();
    }).name("Package Count: ");

    packagesFolder.add(packageData, "uniformSizes").onChange(() => {
        uniformSizes = packageData.uniformSizes;
        initPackages()
        reInitCubes();
    }).name("Uniform Sizes: ");
    packagesFolder.add(packageData, "renderEmpty").onChange(() => {
        renderEmpty = packageData.renderEmpty;
        reInitCubes();
    }).name("Render Empty: ");
    packagesFolder.add(packageData, "mergeSame").onChange(() => {
        mergeSame = packageData.mergeSame;
        reInitCubes();
    }).name("Merge Same: ");

    packagesFolder.open();

    const sizeFolder = gui.addFolder("Size");
    let sizeData = {width, height, depth};
    sizeFolder.add(sizeData, "width").onChange(() => {
        width = sizeData.width;
        reInitCubes();
    }).name("Width: ");

    sizeFolder.add(sizeData, "height").onChange(() => {
        height = sizeData.height;
        limitHeight = Math.min(limitHeight, height);
        reInitCubes();
    }).name("Height: ");

    sizeFolder.add(sizeData, "depth").onChange(() => {
        depth = sizeData.depth;
        reInitCubes();
    }).name("Depth: ");

    sizeFolder.open();


    const vehicleFolder = gui.addFolder("Vehicles");

    for(let vehicle of vehicles.sort((e => -e.id))){
        vehicleFolder.add({[vehicle.id]: () => {
            selectVehicle(vehicle);
        }}, vehicle.id).name("Vehicle " + vehicle.id);
    }
    vehicleFolder.open();

    const otherFolder = gui.addFolder("Other");
    const btn = {
        ref: function () {
            if(DEBUG) initPackages();
            reInitCubes();
        },
        dbg: DEBUG
    };
    otherFolder.add(btn, "ref").name("Refresh");
    otherFolder.add(btn, "dbg").name("Debug").onChange(() => {
        DEBUG = btn.dbg;
        grid = [];

        if(DEBUG){
            initPackages();
            width = 20;
            height = 10;
            depth = 10;
        }else{
            selectVehicle(curVehicle);
        }
        reInitCubes();
    });
    /*
    otherFolder.add({limitHeight}, "limitHeight", 1, height).onChange(() => {
       limitHeight = btn.limitHeight;

       cubes.forEach(cube => {
           if(cube.material.opacity !== 0.3){
               cube.material.opacity = cube.position.y > limitHeight ? 0 : 1;
               cube.material.transparent = cube.position.y > limitHeight;
               cube.material.needsUpdate = true;
           }
       });

    }).listen().name("Render Height: ");
    */
    otherFolder.open()

}