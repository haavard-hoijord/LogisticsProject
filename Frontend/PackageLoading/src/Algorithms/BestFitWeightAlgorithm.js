import {BestFitAlgorithm} from "./BestFitAlgorithm";
import {grid} from "../main";

export class BestFitWeightAlgorithm extends BestFitAlgorithm {
    constructor(width, height, depth, objects) {
        super(width, height, depth, objects);
    }


    calculateScore(x, y, z, object) {
        let score = super.calculateScore(x, y, z, object);

        const balanceWeight = 10;
        let balanceScore = this.calculateBalance(object, x, y, z);

        score -= balanceScore * balanceWeight;

        return score;
    }

    calculateBalance(box, x, y, z) {
        // Calculate the total weights of the left and right halves of the grid
        let leftWeight = x < Math.floor(grid.length / 2) ? this.totalWeights[x][y][z] + box.weight : this.totalWeights[Math.floor(grid.length / 2) - 1][y][z];
        let rightWeight = x >= Math.floor(grid.length / 2) ? this.totalWeights[x][y][z] + box.weight : this.totalWeights[grid.length - 1][y][z];

        // Return the negative absolute difference in weights (higher for more balanced distributions)
        return -Math.abs(leftWeight - rightWeight);
    }
}