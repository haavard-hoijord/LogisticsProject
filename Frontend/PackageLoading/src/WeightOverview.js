import * as THREE from "three";
import {grid, materialData, settings} from "./main";

const overviewSettings = {
    opacity: 0.9,
    gridSize: 1
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
    
    let gridTextureSize = 64 / overviewSettings.gridSize;
    
    topCanvas.width = settings.width * gridTextureSize;
    topCanvas.height = settings.depth * gridTextureSize;

    bottomCanvas.width = settings.width * gridTextureSize;
    bottomCanvas.height = settings.depth * gridTextureSize;

    widthCanvasFront.width = settings.width * gridTextureSize;
    widthCanvasFront.height = settings.depth * gridTextureSize;
    widthCanvasBack.width = settings.width * gridTextureSize;
    widthCanvasBack.height = settings.depth * gridTextureSize;

    depthCanvasLeft.width = settings.depth * gridTextureSize;
    depthCanvasLeft.height = settings.height * gridTextureSize;
    depthCanvasRight.width = settings.depth * gridTextureSize;
    depthCanvasRight.height = settings.height * gridTextureSize;

    matData.opacity = 1;

    let topValues = new Array(settings.width / overviewSettings.gridSize);
    let bottomValues = new Array(settings.width / overviewSettings.gridSize);
    let widthValuesFront = new Array(settings.width / overviewSettings.gridSize);
    let widthValuesBack = new Array(settings.width / overviewSettings.gridSize);
    let depthValuesLeft = new Array(settings.depth / overviewSettings.gridSize);
    let depthValuesRight = new Array(settings.depth / overviewSettings.gridSize);

    // Initialize your 2D arrays
    for(let i = 0; i < settings.width / overviewSettings.gridSize; i++) {
        topValues[i] = new Array(settings.depth / overviewSettings.gridSize).fill(0);
        bottomValues[i] = new Array(settings.depth / overviewSettings.gridSize).fill(0);
        widthValuesFront[i] = new Array(settings.height / overviewSettings.gridSize).fill(0);
        widthValuesBack[i] = new Array(settings.height / overviewSettings.gridSize).fill(0);
    }

    for(let i = 0; i < settings.depth / overviewSettings.gridSize; i++) {
        depthValuesLeft[i] = new Array(settings.height / overviewSettings.gridSize).fill(0);
        depthValuesRight[i] = new Array(settings.height / overviewSettings.gridSize).fill(0);
    }


    //Width
    for(let xSection = 0; xSection < settings.width / overviewSettings.gridSize; xSection++){
        for(let ySection = 0; ySection < settings.height / overviewSettings.gridSize; ySection++){
            let value = 0;

            for(let x = 0; x < overviewSettings.gridSize; x++){
                let newX = xSection *overviewSettings.gridSize + x;
                for(let y = 0; y < overviewSettings.gridSize; y++){
                    let newY = ySection *overviewSettings.gridSize + y;
                    for(let z = 0; z < settings.depth; z++){
                        if(grid[newX][newY][z] !== undefined){
                            let obj = grid[newX][newY][z];
                            if(obj && obj.weight && obj.weight > 0){
                                value += obj.weight / (obj.width * obj.depth * obj.height);
                            }
                        }
                    }
                }
            }

            widthValuesFront[xSection][settings.height / overviewSettings.gridSize - ySection - 1] = value;
            widthValuesBack[settings.width / overviewSettings.gridSize - xSection - 1][settings.height / overviewSettings.gridSize - ySection - 1] = value;
        }
    }

    //Depth
    for(let zSection = 0; zSection < settings.depth / overviewSettings.gridSize; zSection++){
        for(let ySection = 0; ySection < settings.height / overviewSettings.gridSize; ySection++){
            let value = 0;

            for(let z = 0; z < overviewSettings.gridSize; z++){
                let newZ = zSection *overviewSettings.gridSize + z;
                for(let y = 0; y < overviewSettings.gridSize; y++){
                    let newY = ySection *overviewSettings.gridSize + y;
                    for(let x = 0; x < settings.width; x++){
                        if(grid[x][newY][newZ] !== undefined){
                            let obj = grid[x][newY][newZ];
                            if(obj && obj.weight && obj.weight > 0){
                                value += obj.weight / (obj.width * obj.depth * obj.height);
                            }
                        }
                    }
                }
            }

            depthValuesLeft[zSection][settings.height / overviewSettings.gridSize - ySection - 1] = value;
            depthValuesRight[settings.depth / overviewSettings.gridSize - zSection - 1][settings.height / overviewSettings.gridSize - ySection - 1] = value;
        }
    }

    //Top
    for(let xSection = 0; xSection < settings.width / overviewSettings.gridSize; xSection++){
        for(let zSection = 0; zSection < settings.depth / overviewSettings.gridSize; zSection++){
            let value = 0;
            for(let x = 0; x < overviewSettings.gridSize; x++){
                let newX = xSection *overviewSettings.gridSize + x;
                for(let z = 0; z < overviewSettings.gridSize; z++){
                    let newZ = zSection *overviewSettings.gridSize + z;

                    for(let y = 0; y < settings.height; y++){
                        if(grid[newX][y][newZ] !== undefined){
                            let obj = grid[newX][y][newZ];
                            if(obj && obj.weight && obj.weight > 0){
                                value += obj.weight / (obj.width * obj.depth * obj.height);
                            }
                        }
                    }
                }
            }
            topValues[xSection][zSection] = value;
            bottomValues[xSection][settings.depth / overviewSettings.gridSize - zSection - 1] = value;
        }
    }

    function updateGrid(context, canvas, values) {
        context.clearRect(0, 0, canvas.width, canvas.height);

        let maxValue = -Infinity;

        for(let i = 0; i < values.length; i++) {
            for(let j = 0; j < values[i].length; j++) {
                if(values[i][j] > maxValue) {
                    maxValue = values[i][j];
                }
            }
        }


        let renderSize = 64;

        for(let i = 0; i < canvas.width; i += renderSize) {
            for(let j = 0; j < canvas.height; j += renderSize) {
                context.strokeRect(i, j, renderSize, renderSize);

                let x = i / renderSize;
                let y = j / renderSize;

                let value = values[x][y];

                let normalizedValue = 1 - (value / maxValue);

                // Map the normalized value to a hue between 0 (red) and 120 (green)
                let hue = normalizedValue * 120;

                context.fillStyle = `hsla(${hue}, 100%, 50%, ${overviewSettings.opacity})`;
                context.fillRect(i, j, renderSize, renderSize);
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