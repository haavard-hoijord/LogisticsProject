import * as THREE from "three";
import {grid, materialData, settings} from "./main";

const overviewSettings = {
    opacity: 0.9,
}

export function getMaterials(){
    let matData = {...materialData}

    let topCanvas = document.createElement('canvas');
    let topContext = topCanvas.getContext('2d');

    let bottomCanvas = document.createElement('canvas');
    let bottomContext = bottomCanvas.getContext('2d');

    let widthCanvasFront = document.createElement('canvas');
    let widthContextFront = widthCanvasFront.getContext('2d');

    let widthCanvasBack = document.createElement('canvas');
    let widthContextBack = widthCanvasBack.getContext('2d');

    let depthCanvasLeft = document.createElement('canvas');
    let depthContextLeft = depthCanvasLeft.getContext('2d');

    let depthCanvasRight = document.createElement('canvas');
    let depthContextRight = depthCanvasRight.getContext('2d');

    topCanvas.width = settings.width * 32;
    topCanvas.height = settings.depth * 32;

    bottomCanvas.width = settings.width * 32;
    bottomCanvas.height = settings.depth * 32;

    widthCanvasFront.width = settings.width * 32;
    widthCanvasFront.height = settings.depth * 32;
    widthCanvasBack.width = settings.width * 32;
    widthCanvasBack.height = settings.depth * 32;

    depthCanvasLeft.width = settings.depth * 32;
    depthCanvasLeft.height = settings.height * 32;
    depthCanvasRight.width = settings.depth * 32;
    depthCanvasRight.height = settings.height * 32;

    matData.opacity = 1;

    let topValues = new Array(settings.width / 2);
    let bottomValues = new Array(settings.width / 2);
    let widthValuesFront = new Array(settings.width / 2);
    let widthValuesBack = new Array(settings.width / 2);
    let depthValuesLeft = new Array(settings.depth / 2);
    let depthValuesRight = new Array(settings.depth / 2);

    // Initialize your 2D arrays
    for(let i = 0; i < settings.width / 2; i++) {
        topValues[i] = new Array(settings.depth / 2).fill(0);
        bottomValues[i] = new Array(settings.depth / 2).fill(0);
        widthValuesFront[i] = new Array(settings.height).fill(0);
        widthValuesBack[i] = new Array(settings.height).fill(0);
    }

    for(let i = 0; i < settings.depth / 2; i++) {
        depthValuesLeft[i] = new Array(settings.height).fill(0);
        depthValuesRight[i] = new Array(settings.height).fill(0);
    }


    //Width
    for(let xSection = 0; xSection < settings.width / 2; xSection++){
        for(let ySection = 0; ySection < settings.height / 2; ySection++){
            let ids = [];
            let value = 0;

            for(let x = 0; x < 2; x++){
                let newX = xSection * 2 + x;
                for(let y = 0; y < 2; y++){
                    let newY = ySection * 2 + y;
                    for(let z = 0; z < settings.depth; z++){
                        if(grid[newX][newY][z] !== undefined && !ids.includes(grid[newX][newY][z].id)){
                            let obj = grid[newX][newY][z];
                            if(obj && obj.weight && obj.weight > 0){
                                value += obj.weight;
                                ids.push(obj.id);
                            }
                        }
                    }
                }
            }

            widthValuesFront[xSection][settings.height / 2 - ySection] = value;
            widthValuesBack[settings.width / 2 - xSection - 1][settings.height / 2 - ySection] = value;
        }
    }

    for(let zSection = 0; zSection < settings.depth / 2; zSection++){
        for(let ySection = 0; ySection < settings.height / 2; ySection++){
            let ids = [];
            let value = 0;

            for(let z = 0; z < 2; z++){
                let newZ = zSection * 2 + z;
                for(let y = 0; y < 2; y++){
                    let newY = ySection * 2 + y;
                    for(let x = 0; x < settings.width; x++){
                        if(grid[x][newY][newZ] !== undefined && !ids.includes(grid[x][newY][newZ].id)){
                            let obj = grid[x][newY][newZ];
                            if(obj && obj.weight && obj.weight > 0){
                                value += obj.weight;
                                ids.push(obj.id);
                            }
                        }
                    }
                }
            }

            depthValuesLeft[zSection][settings.height / 2 - ySection] = value;
            depthValuesRight[settings.depth / 2 - zSection - 1][settings.height / 2 - ySection] = value;
        }
    }

    //Top
    for(let xSection = 0; xSection < settings.width / 2; xSection++){
        for(let zSection = 0; zSection < settings.depth / 2; zSection++){
            let ids = [];
            let value = 0;
            for(let x = 0; x < 2; x++){
                let newX = xSection * 2 + x;
                for(let z = 0; z < 2; z++){
                    let newZ = zSection * 2 + z;

                    for(let y = 0; y < settings.height; y++){
                        if(grid[newX][y][newZ] !== undefined && !ids.includes(grid[newX][y][newZ].id)){
                            let obj = grid[newX][y][newZ];
                            if(obj && obj.weight && obj.weight > 0){
                                value += obj.weight;
                                ids.push(grid[newX][y][newZ].id);
                            }
                        }
                    }
                }
            }
            topValues[xSection][zSection] = value;
            bottomValues[xSection][settings.depth / 2 - zSection - 1] = value;
        }
    }

    function updateGrid(context, canvas, values) {
        context.clearRect(0, 0, canvas.width, canvas.height);

        let maxValue = -Infinity;
        let minValue = Infinity;

        for(let i = 0; i < values.length; i++) {
            for(let j = 0; j < values[i].length; j++) {
                if(values[i][j] > maxValue) {
                    maxValue = values[i][j];
                }
                if(values[i][j] < minValue) {
                    minValue = values[i][j];
                }
            }
        }

        for(let i = 0; i < canvas.width; i += 64) {
            for(let j = 0; j < canvas.height; j += 64) {
                // context.strokeRect(i, j, 64, 64);

                let x = i / 64;
                let y = j / 64;

                let value = values[x][y];

                let normalizedValue = 1 - (value / maxValue);

                // Map the normalized value to a hue between 0 (red) and 120 (green)
                let hue = normalizedValue * 120;

                context.fillStyle = `hsla(${hue}, 100%, 50%, ${overviewSettings.opacity})`;
                context.fillRect(i, j, 64, 64);
            }
        }
    }

    // Create grid texture
    updateGrid(depthContextLeft, depthCanvasLeft, depthValuesLeft);
    updateGrid(depthContextRight, depthCanvasRight, depthValuesRight);

    updateGrid(widthContextFront, widthCanvasFront, widthValuesFront);
    updateGrid(widthContextBack, widthCanvasBack, widthValuesBack);

    updateGrid(topContext, topCanvas, topValues);
    updateGrid(bottomContext, bottomCanvas, bottomValues);

    const widthTextureFront = new THREE.CanvasTexture(widthCanvasFront);
    const widthTextureBack = new THREE.CanvasTexture(widthCanvasBack);

    const depthTextureLeft = new THREE.CanvasTexture(depthCanvasLeft);
    const depthTextureRight = new THREE.CanvasTexture(depthCanvasRight);

    const topTexture = new THREE.CanvasTexture(topCanvas);
    const bottomTexture = new THREE.CanvasTexture(bottomCanvas);

    // Create materials
    const widthSideFront = new THREE.MeshStandardMaterial({...matData, map: widthTextureFront});
    const widthSideBack = new THREE.MeshStandardMaterial({...matData, map: widthTextureBack});

    const depthSideLeft = new THREE.MeshStandardMaterial({...matData, map: depthTextureLeft});
    const depthSideRight = new THREE.MeshStandardMaterial({...matData, map: depthTextureRight});

    const top = new THREE.MeshStandardMaterial({...matData, map: topTexture});
    const bottom = new THREE.MeshStandardMaterial({...matData, map: bottomTexture});

    return [
        depthSideRight,
        depthSideLeft,
        top,
        bottom,
        widthSideFront,
        widthSideBack,
    ];
}