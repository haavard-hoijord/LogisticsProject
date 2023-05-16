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
        // Calculate the total weights of the four quadrants
        let frontLeftWeight = (x < Math.floor(grid.length / 2) && y < Math.floor(grid[0].length / 2)) ? this.totalWeights[x][y][z] + box.weight : this.totalWeights[Math.floor(grid.length / 2) - 1][Math.floor(grid[0].length / 2) - 1][z];
        let frontRightWeight = (x >= Math.floor(grid.length / 2) && y < Math.floor(grid[0].length / 2)) ? this.totalWeights[x][y][z] + box.weight : this.totalWeights[grid.length - 1][Math.floor(grid[0].length / 2) - 1][z];
        let backLeftWeight = (x < Math.floor(grid.length / 2) && y >= Math.floor(grid[0].length / 2)) ? this.totalWeights[x][y][z] + box.weight : this.totalWeights[Math.floor(grid.length / 2) - 1][grid[0].length - 1][z];
        let backRightWeight = (x >= Math.floor(grid.length / 2) && y >= Math.floor(grid[0].length / 2)) ? this.totalWeights[x][y][z] + box.weight : this.totalWeights[grid.length - 1][grid[0].length - 1][z];

        // Calculate the balance score as the negative sum of the absolute differences in weights between the quadrants
        return -Math.abs(frontLeftWeight - frontRightWeight) - Math.abs(backLeftWeight - backRightWeight) - Math.abs(frontLeftWeight - backLeftWeight) - Math.abs(frontRightWeight - backRightWeight);
    }

}