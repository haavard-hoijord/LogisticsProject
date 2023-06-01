import * as dot from "./main.js";
import {
    algorithms,
    clearGrid,
    initCubes,
    initPackages,
    renderOverlays,
    reRenderCubes,
    settings,
    stats
} from "./main.js";
import {GUI} from "dat.gui";
import {fetchVehicles, selectVehicle, vehicles, vehicleSettings} from "./VehicleHandler";

let gui;

function saveSettings() {
    sessionStorage.setItem("settings", JSON.stringify(settings));
}

export function initGUI() {
    if (gui) {
        gui.destroy();
    }

    gui = new GUI();
    gui.width = 300;

    const statsFolder = gui.addFolder("Stats");
    statsFolder.add(dot.stats, "missedPackages").name("Missed Boxes: ").listen();
    statsFolder.add(dot.stats, "runTime").name("Run Time: ").listen();
    statsFolder.add(dot.stats, "avgRunTime").name("Avg Run Time: ").listen();

    statsFolder.open()

    const packagesFolder = gui.addFolder("Package settings");

    if (settings.DEBUG) {
        packagesFolder.add(settings, "packageCount").onChange(() => {
            saveSettings();
            initPackages()
            initCubes();
        }).name("Package Count: ");

        packagesFolder.add(settings, "maxSize", 1, 10).onChange(() => {
            saveSettings();
            initPackages();
            initCubes();
        }).name("Max Size: ");

        packagesFolder.add(settings, "uniformSizes").onChange(() => {
            saveSettings();
            initPackages()
            initCubes();
        }).name("Uniform Sizes: ");

        packagesFolder.add(settings, "checkBelowWeight").onChange(() => {
            saveSettings();
            initCubes();
        }).name("Below Weight: ");

        packagesFolder.open();
    }

    if (settings.DEBUG) {
        const sizeFolder = gui.addFolder("Container size");
        sizeFolder.add(settings, "width").onChange(() => {
            saveSettings();
            initCubes();
        }).name("Width: ").listen();

        sizeFolder.add(settings, "height").onChange(() => {
            saveSettings();
            initCubes();
        }).name("Height: ").listen();

        sizeFolder.add(settings, "depth").onChange(() => {
            saveSettings();
            initCubes();
        }).name("Depth: ").listen();

        sizeFolder.open();
    }

    const renderFolder = gui.addFolder("Render settings");
    renderFolder.add(settings, "renderEmpty").onChange(() => {
        saveSettings();
        reRenderCubes();
    }).name("Render Empty: ");

    renderFolder.add(settings, "mergeSame").onChange(() => {
        saveSettings();
        reRenderCubes();
    }).name("Merge Same: ");

    renderFolder.add(settings, "renderOverlay", renderOverlays).onChange(() => {
        saveSettings();
        reRenderCubes();
    }).name("Information Overlay: ");

    renderFolder.add(settings, "weightOverview").onChange(() => {
        saveSettings();
        reRenderCubes();
    }).name("Weight Distribution: ").listen();

    renderFolder.open()

    const otherFolder = gui.addFolder("Other");
    const btn = {
        ref: function () {
            if (!settings.DEBUG) {
                fetchVehicles();
            } else {
                initCubes();
            }
        },
        reg: function () {
            initPackages();
            initCubes();
        }
    };
    otherFolder.add(settings, "algorithm", Object.keys(algorithms)).onChange(() => {
        saveSettings();
        stats.avgRunTime = "";
        stats.missedPackages = 0;
        stats.runTimes = [];
        stats.runTime = "";

        initCubes();
        initGUI();
    }).name("Algorithm: ");
    otherFolder.add(btn, "ref").name("Refresh");
    if (settings.DEBUG) otherFolder.add(btn, "reg").name("Regenerate");

    if (vehicles && vehicles.length > 0) {
        otherFolder.add(settings, "DEBUG").name("Debug").onChange(() => {
            saveSettings();
            clearGrid();

            initGUI();

            if (settings.DEBUG) {
                initPackages();
                settings.width = 20;
                settings.height = 10;
                settings.depth = 10;
            } else {
                fetchVehicles();
            }
            initCubes();
        });

        const vehicleFolder = gui.addFolder("Vehicles");

        vehicleFolder.add(vehicleSettings, "curVehicle", vehicles.sort((e => -e.id)).map((s) => `Vehicle ${s.id}`)).onChange(() => {
            selectVehicle(vehicles.find((e) => e.id === vehicleSettings.curVehicle.split(" ")[1]));
        }).name("Vehicle: ");
        vehicleFolder.open();
    }

    otherFolder.open()
}