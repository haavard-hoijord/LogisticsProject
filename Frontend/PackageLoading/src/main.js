import * as THREE from 'three';
import {Raycaster, Vector2} from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GUI} from "dat.gui";
import {CSS2DObject, CSS2DRenderer,} from 'three/addons/renderers/CSS2DRenderer.js';
import "./main.css"

const DAPR_URL = `http://localhost:5000/dapr`;
let DEBUG = true;

let width = 20;
let height = 10;
let depth = 10;

let maxSize = 5;

let limitHeight = height;

let uniformSizes = false;
let renderEmpty = false;
let mergeSame = true;

let packageCount = 100;

let cubes = [];
let packages = [];
let grid = create3DArray(width, height, depth);

let vehicles = [];

const {innerWidth, innerHeight} = window;

const gui = new GUI();

const renderer = new THREE.WebGLRenderer({alpha: true, antialias: true});
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(2);

document.body.appendChild(renderer.domElement);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const controls = new OrbitControls(camera, renderer.domElement);

controls.enableDamping = true;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0.4, 0.4, 0.4);

(async () => {
    const light = new THREE.HemisphereLight('white', "gray", 1);
    light.position.set(0, 100, 0);
    scene.add(light);


    fetch(`${DAPR_URL}/v1.0/invoke/Data/method/track/all`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    })
        .then(response => response.json())
        .then(data => {
            vehicles = data

            if (!DEBUG && vehicles && vehicles.length > 0) {
                selectVehicle(vehicles.filter(vehicles => vehicles.route)[0]);
                reInitCubes();

                const vehicleFolder = gui.addFolder("Vehicles");

                for (let vehicle of vehicles.sort((e => -e.id))) {
                    vehicleFolder.add({
                        [vehicle.id]: () => {
                            selectVehicle(vehicle);
                        }
                    }, vehicle.id).name("Vehicle " + vehicle.id);
                }
                vehicleFolder.open();
            }
        });

    if (DEBUG) {
        initPackages();
    }

    initCubes();
    initGUI();

    controls.target.set(width / 2, height / 2, depth / 2);

    camera.position.set(30, 10, 30);
    camera.lookAt(10, 0, 0);

    controls.update();

    // Setup labels
    const labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize(innerWidth, innerHeight);
    labelRenderer.domElement.style.position = 'absolute';
    labelRenderer.domElement.style.top = '0px';
    labelRenderer.domElement.style.pointerEvents = 'none';
    document.body.appendChild(labelRenderer.domElement);

    const labelDiv = document.createElement('div');
    labelDiv.className = 'label';
    labelDiv.style.marginTop = '-1em';
    const label = new CSS2DObject(labelDiv);
    label.visible = false;
    scene.add(label);

    // Track mouse movement to pick objects
    const raycaster = new Raycaster();
    const mouse = new Vector2();

    window.addEventListener('mousemove', ({clientX, clientY}) => {
        const {innerWidth, innerHeight} = window;

        mouse.x = (clientX / innerWidth) * 2 - 1;
        mouse.y = -(clientY / innerHeight) * 2 + 1;
    });

    // Handle window resize
    window.addEventListener('resize', () => {
        const {innerWidth, innerHeight} = window;

        renderer.setSize(innerWidth, innerHeight);
        camera.aspect = innerWidth / innerHeight;
        camera.updateProjectionMatrix();
    });

    renderer.setAnimationLoop(() => {
        controls.update();

        // Pick objects from view using normalized mouse coordinates
        raycaster.setFromCamera(mouse, camera);

        let cubes = scene.children.filter(s => s.package);
        const [hovered] = raycaster.intersectObjects(cubes);

        for (let cube of cubes) {
            cube.material.emissive.setHex(0x000000)
        }

        if (hovered) {
            let obj = hovered.object;
            let pak = obj.package;

            // Setup label
            renderer.domElement.className = 'hovered';
            label.visible = true;
            labelDiv.innerHTML = `Cube ${pak.id} <br>Size: ${pak.size.x}x${pak.size.y}x${pak.size.z}<br>Weight: ${pak.weight}kg<br>Rotation: ${pak.rotation}`

            // Get offset from object's dimensions
            const offset = new THREE.Vector3();
            new THREE.Box3().setFromObject(obj).getSize(offset);

            // Move label over hovered element
            label.position.set(pak.origin.x + (pak.size.x / 2), pak.origin.y + (pak.size.y / 2) - 2, pak.origin.z + (pak.size.z / 2));

            for (let cube of cubes) {
                if (cube.package && cube.package.id === pak.id) {
                    cube.material.emissive.setHex(0xffffff)
                }
            }
        } else {
            // Reset label
            renderer.domElement.className = '';
            label.visible = false;
            labelDiv.textContent = '';

        }

        // Render scene
        renderer.render(scene, camera);

        // Render labels
        labelRenderer.render(scene, camera);
    });
})();

function reInitCubes() {
    for (const cube of cubes) {
        scene.remove(cube);
    }

    cubes = [];
    initCubes();
}

function initCubes() {
    if (controls) {
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
        let randomSize = () => Math.max(1, Math.round(Math.random() * maxSize));
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

    objects.sort((a, b) => b.weight - a.weight);
    objects.sort((a, b) => (b.width * b.height * b.depth) - (a.width * a.height * a.depth));

    function objectFits(x, y, z, object) {
        if (x + object.width > width || y + object.height > height || z + object.depth > depth) {
            return false;
        }

        if (!isOnFloor(x, y, z, object)) {
            return false;
        }

        for (let dx = 0; dx < object.width; dx++) {
            for (let dy = 0; dy < object.height; dy++) {
                for (let dz = 0; dz < object.depth; dz++) {
                    if (array[x + dx][y + dy][z + dz] !== 0) {
                        return false;
                    }
                }
            }
        }

        return true;
    }

    function isOnFloor(x, y, z, object) {
        if (y === 0) {
            return true;
        }

        for (let dx = 0; dx < object.width; dx++) {
            for (let dz = 0; dz < object.depth; dz++) {
                if (!hasFloor(x + dx, y, z + dz)) {
                    return false;
                }
            }
        }
        return true;
    }

    function placeObject(x, y, z, object) {
        object.origin = {x, y, z};
        object.size = {x: object.width, y: object.height, z: object.depth};
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


            function attemptPlace(x, y, z, object) {
                const orientations = generateOrientations(object);
                for (const orientation of orientations) {
                    if (objectFits(x, y, z, orientation)) {
                        placeObject(x, y, z, orientation);
                        objectPlaced = true;
                        remainingObjects.splice(i, 1);
                    }
                }
            }

            const loop = (max, func) => {
                for (let i = 0; i < max && !objectPlaced; i++) {
                    func(i);
                }
            }

            if (obSize < Math.pow(2, 3) && object.width === object.height && object.height === object.depth) {
                loop(height, (y) => loop(width, (x) => loop(depth, (z) => attemptPlace(x, y, z, object))));
            } else {
                loop(width, (x) => loop(height, (y) => loop(depth, (z) => attemptPlace(x, y, z, object))));
            }
        }

        if (!objectPlaced) {
            break;
        }
    }

    const unplacedObjects = remainingObjects.map(object => object.id + "-[" + object.width + "x" + object.height + "x" + object.depth + "]");
    if (unplacedObjects.length > 0) {
        console.log(`Objects with IDs [${unplacedObjects.join(', ')}] could not be placed.`);
    }
}

function generateOrientations(object) {
    const orientations = [];

    //TODO Make some packages only allow certain orientations (fragile goods etc)

    orientations.push({...object, rotation: 'front'}); // Front (original orientation)

    if (object.width !== object.height) {
        orientations.push({
            ...object,
            rotation: 'back',
            width: object.height,
            height: object.width,
            depth: object.depth
        }); // Back (180 degrees in XY plane)
    }

    if (object.width !== object.depth && object.height !== object.depth) {
        orientations.push({...object, rotation: 'up', width: object.width, height: object.depth, depth: object.height}); // Up (90 degrees in XZ plane)
        orientations.push({
            ...object,
            rotation: 'left',
            width: object.height,
            height: object.depth,
            depth: object.width
        }); // Left (90 degrees in XY plane)
        orientations.push({
            ...object,
            rotation: 'down',
            width: object.depth,
            height: object.width,
            depth: object.height
        }); // Down (90 degrees in YZ plane)
        orientations.push({
            ...object,
            rotation: 'right',
            width: object.depth,
            height: object.height,
            depth: object.width
        }); // Right (270 degrees in XY plane)
    }

    // Sort orientations by height in ascending order
    orientations.sort((a, b) => a.height - b.height);

    //Remove any orientations that are not the same size as the original object
    orientations.filter((s) => (s.width * s.height * s.depth) !== (object.width * object.height * object.depth));

    return orientations;

}

function hasFloor(x, y, z) {
    return y === 0 || grid[x][y - 1][z];
}

function addGridCubes() {
    for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
            for (let z = 0; z < depth; z++) {
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

    if (!mergeSame) {
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

function selectVehicle(vehicle) {
    packages = [];

    curVehicle = vehicle;

    if (vehicle.route) {
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

function initGUI() {
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
    let sizeData = {width, height, depth, maxSize};
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

    sizeFolder.add(sizeData, "maxSize", 1, 10).onChange(() => {
        maxSize = sizeData.maxSize;
        initPackages();
        reInitCubes();
    }).name("Max Size: ");

    sizeFolder.open();

    const otherFolder = gui.addFolder("Other");
    const btn = {
        ref: function () {
            if (DEBUG) initPackages();
            reInitCubes();
        },
        dbg: DEBUG
    };
    otherFolder.add(btn, "ref").name("Refresh");
    otherFolder.add(btn, "dbg").name("Debug").onChange(() => {
        DEBUG = btn.dbg;
        grid = [];

        if (DEBUG) {
            initPackages();
            width = 20;
            height = 10;
            depth = 10;
        } else {
            selectVehicle(curVehicle);
        }
        reInitCubes();
    });
    otherFolder.open()

}