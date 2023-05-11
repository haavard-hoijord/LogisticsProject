import * as dot from "./main.js";
import {GUI} from "dat.gui";
import * as THREE from 'three';
import {
    algorithms,
    settings,
    packages,
    initPackages,
    initCubes,
    vehicles,
    setGrid,
    setPackages,
    stats
} from "./main.js";

let gui;
export function initGUI() {
    gui = new GUI();
    gui.width = 300;

    const statsFolder = gui.addFolder("Stats");
    statsFolder.add(dot.stats, "missedPackages").name("Missed Boxes: ").listen();
    statsFolder.add(dot.stats, "runTime").name("Run Time: ").listen();
    statsFolder.add(dot.stats, "avgRunTime").name("Avg Run Time: ").listen();

    statsFolder.open()

    const packagesFolder = gui.addFolder("Package settings");

    if(settings.DEBUG){
        packagesFolder.add(settings, "packageCount").onChange(() => {
            sessionStorage.setItem("settings", JSON.stringify(settings));
            initPackages()
            initCubes();
        }).name("Package Count: ");

        packagesFolder.add(settings, "maxSize", 1, 10).onChange(() => {
            sessionStorage.setItem("settings", JSON.stringify(settings));
            initPackages();
            initCubes();
        }).name("Max Size: ");

        packagesFolder.add(settings, "uniformSizes").onChange(() => {
            sessionStorage.setItem("settings", JSON.stringify(settings));
            initPackages()
            initCubes();
        }).name("Uniform Sizes: ");
    }

    packagesFolder.add(settings, "checkBelowWeight").onChange(() => {
        sessionStorage.setItem("settings", JSON.stringify(settings));
        initCubes();
    }).name("Below Weight: ");

    packagesFolder.open();

    const sizeFolder = gui.addFolder("Container size");
    sizeFolder.add(settings, "width").onChange(() => {
        sessionStorage.setItem("settings", JSON.stringify(settings));
        initCubes();
    }).name("Width: ");

    sizeFolder.add(settings, "height").onChange(() => {
        sessionStorage.setItem("settings", JSON.stringify(settings));
        initCubes();
    }).name("Height: ");

    sizeFolder.add(settings, "depth").onChange(() => {
        sessionStorage.setItem("settings", JSON.stringify(settings));
        initCubes();
    }).name("Depth: ");

    sizeFolder.open();

    const renderFolder = gui.addFolder("Render settings");
    renderFolder.add(settings, "renderEmpty").onChange(() => {
        sessionStorage.setItem("settings", JSON.stringify(settings));
        initCubes();
    }).name("Render Empty: ");

    renderFolder.add(settings, "mergeSame").onChange(() => {
        sessionStorage.setItem("settings", JSON.stringify(settings));
        initCubes();
    }).name("Merge Same: ");

    renderFolder.open()

    const otherFolder = gui.addFolder("Other");
    const btn = {
        ref: function () {
            if(!settings.DEBUG) {
                selectVehicle(curVehicle);
            }else{
                initCubes();
            }
        },
        reg: function () {
            initPackages();
            initCubes();
        }
    };
    otherFolder.add(settings, "algorithm", Object.keys(algorithms)).onChange(() => {
        sessionStorage.setItem("settings", JSON.stringify(settings));
        stats.avgRunTime = "";
        stats.missedPackages = 0;
        stats.runTimes = [];
        stats.runTime = "";

        initCubes();

        gui.destroy();
        initGUI();
    }).name("Algorithm: ");
    otherFolder.add(btn, "ref").name("Refresh");
    if(settings.DEBUG) otherFolder.add(btn, "reg").name("Regenerate");

    if(vehicles && vehicles.length > 0) {
        otherFolder.add(settings, "DEBUG").name("Debug").onChange(() => {
            sessionStorage.setItem("settings", JSON.stringify(settings));
            setGrid([])

            gui.destroy();
            initGUI();

            if (settings.DEBUG) {
                initPackages();
                settings.width = 20;
                settings.height = 10;
                settings.depth = 10;
            } else {
                selectVehicle(curVehicle);
            }
            initCubes();
        });

        const vehicleFolder = gui.addFolder("Vehicles");

        for (let vehicle of vehicles.sort((e => -e.id))) {
            vehicleFolder.add({
                [vehicle.id]: () => {
                    selectVehicle(vehicle);
                }
            }, vehicle.id).name("Vehicle " + vehicle.id);
        }
        vehicleFolder.open();
    }
    
    otherFolder.open()
}

export function updateGUI() {
    gui.destroy();
    initGUI();
}

export let curVehicle;

export function selectVehicle(vehicle) {
    setPackages([]);

    curVehicle = vehicle;

    if(vehicle){
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
    }
    initCubes();
}