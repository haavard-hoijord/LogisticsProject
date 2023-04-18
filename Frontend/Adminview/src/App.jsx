import React, {useEffect, useRef, useState} from 'react'
import {Circle, GoogleMap, LoadScript, Marker, Polyline, TrafficLayer} from '@react-google-maps/api';
import './App.css'
import Chatlog from "./Chatlog.jsx";

const css3Colors = [
    'aqua', 'black', 'blue', 'fuchsia', 'gray', 'green', 'lime', 'maroon', 'navy',
    'olive', 'orange', 'purple', 'red', 'silver', 'teal', 'white', 'yellow',
];

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
    const topSectionRef = useRef(null);
    const mapRef = useRef(null);

    const [isResizing, setIsResizing] = useState(false);

    const [currentLocation, setCurrentLocation] = useState(null);
    const [center, setCenter] = useState(null);
    const [zoom, setZoom] = useState(12);

    const [mapModes, setMapModes] = useState([]);
    const [mapMode, setMapMode] = useState(null);

    const [companies, setCompanies] = useState([]);
    const [company, setCompany] = useState(null);

    const [mode, setMode] = useState(null);
    const [pathMode, setPathMode] = useState("start");
    const [vehicles, setVehicles] = useState([]);
    const [selectedVehicle, setSelectedVehicle] = useState(null);
    const [vehicleLoad, setVehicleLoad] = useState(50);
    const [pathLoad, setPathLoad] = useState(5);

    const [logMessages, setLogMessages] = useState([]);

    const [pathPreview, setPathPreview] = useState({dropoff: null, pickup: null});

    const onClick = async (...args) => {
        setSelectedVehicle(null)
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
            setSelectedVehicle(vehicle)
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
    async function fetchCompanies() {
        await fetch(`${DAPR_URL}/v1.0/invoke/backend/method/companies`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        })
            .then(response => response.json())
            .then(data => {
                setCompanies([...data])
                if (company === null && data.length > 0) {
                    setCompany(data[0]);
                }
            });

    }
    async function fetchMapModes() {
        await fetch(`${DAPR_URL}/v1.0/invoke/planner/method/mapmodes`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        })
            .then(response => response.json())
            .then(data => {
                setMapModes([...data])
                if (mapMode === null && data.length > 0) {
                    setMapMode(data[0]);
                }
            });
    }

    //Resize handling
    React.useEffect(() => {
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing]);

    const handleMouseDown = () => {
        setIsResizing(true);
    };

    const handleMouseUp = () => {
        setIsResizing(false);
    };

    const handleMouseMove = (event) => {
        if (isResizing && topSectionRef.current) {
            topSectionRef.current.style.height = `${event.clientY}px`;
            sessionStorage.setItem('topSectionHeight', `${event.clientY}`);
        }
    };

    useEffect(() => {
        fetchVehicles();
        fetchCompanies();
        fetchMapModes();
    }, []);

    useEffect(() => {
        if (topSectionRef.current && sessionStorage.getItem('topSectionHeight')) {
            topSectionRef.current.style.height = `${sessionStorage.getItem('topSectionHeight')}px`;
        }
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

        ws.onclose = (event) => {}

        return () => {
            ws.close()
        };
    }, [vehicles]);

    const items = vehicles.map((vehicle) => {
        let vehicleId = vehicle.id || Math.max(...vehicles.map((v) => v.id));
        let path = []
        if (vehicle.destinations) {
            let position = {lat: vehicle.coordinate.latitude, lng: vehicle.coordinate.longitude}
            vehicle.destinations.forEach(async (destination, index) => {
                if (destination.coordinate) {
                    let pos = {lat: destination.coordinate.latitude, lng: destination.coordinate.longitude}
                    path.push(<Circle key={`Destination ${vehicleId}-${index}`} center={pos} options={
                        {
                            fillColor: destination.isPickup ? "green" : "red",
                            strokeColor: "white",
                            fillOpacity: 0.5,
                            strokeOpacity: 0,
                            visible: true,
                            radius: selectedVehicle && selectedVehicle.id === vehicle.id ? 500 : 100,
                            zIndex: selectedVehicle && selectedVehicle.id === vehicle.id ? 2000 : 1000
                        }
                    } onClick={() => setSelectedVehicle(vehicle)}
                    />)
                    position = pos;
                }
            });
        }

        if (vehicle.nodes && Array.isArray(vehicle.nodes) && vehicle.nodes.length > 0) {
            path.push(<Polyline key={`Path ${vehicleId}`} path={vehicle.nodes.map((node) => {
                return {
                    lat: node.latitude,
                    lng: node.longitude
                }
            })} options={{
                zIndex: selectedVehicle && selectedVehicle.id === vehicle.id ? 1000 : -1000,
                strokeColor: getColor(vehicleId - 1),
                strokeWeight: selectedVehicle && selectedVehicle.id === vehicle.id ? 10 : 3
            }} onClick={() => setSelectedVehicle(vehicle)} />)

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
            }} onClick={() => setSelectedVehicle(vehicle)}/>)
        }

        return <Marker key={`Vehicle ${vehicleId}`}
                       label={{
                           text: "\ue558",
                           fontFamily: "Material Icons",
                           color: getColor(vehicleId - 1),
                           fontSize: "18px",
                       }}
                       title={`Vehicle ${vehicleId}`}
                       position={{lat: vehicle.coordinate?.latitude, lng: vehicle.coordinate?.longitude}}
                       onClick={(e) => {
                           setSelectedVehicle(vehicle)
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
    }

    //<TrafficLayer key="Traffic"/>

    return (
        <div className="layout-container">
            <div className="sidebar">
                <div className="sidebar-top" ref={topSectionRef}>
                    {vehicles.map((vehicle, index) => {
                        let vehicleId = vehicle.id || Math.max(...vehicles.map((v) => v.id));
                        return (
                            <div
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
                                            setSelectedVehicle(vehicle)
                                            setCenter({
                                                lat: vehicle.coordinate.latitude,
                                                lng: vehicle.coordinate.longitude
                                            })
                                        }}>Focus
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
                <div className="sidebar-divider" onMouseDown={handleMouseDown}></div>
                <div className="sidebar-bottom">
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
                            onClick={() => setMode(mode === "car" ? null : "car")}>Add car
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
            <div className="map-container">
                <LoadScript googleMapsApiKey={GOOGLE_API_TOKEN}>
                    <GoogleMap
                        ref={mapRef}
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
                    >
                        {currentLocation ? <Marker key={"current-pos"} position={currentLocation} icon={{
                            path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
                            scale: 7,
                        }}/> : <></>}

                        {items}
                        {pathPreview && pathPreview.pickup ?
                            <Circle key="Pickup" center={pathPreview.pickup} options={
                                {
                                    fillColor: "green",
                                    strokeColor: "white",
                                    fillOpacity: 1,
                                    strokeOpacity: 0,
                                    radius: 100,
                                    visible: true,
                                }
                            }/> : <></>}
                        {pathPreview && pathPreview.dropoff ?
                            <Circle key="Dropoff" center={pathPreview.dropoff} options={
                                {
                                    fillColor: "red",
                                    strokeColor: "white",
                                    fillOpacity: 1,
                                    strokeOpacity: 0,
                                    radius: 100,
                                    visible: true,
                                }
                            }/> : <></>}
                    </GoogleMap>
                </LoadScript>
                <Chatlog key="chatlog" messages={logMessages}/>
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