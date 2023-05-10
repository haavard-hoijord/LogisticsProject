import {Algorithm} from "./Algorithm";
import {grid} from "../main";

export class BestFitAlgorithm extends Algorithm {
    constructor(width, height, depth, objects) {
        super(width, height, depth, objects);
    }


    run() {
        let i = 0;
        let added = [];
        for(let runNum = 0; runNum < 2; runNum++) {
            for (const object of this.remainingObjects) {
                this.objectPlaced = false;
                let minScore = Infinity;
                let bestFit = null;

                const loop = (max, func) => {
                    for (let i = 0; i < max; i++) {
                        func(i);
                    }
                }

                const calculateScore = (x, y, z, object) => {
                    // Calculate distance from the origin (lower is better)
                    const distance = Math.sqrt(x * x + y * y + z * z);

                    // Calculate the amount of free space remaining around the cube (lower is better)
                    let freeSpace = 0;
                    let totalSpace = 0;

                    for(let dx = 0; dx < object.width; dx++){
                        for(let dy = 0; dy < object.height; dy++){
                            for(let dz = 0; dz < object.depth; dz++){
                                for(let offsetX = -1; offsetX <= 1; offsetX++){
                                    for(let offsetY = -1; offsetY <= 1; offsetY++){
                                        for(let offsetZ = -1; offsetZ <= 1; offsetZ++){
                                            if(x + offsetX + dx < 0 || x + offsetX + dx >= this.width || y + offsetY + dy < 0 || y + offsetY + dy >= this.height || z + offsetZ + dz < 0 || z + offsetZ + dz >= this.depth){
                                                continue;
                                            }

                                            if(grid[x + dx + offsetX][y + dy + offsetY][z + dz + offsetZ] === 0){
                                                freeSpace++;
                                            }
                                            totalSpace++;
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // Prioritize positions with lower height (lower is better)
                    const heightPenalty = y;

                    // Prioritize positions with less free space
                    const freeSpacePenalty = (totalSpace - freeSpace) / totalSpace;

                    // You can adjust the weight of each factor to influence the final score
                    const distanceWeight = 1;
                    const freeSpaceWeight = 5;
                    const heightPenaltyWeight = 5;

                    return distanceWeight * distance + freeSpaceWeight * freeSpacePenalty + heightPenaltyWeight * heightPenalty;
                }

                const attemptWastePlace = (x, y, z, object) => {
                    for (const orientation of object.generateOrientations()) {
                        if (this.objectFits(x, y, z, orientation)) {
                            const score = calculateScore(x, y, z, orientation);

                            if (score < minScore) {
                                minScore = score;
                                bestFit = {x, y, z, orientation};
                            }
                        }
                    }
                }

                loop(this.width, (x) => loop(this.height, (y) => loop(this.depth, (z) => attemptWastePlace(x, y, z, object))));

                if (bestFit) {
                    this.placeObject(bestFit.x, bestFit.y, bestFit.z, bestFit.orientation);
                    this.remainingObjects.splice(i, 1);
                    added.push(object.id);
                }

                i++;
            }
        }

        this.remainingObjects = this.remainingObjects.filter((object) => !added.includes(object.id));
        return this.remainingObjects;
    }
}