import {grid, settings} from "../main";
import {stableSort} from "../Util";

export class Algorithm {
    constructor(width, height, depth, objects) {
        this.width = width;
        this.height = height;
        this.depth = depth;
        this.objects = objects;
        this.remainingObjects = [...objects];
        this.objectPlaced = false;

        this.totalWeights = new Array(grid.length).fill(0).map(() => new Array(grid[0].length).fill(0).map(() => new Array(grid[0][0].length).fill(0)));

        this.objects = stableSort(this.objects, (a, b) => b.deliveryOrder - a.deliveryOrder);
        this.objects = stableSort(this.objects, (a, b) => b.weight - a.weight);
        this.objects = stableSort(this.objects, (a, b) => (b.width * b.height * b.depth) - (a.width * a.height * a.depth));
        this.objects = stableSort(this.objects, (a, b) => a.canStackOntop() === b.canStackOntop() ? 0 : a.canStackOntop() ? 1 : -1);
    }

    run() {
        while (this.remainingObjects.length > 0) {
            for (let i = 0; i < this.remainingObjects.length; i++) {
                this.objectPlaced = false;
                const object = this.remainingObjects[i];
                const obSize = object.width * object.height * object.depth;

                const loop = (max, func) => {
                    for (let i = 0; i < max && !this.objectPlaced; i++) {
                        func(i);
                    }
                }

                if (obSize < Math.pow(2, 3) && object.uniform) {
                    loop(this.height, (y) => loop(this.width, (x) => loop(this.depth, (z) => this.attemptPlace(x, y, z, object))));
                } else {
                    loop(this.width, (x) => loop(this.height, (y) => loop(this.depth, (z) => this.attemptPlace(x, y, z, object))));
                }

                if (this.objectPlaced) {
                    this.remainingObjects.splice(i, 1);
                }
            }

            if (!this.objectPlaced) { //No object was placed in this iteration, must be full
                break;
            }
        }

        return this.remainingObjects;
    }

    objectFits(x, y, z, object) {
        if (x + object.width > this.width || y + object.height > this.height || z + object.depth > this.depth) {
            return false;
        }

        if (!this.isOnFloor(x, y, z, object)) {
            return false;
        }

        for (let dx = 0; dx < object.width; dx++) {
            for (let dy = 0; dy < object.height; dy++) {
                for (let dz = 0; dz < object.depth; dz++) {
                    if (grid[x + dx][y + dy][z + dz] !== 0) {
                        return false;
                    }
                }
            }
        }

        return true;
    }

    isOnFloor(x, y, z, object) {
        if (y === 0) {
            return true;
        }

        for (let dx = 0; dx < object.width; dx++) {
            for (let dz = 0; dz < object.depth; dz++) {
                if (!this.hasFloor(x + dx, y, z + dz)) {
                    return false;
                }

                if (settings.checkBelowWeight) {
                    let weight = object.weight;
                    let directlyBelowWeight = this.getDirectlyBelowWeight(x, y, z);
                    let belowWeight = this.getBelowWeight(x, y, z);

                    if (weight >= belowWeight || weight >= directlyBelowWeight) {
                        return false;
                    }
                }
            }
        }
        return true;
    }

    attemptPlace(x, y, z, object) {
        const orientations = object.generateOrientations(object);
        for (const orientation of orientations) {
            if (this.objectFits(x, y, z, orientation)) {
                this.placeObject(x, y, z, orientation);
                this.objectPlaced = true;
                break;
            }
        }
    }

    placeObject(x, y, z, object) {
        object.setPosition(x, y, z);
        object.onUpdate();

        for (let dx = 0; dx < object.width; dx++) {
            for (let dy = 0; dy < object.height; dy++) {
                for (let dz = 0; dz < object.depth; dz++) {
                    if (x + dx < this.width && y + dy < this.height && z + dz < this.depth) {
                        grid[x + dx][y + dy][z + dz] = object;

                        for(let xOffset = -1; xOffset <= 1; xOffset++){
                            if(x + dx + xOffset < this.width && x + dx + xOffset >= 0) {
                                let obj = grid[x + dx + xOffset][y + dy][z + dz];

                                if(obj !== 0 && obj.id !== object.id){
                                    obj.onUpdate();
                                }
                            }
                        }

                        for(let yOffset = -1; yOffset <= 1; yOffset++){
                            if(y + dy + yOffset < this.height && y + dy + yOffset >= 0) {
                                let obj = grid[x + dx][y + dy + yOffset][z + dz];

                                if(obj !== 0 && obj.id !== object.id){
                                    obj.onUpdate();
                                }
                            }
                        }

                        for(let zOffset = -1; zOffset <= 1; zOffset++){
                            if(z + dz + zOffset < this.depth && z + dz + zOffset >= 0) {
                                let obj = grid[x + dx][y + dy][z + dz + zOffset];

                                if(obj !== 0 && obj.id !== object.id){
                                    obj.onUpdate();
                                }
                            }
                        }

                        // Update the total weights
                        for(let i = x + dx; i < this.width; i++) {
                            for(let j = y + dy; j < this.height; j++) {
                                for(let k = z + dz; k < this.depth; k++) {
                                    this.totalWeights[i][j][k] += object.weight / (object.width * object.height * object.depth);
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    hasFloor(x, y, z) {
        if (y === 0) {
            return true;
        }

        if (grid[x][y - 1][z] === 0) {
            return false;
        }

        let obj = grid[x][y - 1][z];
        return obj && obj.canStackOntop();
    }

    getDirectlyBelowWeight(x, y, z) {
        if (y === 0) {
            return 0;
        }

        const object = grid[x][y - 1][z];
        return object.weight || 0;
    }


    getBelowWeight(x, y, z) {
        let weight = 0;
        let ids = [];
        // Iterate through all the y-values below the given y-coordinate
        for (let currentY = y - 1; currentY >= 0; currentY--) {
            const object = grid[x][currentY][z];

            if (!ids.includes(object.id)) {
                if (object !== 0) {
                    weight += object.weight;
                    ids.push(object.id);
                }
            }
        }

        return weight;
    }

}