export class Box{
    constructor(gridObject) {
        this.width = gridObject.width;
        this.height = gridObject.height;
        this.depth = gridObject.depth;
        this.weight = gridObject.weight;
        this.id = gridObject.id;
        this.uniform = this.width === this.height && this.height === this.depth;
        this.rotation = "front";
        this.color = gridObject.color;

        this.fragile = false;
    }

    generateOrientations() {
        let orientations = [];

        //TODO Make some packages only allow certain orientations (fragile goods etc)

        orientations.push({...this}); // Front (original orientation)

        if (this.width !== this.height) {
            orientations.push({...this, rotation: 'back', width: this.height, height: this.width, depth: this.depth}); // Back (180 degrees in XY plane)
        }

        if (this.width !== this.depth && this.height !== this.depth) {
            orientations.push({...this, rotation: 'up', width: this.width, height: this.depth, depth: this.height}); // Up (90 degrees in XZ plane)
            orientations.push({...this, rotation: 'left', width: this.height, height: this.depth, depth: this.width}); // Left (90 degrees in XY plane)
            orientations.push({...this, rotation: 'down', width: this.depth, height: this.width, depth: this.height}); // Down (90 degrees in YZ plane)
            orientations.push({...this, rotation: 'right', width: this.depth, height: this.height, depth: this.width}); // Right (270 degrees in XY plane)
        }

        // Sort orientations by height in ascending order
        orientations.sort((a, b) => a.height - b.height);

        //Remove any orientations that are not the same size as the original this
        orientations.filter((s) => (s.width * s.height * s.depth) !== (this.width * this.height * this.depth));

        orientations.find((s) => !this.validRotations().includes(s.rotation));

        orientations = orientations.map((s) => {
            return {...s,
                canStackOntop: this.canStackOntop()
            }
        })

        return orientations;
    }

    validRotations(){
        if(this.uniform || this.fragile){
            return ["front"];
        }

        return ["front", "back", "up", "down", "left", "right"];
    }

    canStackOntop(){
        return !this.fragile;
    }
}