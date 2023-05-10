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
                    for (let dx = -1; dx <= 1; dx++) {
                        for (let dy = -1; dy <= 1; dy++) {
                            for (let dz = -1; dz <= 1; dz++) {
                                const nx = x + object.width * dx;
                                const ny = y + object.height * dy;
                                const nz = z + object.depth * dz;

                                if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height && nz >= 0 && nz < this.depth && grid[nx][ny][nz] === 0) {
                                    freeSpace++;
                                }
                            }
                        }
                    }

                    // Prioritize positions with lower height (lower is better)
                    const heightPenalty = y;

                    // You can adjust the weight of each factor to influence the final score
                    const distanceWeight = 1;
                    const freeSpaceWeight = 1;
                    const heightPenaltyWeight = 2;

                    return distanceWeight * distance + freeSpaceWeight * freeSpace + heightPenaltyWeight * heightPenalty;
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