import React, {useEffect, useRef, useState} from 'react'
import {GoogleMap, LoadScript, Marker, Polyline, TrafficLayer} from '@react-google-maps/api';
import './App.css'
import Chatlog from "./components/Chatlog.jsx";
import Sidebar from "./components/Sidebar.jsx";

const css3Colors = [
    'aqua', 'black', 'blue', 'fuchsia', 'gray', 'green', 'lime', 'maroon', 'navy',
    'olive', 'orange', 'purple', 'red', 'teal', 'yellow',
];


//Custom map markers: https://github.com/Concept211/Google-Maps-Markers

const mapMarkers = [
    'http://maps.gstatic.com/mapfiles/markers2/marker.png',
    'http://maps.gstatic.com/mapfiles/markers2/icon_green.png',
    'http://maps.gstatic.com/mapfiles/markers2/icon_purple.png',
    'http://maps.gstatic.com/mapfiles/markers2/icon_yellow.png',
    'http://maps.gstatic.com/mapfiles/markers2/icon_orange.png',
    'http://maps.gstatic.com/mapfiles/markers2/icon_pink.png',
    'http://maps.gstatic.com/mapfiles/markers2/icon_brown.png',
]

function getColor(num) {
    return css3Colors[num % css3Colors.length];
}

function getCurrentTimestamp() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}


const DAPR_URL = `http://localhost:5000/dapr`;
const GOOGLE_API_TOKEN = "AIzaSyD1P03JV4_NsRfuYzsvJOW5ke_tYCu6Wh0";

function MapComponent() {
    const vehicleRefs = useRef([]);

    const [currentLocation, setCurrentLocation] = useState(null);
    const [center, setCenter] = useState(null);
    const [zoom, setZoom] = useState(12);

    const [mode, setMode] = useState(null);
    const [pathMode, setPathMode] = useState("start");
    const [vehicles, setVehicles] = useState([]);
    const [selectedVehicle, setSelectedVehicle] = useState(null);
    const [followedVehicle, setFollowedVehicle] = useState(null);

    const [logMessages, setLogMessages] = useState([]);

    const [pathPreview, setPathPreview] = useState({dropoff: null, pickup: null});

    const onClick = async (...args) => {
        focusVehicle(null)
        if (mode === "car") {
            let vehicle =
                {
                    coordinate: {
                        latitude: args[0].latLng.lat(),
                        longitude: args[0].latLng.lng(),
                    },
                    company: company,
                    mapService: mapMode,
                    maxLoad: vehicleLoad,
                    destinations: [],
                    nodes: []
                };
            setVehicles([...vehicles, vehicle]);
            await fetch(`${DAPR_URL}/v1.0/invoke/tracker/method/add`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(vehicle)
            });
            fetchVehicles();
            if (!args[0].domEvent.shiftKey) setMode(null);
        } else if (mode === "path") {
            if (pathMode === "start") {
                await setPathPreview({
                    pickup: {lat: args[0].latLng.lat(), lng: args[0].latLng.lng()},
                    dropoff: pathPreview.dropoff
                });
                setPathMode("end");
            } else if (pathMode === "end") {
                setPathMode("start");
                await setPathPreview({
                    pickup: pathPreview.pickup,
                    dropoff: {lat: args[0].latLng.lat(), lng: args[0].latLng.lng()}
                });
                await addPath(pathPreview.pickup, {lat: args[0].latLng.lat(), lng: args[0].latLng.lng()});
                if (!args[0].domEvent.shiftKey) setMode(null);
                setPathPreview({dropoff: null, pickup: null});
            }
        }
    }

    async function addPath(pickup, dropoff) {
        await fetch(`${DAPR_URL}/v1.0/invoke/planner/method/add`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                size: pathLoad,
                pickup: {
                    latitude: pickup.lat,
                    longitude: pickup.lng
                },
                dropoff: {
                    latitude: dropoff.lat,
                    longitude: dropoff.lng
                }
            })
        });
        fetchVehicles();
    }

    async function clear() {
        for (let vehicle of vehicles) {
            await fetch(`${DAPR_URL}/v1.0/invoke/tracker/method/delete`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(vehicle)
            });
        }
        setVehicles([]);
        setPathPreview({dropoff: null, pickup: null})
        window.location.reload();
    }

    async function fetchVehicles() {
        await fetch(`${DAPR_URL}/v1.0/invoke/tracker/method/track/all`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        })
            .then(response => response.json())
            .then(data => setVehicles([...data]));
    }

    useEffect(() => {
        fetchVehicles();
    }, []);


    useEffect(() => {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setCurrentLocation({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                });
            },
            (error) => {
                console.error('Error getting current position:', error);
            }
        );
    }, []);


    useEffect(() => {
        const ws = new WebSocket("ws://localhost:5000/ws");
        ws.onmessage = async (event) => {
            let mes = JSON.parse(event.data);

            let type = mes.type;
            let data = mes.data;

            async function updateVehicle(data) {
                if (data.vehicle) {
                    vehicles.forEach((vehicle, index) => {
                        if (vehicle.id === data.id) {
                            data.vehicle.id = data.id;
                            vehicles[index] = data.vehicle;
                        }
                    });
                    await setVehicles([...vehicles]);

                    if (followedVehicle && followedVehicle.id === data.vehicle.id) {
                        setCenter({
                            lat: data.vehicle.coordinate.latitude,
                            lng: data.vehicle.coordinate.longitude
                        })
                    }
                }
            }

            switch (type) {
                case "pickup": {
                    setLogMessages([...logMessages, {
                        text: `Vehicle ${data.id} picked up a package at ${data.route}`,
                        timestamp: getCurrentTimestamp()
                    }]);
                    await updateVehicle(data);
                    break;
                }

                case "delivery": {
                    setLogMessages([...logMessages, {
                        text: `Vehicle ${data.id} delivered a package at ${data.route}`,
                        timestamp: getCurrentTimestamp()
                    }]);
                    await updateVehicle(data);
                    break;
                }

                case "update_vehicle": {
                    await updateVehicle(data);
                    break;
                }

                case "add_vehicle": {
                    if (data.vehicle) await setVehicles([...vehicles, data.vehicle]);
                    break;
                }

                case "remove_vehicle": {
                    let v = vehicles;
                    v.forEach((vehicle, index) => {
                        if (vehicle.id === data.id) {
                            v.splice(index, 1);
                        }
                    });
                    await setVehicles([...v]);
                    break;
                }

                default:
                    console.log(type)
                    console.log(`Received message ${JSON.stringify(mes)}`)
                    break;
            }
        }

        ws.onclose = (event) => {
        }

        return () => {
            ws.close()
        };
    }, [vehicles]);

    function focusVehicle(vehicle) {
        setSelectedVehicle(vehicle);
        setFollowedVehicle(vehicle);
        setZoom(15);

        if (vehicle) {
            let vehicleId = vehicle.id || Math.max(...vehicles.map((v) => v.id));
            let index = vehicles.findIndex((v) => v.id === vehicleId);
            if(vehicleRefs[index]){
                vehicleRefs[index].scrollIntoView({
                    behavior: 'smooth',
                    block: 'center'
                });
            }
            setCenter({
                lat: vehicle.coordinate.latitude,
                lng: vehicle.coordinate.longitude
            })
        }
    }

    const items = vehicles.map((vehicle) => {
        if (selectedVehicle && selectedVehicle.id !== vehicle.id) {
            return null;
        }

        let vehicleId = vehicle.id || Math.max(...vehicles.map((v) => v.id));
        let path = []
        if (vehicle.destinations) {
            let position = {lat: vehicle.coordinate.latitude, lng: vehicle.coordinate.longitude}
            vehicle.destinations.forEach(async (destination, index) => {
                if (destination.coordinate) {
                    let pos = {lat: destination.coordinate.latitude, lng: destination.coordinate.longitude}
                    path.push(<Marker key={`Destination ${vehicleId}-${index}`} position={pos}
                                      icon={{
                                          url: `https://raw.githubusercontent.com/Concept211/Google-Maps-Markers/master/images/marker_${destination.isPickup ? "green" : "red"}${destination.routeId}.png`,
                                      }}
                                      onClick={() => focusVehicle(vehicle)}
                    />)
                    position = pos;
                }
            });
        }

        if (vehicle.nodes && Array.isArray(vehicle.nodes) && vehicle.nodes.length > 0) {
            let paths = vehicle.nodes.map((node) => {
                return {
                    lat: node.coordinate.latitude,
                    lng: node.coordinate.longitude
                }
            });
            paths.unshift({
                lat: vehicle.coordinate.latitude,
                lng: vehicle.coordinate.longitude
            });
            path.push(<Polyline key={`Path ${vehicleId}`} path={paths} options={{
                zIndex: -1000,
                strokeColor: getColor(vehicleId - 1),
                strokeWeight: 3
            }} onClick={() => focusVehicle(vehicle)}/>)

        } else if (vehicle.destinations && Array.isArray(vehicle.destinations) && vehicle.destinations.length > 0) {
            path.push(<Polyline key={`Path ${vehicleId}`} path={vehicle.destinations.map((destination) => {
                return {
                    lat: destination.coordinate.latitude,
                    lng: destination.coordinate.longitude
                }
            })} options={{
                zIndex: -1000,
                strokeColor: getColor(vehicleId - 1),
                strokeWeight: selectedVehicle && selectedVehicle.id === vehicle.id ? 10 : 3
            }} onClick={() => focusVehicle(vehicle)}/>)
        }

        return <Marker key={`Vehicle ${vehicleId}`}
                       label={{
                           text: "\ue558",
                           fontFamily: "Material Icons",
                           color: getColor(vehicleId - 1),
                           fontSize: "18px",
                       }}
                       icon={{
                           url: "",
                           scaledSize: new window.google.maps.Size(0, 0),
                       }}
                       title={`Vehicle ${vehicleId}`}
                       position={{lat: vehicle.coordinate?.latitude, lng: vehicle.coordinate?.longitude}}
                       onClick={(e) => {
                           focusVehicle(vehicle)
                       }}>
            {path}
        </Marker>
    });

    async function pickupAddress(e) {
        e.preventDefault();
        let val = e.target[0].value;

        if (val) {
            let response = await fetch(`${DAPR_URL}/v1.0/invoke/planner/method/address`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({address: val})

            });

            if (response.ok) {
                let js = await response.json();
                await setPathPreview({
                    pickup: {lat: js.latitude, lng: js.longitude},
                    dropoff: pathPreview.dropoff
                })
                if (pathPreview.dropoff) {
                    await addPath({lat: js.latitude, lng: js.longitude}, pathPreview.dropoff);
                } else {
                    setPathMode("end")
                }
            }
        }

        setPathPreview({dropoff: null, pickup: null});
    }
    async function dropOffAddress(e) {
        e.preventDefault();
        let val = e.target[0].value;

        if (val) {
            let response = await fetch(`${DAPR_URL}/v1.0/invoke/planner/method/address`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({address: val})
            });

            if (response.ok) {
                let js = await response.json();
                await setPathPreview({
                    pickup: pathPreview.pickup,
                    dropoff: {lat: js.latitude, lng: js.longitude}
                })
                if (pathPreview.pickup) {
                    await addPath(pathPreview.pickup, {lat: js.latitude, lng: js.longitude});
                } else {
                    setPathMode("start")
                }
            }
        }
        setPathPreview({dropoff: null, pickup: null});
    }
    async function postSimSpeed(e) {
        await fetch(`${DAPR_URL}/v1.0/invoke/backend/method/simulation/speed`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(e)
        });
    }

    if(false){
        let old = (
            <div className="sidebar">
                <div className="sidebar-top" ref={topSectionRef}>
                    {vehicles.map((vehicle, index) => {
                        let vehicleId = vehicle.id || Math.max(...vehicles.map((v) => v.id));
                        return (
                            <div ref={(el) => vehicleRefs[index] = el}
                                 className={"vehicle-button " + (selectedVehicle && selectedVehicle.id === vehicle.id ? "selected" : "")}>
                                <div className="vehicle-button-row">
                                <span className="vehicle-text">
                                    <b>Vehicle {vehicle.id}</b>
                                    <div className="color-cube" style={{
                                        float: "right",
                                        height: "25px",
                                        width: "25px",
                                        borderRadius: "50%",
                                        backgroundColor: getColor(vehicleId - 1)
                                    }}/>
                                    <br/>
                                    Status:
                                    <br/>
                                    <b>
                                        {vehicle.nodes.length > 0 && vehicle.destinations.length > 0 ? vehicle.destinations[0].isPickup ? `Picking up ${vehicle.destinations[0].routeId}` : `Delivering ${vehicle.destinations[0].routeId}` : "IDLE"}
                                    </b>
                                    <br/>
                                    Capacity: <b>{vehicle.maxLoad - vehicle.destinations.filter(e => !e.isPickup).map(e => e.load).reduce((acc, x) => acc + x, 0)} / {vehicle.maxLoad}</b>
                                </span>
                                    <br></br>
                                    <div className="action-buttons">
                                        <button onClick={() => {
                                            if (selectedVehicle && selectedVehicle.id === vehicle.id) {
                                                focusVehicle(null)
                                            } else {
                                                focusVehicle(vehicle)
                                            }
                                        }}>{selectedVehicle && selectedVehicle.id === vehicle.id ? "Unfocus" : "Focus"}
                                        </button>
                                        <button onClick={async () => {
                                            await fetch(`${DAPR_URL}/v1.0/invoke/tracker/method/delete`, {
                                                method: 'POST',
                                                headers: {
                                                    'Content-Type': 'application/json'
                                                },
                                                body: JSON.stringify(vehicle)
                                            });
                                            fetchVehicles();
                                        }}>Remove
                                        </button>
                                    </div>
                                </div>
                            </div>)
                    })}
                </div>
                <div className="sidebar-divider" onMouseDown={handleMouseDown}/>
                <div className="sidebar-bottom">
                    <div className="input-container">
                        <label className="label" htmlFor="sim-speed">Simulation speed</label>
                        <input id="sim-speed" type="number" min="0.00" step="0.5" value={simSpeed}
                               onChange={e => {
                                   setSimSpeed(e.target.value)
                                   postSimSpeed(e.target.value)
                               }} required/>
                    </div>

                    <div className="sidebar-divider-2"/>

                    <div className="input-container">
                        <label className="label" htmlFor="companies">Vehicle company</label>
                        <select id="companies" value={company || undefined}
                                onChange={(e) => setCompany(e.target.value)}>
                            {companies.map((mode) => {
                                return <option key={mode} value={mode}>{mode}</option>
                            })}
                        </select>
                    </div>
                    <div className="input-container">
                        <label className="label" htmlFor="map-modes">Vehicle map service</label>
                        <select id="map-modes" value={mapMode?.toLowerCase() || undefined}
                                onChange={(e) => setMapMode(e.target.value)}>
                            {mapModes.map((mode) => {
                                return <option key={mode}
                                               value={mode.toLowerCase()}>{mode.charAt(0).toUpperCase() + mode.slice(1)}</option>
                            })}
                        </select>
                    </div>
                    <div className="input-container">
                        <label className="label" htmlFor="load-size">Vehicle max capacity</label>
                        <input id="load-size" type="number" min="1" value={vehicleLoad}
                               onChange={e => setVehicleLoad(e.target.value)} required/>
                    </div>
                    <button className={"form-element " + (mode === "car" ? "selected" : "")}
                            onClick={() => setMode(mode === "car" ? null : "car")}>Add vehicle
                    </button>

                    <form className="input-container" onSubmit={pickupAddress}>
                        <label className="label" htmlFor="pickup-address">Pickup address</label>
                        <input id="pickup-address" type="text" placeholder="Address"/>
                    </form>
                    <form className="input-container" onSubmit={dropOffAddress}>
                        <label className="label" htmlFor="dropoff-address">Dropoff address</label>
                        <input id="dropoff-address" type="text" placeholder="Address"/>
                    </form>
                    <div className="input-container">
                        <label className="label" htmlFor="load-size">Delivery size</label>
                        <input id="load-size" type="number" min="1" value={pathLoad}
                               onChange={e => setPathLoad(e.target.value)} required/>
                    </div>
                    <button className={"form-element " + (mode === "path" ? "selected" : "")}
                            onClick={() => setMode(mode === "path" ? null : "path")}>Add delivery
                    </button>
                    <button className="form-element" onClick={() => clear()}>Clear</button>
                </div>
            </div>
        )
    }
    return (
        <div className="layout-container">
            <Sidebar vehicles={vehicles} vehicleRefs={vehicleRefs} logMessages={logMessages} selectedVehicle={selectedVehicle} setSelectedVehicle={focusVehicle} getColor={getColor}/>
            <div className="map-container">
                <LoadScript googleMapsApiKey={GOOGLE_API_TOKEN}>
                    <GoogleMap
                        mapContainerStyle={{
                            width: '100%',
                            height: '100%'
                        }}
                        options={{
                            disableDefaultUI: true,
                        }}
                        center={center || currentLocation || {lat: 0, lng: 0}}
                        zoom={zoom}
                        onClick={onClick}
                        clickableIcons={false}
                        onDrag={(e) => {
                            setFollowedVehicle(null)
                        }}
                        onDragStart={(e) => {
                            setFollowedVehicle(null)
                        }}
                    >
                        <TrafficLayer key="Traffic"/>

                        {currentLocation ? <Marker key={"current-pos"} position={currentLocation} icon={{
                            path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
                            scale: 7,
                        }}/> : <></>}

                        {items}
                        {pathPreview && pathPreview.pickup ?
                            <Marker key="Pickup" position={pathPreview.pickup} icon={{
                                url: 'http://maps.gstatic.com/mapfiles/markers2/icon_green.png',
                            }}/> : <></>}
                        {pathPreview && pathPreview.dropoff ?
                            <Marker key="Dropoff" position={pathPreview.dropoff} icon={{
                                url: 'http://maps.gstatic.com/mapfiles/markers2/marker.png',
                            }}/> : <></>}
                    </GoogleMap>
                </LoadScript>
            </div>
        </div>
    );
}

function App() {
    return (
        <div className="App">
            <MapComponent/>
        </div>
    )
}

export default App