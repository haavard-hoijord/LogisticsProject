import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';

const renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Enable softer shadows

document.body.appendChild( renderer.domElement );

const scene = new THREE.Scene();
scene.background = new THREE.Color( 0.4, 0.4, 0.4 );


const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
const controls = new OrbitControls( camera, renderer.domElement );

let packages = [];

for(let i = 0; i < 100; i++){
    packages.push({
        size: 1 + Math.round(Math.random() * 3),
    })
}


let width = 20;
let height = 10;
let depth = 10;

let cubes = [];
let num = 0;

function addCubes(count) {
    for (let i = 0; i < count; i++) {
        addCube(i);
    }
}

let section1 = new THREE.Color(1, 0, 0);
let section2 = new THREE.Color(0, 1, 0);
let section3 = new THREE.Color(0, 0, 1);
let sectionColors = [section1, section2, section3]

function addCube(i){
    const {x, y, z} = getPositionFromIndex(i, width, height, depth, 0.25);

    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({wireframe: false, color: sectionColors[getSectionFromIndex(i, width, height, depth, 0.25)]});
    const cube = new THREE.Mesh(geometry, material);
    cube.position.set(x, y, z);
    scene.add(cube);
    cubes.push(cube);
}

function getPositionFromIndex(index, maxWidth, maxHeight, maxDepth, spacing) {
    const thirdWidth = Math.ceil(maxWidth / 3);
    const fullThirdWidthSize = thirdWidth * maxHeight * maxDepth;

    const currentThirdWidth = Math.floor(index / fullThirdWidthSize);
    const remainingIndex = index % fullThirdWidthSize;

    const x = (Math.floor(remainingIndex / maxDepth) % thirdWidth + currentThirdWidth * thirdWidth) * (1 + spacing);
    const y = (Math.floor(remainingIndex / (maxDepth * thirdWidth)) % maxHeight) * (1 + spacing);
    const z = (remainingIndex % maxDepth) * (1 + spacing);

    return { x, y, z };
}

function getSectionFromIndex(index, maxWidth, maxHeight, maxDepth, spacing) {
    return Math.floor(index / ((maxWidth / 3) * maxHeight * maxDepth));
}

const planeMaterial = new THREE.MeshStandardMaterial({ color: 0x999999, side: THREE.DoubleSide, opacity: 0.5, transparent: true });
const geometry = new THREE.BoxGeometry(width * 1.4,height * 1.3,depth * 1.3);
const cube = new THREE.Mesh( geometry, planeMaterial );
cube.position.set(width/2+3, height/2+0.5, depth/2+0.5);
scene.add( cube );

const light = new THREE.HemisphereLight('white', 10);
light.position.set(0, height * 2, 0);
scene.add( light );

controls.target.set(width/2, height/2, depth/2);

camera.position.set(30, 10, 30);
camera.lookAt(10, 0, 0);

controls.update();

addCubes(width * height * depth);
function animate() {
    requestAnimationFrame( animate );
    controls.update();


    if(num >= (width * height * depth)){
        num = 0;
        for (const cube of cubes) {
            scene.remove(cube);
        }
    }

    //addCube(num);
    //num++;

    renderer.render( scene, camera );
}

animate();