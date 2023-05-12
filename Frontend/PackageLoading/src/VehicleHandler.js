import {initGUI} from "./Gui";
import {defaultSettings, initCubes, initPackages, packages, setPackages, settings} from "./main";
import * as THREE from "three";
import {Box, boxFromPackage} from "./Box";

const DAPR_URL = `http://localhost:5000/dapr`;

export async function fetchVehicles() {
    let curSelected = vehicleSettings.curVehicle || -1;
    selectVehicle(null);

    let result = await fetch(`${DAPR_URL}/v1.0/invoke/Data/method/track/all`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    });
    if (result.ok) {
        settings.DEBUG = false;
        vehicles = result.json();
        if (curSelected !== -1) {
            selectVehicle(vehicles.find((vehicle) => vehicle.id === curSelected));
        }
        initGUI();
    }else{
        settings.DEBUG = true;
        vehicles = [];
        initGUI();
    }
}

export let vehicleSettings = {
    curVehicle: null,
};

export let vehicles = [];

export function selectVehicle(vehicle) {
    setPackages([]);

    vehicleSettings.curVehicle = vehicle;

    if (vehicle) {
        if (vehicle.route) {
            setPackages(vehicle.route.destinations.filter((destination) => destination.isPickup).map((destination) => destination.package).map((pk) => boxFromPackage(pk)));
        }
        settings.width = vehicle.width;
        settings.height = vehicle.height;
        settings.depth = vehicle.depth;
    } else {
        settings.width = defaultSettings.width;
        settings.height = defaultSettings.height;
        settings.depth = defaultSettings.depth;
        initPackages();
    }
    initCubes();
    initGUI();
}