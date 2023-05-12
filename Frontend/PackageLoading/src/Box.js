import * as THREE from "three";
import {settings} from "./main";

export class Box {
    constructor(gridObject) {
        this.width = gridObject.width;
        this.height = gridObject.height;
        this.depth = gridObject.depth;
        this.weight = gridObject.weight;
        this.id = gridObject.id;
        this.uniform = this.width === this.height && this.height === this.depth;
        this.rotation = gridObject.rotation || "front";
        this.color = gridObject.color;

        this.gridObject = gridObject;

        this.size = {x: this.width, y: this.height, z: this.depth};

        this.heightRation = this.height / Math.min(this.width, this.depth)
        this.origin = {x: 0, y: 0, z: 0};
        this.center = {x: this.width / 2, y: this.height / 2, z: this.depth / 2};

        this.fragile = false;
    }

    isTippingRisk() {
        return this.heightRation >= 1.5;
    }

    canStackOntop() {
        return !this.fragile;
    }

    validRotations() {
        if (this.uniform || this.fragile) {
            return ["front"];
        }

        return ["front", "back", "up", "down", "left", "right"];
    }

    setPosition(x, y, z) {
        this.origin = {x, y, z};
        this.center = {x: x + this.width / 2, y: y + this.height / 2, z: z + this.depth / 2};
    }

    generateOrientations() {
        let orientations = [];

        orientations.push(new Box({...this.gridObject})); // Front (original orientation)

        if (this.width !== this.height) {
            orientations.push(new Box({
                ...this.gridObject,
                rotation: 'back',
                width: this.height,
                height: this.width,
                depth: this.depth
            })); // Back (180 degrees in XY plane)
        }

        if (this.width !== this.depth && this.height !== this.depth) {
            orientations.push(new Box({
                ...this.gridObject,
                rotation: 'up',
                width: this.width,
                height: this.depth,
                depth: this.height
            })); // Up (90 degrees in XZ plane)
            orientations.push(new Box({
                ...this.gridObject,
                rotation: 'left',
                width: this.height,
                height: this.depth,
                depth: this.width
            })); // Left (90 degrees in XY plane)
            orientations.push(new Box({
                ...this.gridObject,
                rotation: 'down',
                width: this.depth,
                height: this.width,
                depth: this.height
            })); // Down (90 degrees in YZ plane)
            orientations.push(new Box({
                ...this.gridObject,
                rotation: 'right',
                width: this.depth,
                height: this.height,
                depth: this.width
            })); // Right (270 degrees in XY plane)
        }

        // Sort orientations by height in ascending order
        orientations.sort((a, b) => a.height - b.height);

        //Remove any orientations that are not the same size as the original this
        orientations.filter((s) => (s.width * s.height * s.depth) !== (this.width * this.height * this.depth));
        orientations.filter((s) => !this.validRotations().includes(s.rotation));
        orientations.filter((s) => s);
        return orientations;
    }
}

export function randomBox(id) {
    let randomSize = () => Math.max(1, Math.round(Math.random() * settings.maxSize));
    let size = randomSize();

    return new Box({
        width: settings.uniformSizes ? size : randomSize(),
        height: settings.uniformSizes ? size : randomSize(),
        depth: settings.uniformSizes ? size : randomSize(),
        weight: Math.max(1, Math.round(Math.random() * 20)),
        id: id,
        color: new THREE.Color(Math.random(), Math.random(), Math.random())
    })
}