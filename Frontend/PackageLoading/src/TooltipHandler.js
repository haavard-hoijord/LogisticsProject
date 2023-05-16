import * as THREE from 'three';
import {Raycaster, Vector2} from 'three';
import {CSS2DObject, CSS2DRenderer,} from 'three/addons/renderers/CSS2DRenderer.js';
import {camera, renderer, scene} from "./SceneHandler";

// Track mouse movement to pick objects
const raycaster = new Raycaster();
const mouse = new Vector2(Infinity, Infinity);

let label, labelDiv, labelRenderer;

export function setupTooltip() {
    // Setup labels
    labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize(innerWidth, innerHeight);
    labelRenderer.domElement.style.position = 'absolute';
    labelRenderer.domElement.style.top = '0px';
    labelRenderer.domElement.style.pointerEvents = 'none';
    document.body.appendChild(labelRenderer.domElement);

    labelDiv = document.createElement('div');
    labelDiv.className = 'label';
    labelDiv.style.marginTop = '-1em';
    label = new CSS2DObject(labelDiv);
    label.visible = false;
    scene.add(label);

    window.addEventListener('mousemove', ({clientX, clientY}) => {
        const {innerWidth, innerHeight} = window;

        mouse.x = (clientX / innerWidth) * 2 - 1;
        mouse.y = -(clientY / innerHeight) * 2 + 1;
    });
}

export function renderTooltip() {
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
        labelDiv.innerHTML = `Cube ${pak.id}
                            <br>Size: ${pak.width}x${pak.height}x${pak.depth}
                            <br>Weight: ${pak.weight}kg
                            <br>Rotation: ${pak.rotation}`

        // Get offset from object's dimensions
        const offset = new THREE.Vector3();
        new THREE.Box3().setFromObject(obj).getSize(offset);

        // Move label over hovered element
        label.position.set(pak.origin.x + (pak.width / 2), pak.origin.y + (pak.height / 2) - 2, pak.origin.z + (pak.depth / 2));

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

    // Render labels
    labelRenderer.render(scene, camera);
}