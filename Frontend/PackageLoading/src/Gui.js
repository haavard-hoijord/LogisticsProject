import * as dot from "./main.js";
import {GUI} from "dat.gui";
import * as THREE from 'three';
import {algorithms, settings, grid, packages, initPackages, initCubes, vehicles} from "./main.js";


export function initGUI() {
    const gui = new GUI();

    const packagesFolder = gui.addFolder("Package settings");
    packagesFolder.add(settings, "packageCount").onChange(() => {
        sessionStorage.setItem("settings", JSON.stringify(settings));
        initPackages()
        initCubes();
    }).name("Package Count: ").listen();

    packagesFolder.add(settings, "uniformSizes").onChange(() => {
        sessionStorage.setItem("settings", JSON.stringify(settings));
        initPackages()
        initCubes();
    }).name("Uniform Sizes: ").listen();
    packagesFolder.add(settings, "renderEmpty").onChange(() => {
        sessionStorage.setItem("settings", JSON.stringify(settings));
        initCubes();
    }).name("Render Empty: ").listen();
    packagesFolder.add(settings, "mergeSame").onChange(() => {
        sessionStorage.setItem("settings", JSON.stringify(settings));
        initCubes();
    }).name("Merge Same: ").listen();
    packagesFolder.add(settings, "checkBelowWeight").onChange(() => {
        sessionStorage.setItem("settings", JSON.stringify(settings));
        initCubes();
    }).name("Below Weight: ").listen();
    packagesFolder.add(settings, "maxSize", 1, 10).onChange(() => {
        sessionStorage.setItem("settings", JSON.stringify(settings));
        initPackages();
        initCubes();
    }).name("Max Size: ").listen();

    packagesFolder.open();

    const sizeFolder = gui.addFolder("Container size");
    sizeFolder.add(settings, "width").onChange(() => {
        sessionStorage.setItem("settings", JSON.stringify(settings));
        initCubes();
    }).name("Width: ").listen();

    sizeFolder.add(settings, "height").onChange(() => {
        sessionStorage.setItem("settings", JSON.stringify(settings));
        initCubes();
    }).name("Height: ").listen();

    sizeFolder.add(settings, "depth").onChange(() => {
        sessionStorage.setItem("settings", JSON.stringify(settings));
        initCubes();
    }).name("Depth: ").listen();

    sizeFolder.open();

    const otherFolder = gui.addFolder("Other");
    const btn = {
        ref: function () {
            initCubes();
        },
        reg: function () {
            if (settings.DEBUG) initPackages();
            initCubes();
        }
    };
    otherFolder.add(settings, "algorithm", Object.keys(algorithms)).onChange(() => {
        sessionStorage.setItem("settings", JSON.stringify(settings));
        initCubes();
    }).name("Algorithm: ").listen();
    otherFolder.add(btn, "ref").name("Refresh");
    otherFolder.add(btn, "reg").name("Regenerate");

    if(vehicles && vehicles.length > 0) {
        otherFolder.add(settings, "DEBUG").name("Debug").onChange(() => {
            sessionStorage.setItem("settings", JSON.stringify(settings));
            grid = [];

            if (settings.DEBUG) {
                initPackages();
                settings.width = 20;
                settings.height = 10;
                settings.depth = 10;
            } else {
                selectVehicle(curVehicle);
            }
            initCubes();
        }).listen();
    }
    
    otherFolder.open()
}

export let curVehicle;

function selectVehicle(vehicle) {
    packages = [];

    curVehicle = vehicle;

    if (vehicle.route) {
        vehicle.route.destinations.filter((destination, index) => destination.isPickup).map((destination, index) => destination.package).map((pk) => {
            return {
                ...pk,
                id: pk.routeId,
                color: new THREE.Color(Math.random(), Math.random(), Math.random())
            }
        }).forEach((pk) => {
            packages.push(pk);
        });
    }
    settings.width = vehicle.width;
    settings.height = vehicle.height;
    settings.depth = vehicle.depth;
    initCubes();
}