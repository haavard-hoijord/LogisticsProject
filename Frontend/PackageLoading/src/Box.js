import * as THREE from "three";
import {grid, settings} from "./main";

export class Box {
    constructor(gridObject) {
        this.id = gridObject.routeId || gridObject.id || (Math.random() * 10000);
        this.deliveryOrder = gridObject.deliveryOrder || this.id || 0;

        this.width = gridObject.width || 1;
        this.height = gridObject.height || 1;
        this.depth = gridObject.depth || 1;
        this.uniform = this.width === this.height && this.height === this.depth;

        this.weight = gridObject.weight || 1;

        this.rotation = gridObject.rotation || "front";
        this.color = gridObject.color || new THREE.Color(Math.random(), Math.random(), Math.random());

        this.gridObject = {...gridObject, color: this.color};

        this.heightRatio = this.height / Math.min(this.width, this.depth)
        this.origin = {x: 0, y: 0, z: 0};
        this.center = {x: this.width / 2, y: this.height / 2, z: this.depth / 2};

        this.aboveWeight = 0;
        this.belowWeight = 0;
        this.freeSpace = 0;
        this.totalSpace = 0;

        this.fragile = false;
    }

    isTippingRisk() {
        return this.heightRatio >= 1.5;
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

    calculateFreeSpace(){
        // Calculate the amount of free space remaining around the cube (lower is better)
        let freeSpace = 0;
        let totalSpace = 0;

        for (let dx = 0; dx < this.width; dx++) {
            for (let dy = 0; dy < this.height; dy++) {
                for (let dz = 0; dz < this.depth; dz++) {
                    for (let offsetX = -1; offsetX <= 1; offsetX++) {
                        for (let offsetY = -1; offsetY <= 1; offsetY++) {
                            for (let offsetZ = -1; offsetZ <= 1; offsetZ++) {
                                if (this.origin.x + offsetX + dx < 0 || this.origin.x + offsetX + dx >= settings.width || this.origin.y + offsetY + dy < 0 || this.origin.y + offsetY + dy >= settings.height || this.origin.z + offsetZ + dz < 0 || this.origin.z + offsetZ + dz >= settings.depth) {
                                    continue;
                                }

                                if (grid[this.origin.x + dx + offsetX][this.origin.y + dy + offsetY][this.origin.z + dz + offsetZ] === 0) {
                                    freeSpace++;
                                }
                                totalSpace++;
                            }
                        }
                    }
                }
            }
        }

        return [freeSpace, totalSpace];
    }

    onUpdate(){
        this.aboveWeight = this.calculateAboveWeight();
        this.belowWeight = this.calculateBelowWeight();

        [this.freeSpace, this.totalSpace] = this.calculateFreeSpace();
    }

    calculateAboveWeight() {
        let weight = 0;
        for(let dx = 0; dx < this.width; dx++){
            for(let dz = 0; dz < this.depth; dz++){
                // Iterate through all the y-values above the given y-coordinate
                for (let currentY = this.origin.y; currentY < settings.height; currentY++) {
                    const object = grid[this.origin.x][currentY][this.origin.z];

                    if (object.id !== this.id) {
                        if (object !== 0) {
                            weight += object.weight / (object.width * object.depth * object.height);
                        }
                    }
                }
            }
        }


        return weight;
    }

    calculateBelowWeight() {
        let weight = 0;
        for(let dx = 0; dx < this.width; dx++){
            for(let dz = 0; dz < this.depth; dz++){
                // Iterate through all the y-values below the given y-coordinate
                for (let currentY = this.origin.y; currentY >= 0; currentY--) {
                    const object = grid[this.origin.x][currentY][this.origin.z];

                    if (object.id !== this.id) {
                        if (object !== 0) {
                            weight += object.weight / (object.width * object.depth * object.height);
                        }
                    }
                }
            }
        }
        return weight;
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
    let width = settings.uniformSizes ? size : randomSize();
    let height = settings.uniformSizes ? size : randomSize();
    let depth = settings.uniformSizes ? size : randomSize();
    let volume = width * height * depth;
    return new Box({
        width: width,
        height: height,
        depth: depth,
        weight: Math.min(Math.max(Math.max(1, volume / 2), Math.round(Math.random() * (volume * 5) * 10) / 10), 200),
        id: id
    })
}

export function boxFromPackage(pk){
    return new Box({...pk});
}