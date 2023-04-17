import React, {useState, useRef, useEffect} from 'react'
import {
    GoogleMap,
    LoadScript,
    TrafficLayer,
    Polyline,
    Marker,
    Circle
} from '@react-google-maps/api';
import './App.css'

const css3Colors = [
    'aqua', 'black', 'blue', 'fuchsia', 'gray', 'green', 'lime', 'maroon', 'navy',
    'olive', 'orange', 'purple', 'red', 'silver', 'teal', 'white', 'yellow',
];

function getColor(num) {
    return css3Colors[num % css3Colors.length];
}

const DAPR_URL = `http://localhost:5000/dapr`;

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

    const [pathPreview, setPathPreview] = useState({dropoff: null, pickup: null});

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
                await setPathPreview({pickup: {lat: args[0].latLng.lat(), lng: args[0].latLng.lng()}, dropoff: pathPreview.dropoff});
                setPathMode("end");
            } else if (pathMode === "end") {
                setPathMode("start");
                await setPathPreview({pickup: pathPreview.pickup, dropoff: {lat: args[0].latLng.lat(), lng: args[0].latLng.lng()}});
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
                if(company === null && data.length > 0){
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
                if(mapMode === null && data.length > 0){
                    setMapMode(data[0]);
                }
            });
    }


    React.useEffect(() => {
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing]);

    useEffect(() => {
        if (topSectionRef.current && sessionStorage.getItem('topSectionHeight')) {
            topSectionRef.current.style.height = `${sessionStorage.getItem('topSectionHeight')}px`;
        }

        const interval = setInterval(() => {
            //fetchVehicles();
        }, 10000); // 10000 milliseconds = 10 seconds

        fetchVehicles();
        fetchCompanies();
        fetchMapModes();

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


        const ws = new WebSocket("ws://localhost:5000/ws");
        ws.onmessage = async (event) => {
            let mes = JSON.parse(event.data);

            let type = mes.type;
            let data = mes.data;

            switch (type) {
                case "pickup":
                    console.log("Pickup")
                    break;
                case "delivery":
                    console.log("Delivery")
                    break;


                case "update_vehicle":
                    let vh = await vehicles;
                    vh.forEach((vehicle, index) => {
                        if (vehicle.id === data.id) {
                            vh[index] = data;
                            console.log(data)
                        }
                    });
                   // await setVehicles([...vh]);
                    break;

                case "add_vehicle":
                    //await setVehicles([...vehicles, data]);
                    break;

                case "remove_vehicle":
                    let v = await vehicles;
                    v.forEach((vehicle, index) => {
                        if (vehicle.id === data.id) {
                            v.splice(index, 1);
                        }
                    });
                    //await setVehicles([...v]);
                    break;

                default:
                    console.log(type)
                    break;
            }
            console.log(`Received message ${JSON.stringify(mes)}`)
            fetchVehicles();
        }

        ws.onclose = (event) => {
            console.log("Connection closed")
        }

        // Cleanup function that will be called when the component is unmounted
        return () => {
            clearInterval(interval);
            ws.close()
        };
    }, []);


    let paths = []
    const items = vehicles.map((vehicle, index) => {
        let path = []
        if (vehicle.destinations) {
            let position = {lat: vehicle.coordinate.latitude, lng: vehicle.coordinate.longitude}
            vehicle.destinations.forEach(async (destination, index) => {
                if (destination.coordinate) {
                    let pos = {lat: destination.coordinate.latitude, lng: destination.coordinate.longitude}
                    path.push(<Circle key={`Destination ${vehicle.id}-${index}`} center={pos} options={
                        {
                            fillColor: destination.isPickup ? "green" : "red",
                            strokeColor: "white",
                            fillOpacity: 0.5,
                            strokeOpacity: 0,
                            visible: true,
                            radius: selectedVehicle && selectedVehicle.id === vehicle.id ?  500 : 100,
                            zIndex: selectedVehicle && selectedVehicle.id === vehicle.id ? 2000 : 1000
                        }
                    }
                        onClick={() => setSelectedVehicle(vehicle)}
                    />)
                    paths.push({start: position, end: pos, id: `${vehicle.id}-${index}`})
                    position = pos;
                }
            });
        }

        if (vehicle.nodes && Array.isArray(vehicle.nodes) && vehicle.nodes.length > 0) {
            let mappedNodes = vehicle.nodes.map((node) => {
                return {
                    lat: node.latitude,
                    lng: node.longitude
                }
            });
            path.push(<Polyline key={`Path ${vehicle.id || Math.random()}`} path={mappedNodes} options={{
                zIndex: selectedVehicle && selectedVehicle.id === vehicle.id ? 1000 : -1000,
                strokeColor: getColor(vehicle.id-1),
                strokeWeight: selectedVehicle && selectedVehicle.id === vehicle.id ? 10 : 3
            }}
            onClick={() => setSelectedVehicle(vehicle)}
            />)
        }else if (vehicle.destinations && Array.isArray(vehicle.destinations) && vehicle.destinations.length > 0) {
            let paths = vehicle.destinations.map((destination) => {
                return {
                    lat: destination.coordinate.latitude,
                    lng: destination.coordinate.longitude
                }
            });
            path.push(<Polyline key={`Path ${vehicle.id || Math.random()}`} path={paths} options={{
                zIndex: -1000,
                strokeColor: getColor(vehicle.id-1),
                strokeWeight: selectedVehicle && selectedVehicle.id === vehicle.id ? 10 : 3
            }}
            onClick={() => setSelectedVehicle(vehicle)}/>)
        }

        return <Marker key={`Vehicle ${vehicle.id || Math.random()}`}
                       label={{
                           text: "\ue558",
                           fontFamily: "Material Icons",
                           color: getColor(vehicle.id-1),
                           fontSize: "18px",
                       }}
                       title={`Vehicle ${vehicle.id}`}
                       position={{lat: vehicle.coordinate?.latitude, lng: vehicle.coordinate?.longitude}}
                       onClick={(e) => {
                           setSelectedVehicle(vehicle)
                       }}>
            {path}
        </Marker>
    });

    async function pickupAddress(e){
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

    async function dropOffAddress(e)   {
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

    return (
        <div className="layout-container">
            <div className="sidebar">
                <div className="sidebar-top" ref={topSectionRef}>
                    {vehicles.map((vehicle, index) => {
                        return (
                            <div className={"vehicle-button " + (selectedVehicle && selectedVehicle.id === vehicle.id ? "selected" : "")}>
                                <div className="vehicle-button-row">
                                <span className="vehicle-text">
                                    <b>Vehicle {vehicle.id}</b>
                                    <div className="color-cube" style={{
                                        float: "right",
                                        height: "25px",
                                        width: "25px",
                                        borderRadius: "50%",
                                        backgroundColor: getColor(vehicle.id-1)
                                    }}></div>
                                    <br/>
                                    Status:
                                    <br/>
                                    <b>
                                        {vehicle.nodes.length > 0 && vehicle.destinations.length > 0 ? vehicle.destinations[0].isPickup ? `Picking up ${vehicle.destinations[0].routeId}` : `Delivering ${vehicle.destinations[0].routeId}` : "IDLE"}
                                    </b>
                                    <br/>
                                    Capacity: <b>{vehicle.maxLoad - vehicle.destinations.filter(e => !e.isPickup).map(e=>e.load).reduce((acc, x) => acc + x, 0)} / {vehicle.maxLoad}</b>
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
                        <select id="companies" value={company} onChange={(e) => setCompany(e.target.value)}>
                            {companies.map((mode) => {
                                return <option value={mode}>{mode}</option>
                            })}
                        </select>
                    </div>
                    <div className="input-container">
                        <label className="label" htmlFor="map-modes">Vehicle map service</label>
                        <select id="map-modes" value={mapMode?.toLowerCase()} onChange={(e) => setMapMode(e.target.value)}>
                            {mapModes.map((mode) => {
                                return <option value={mode.toLowerCase()}>{mode.charAt(0).toUpperCase() + mode.slice(1)}</option>
                            })}
                        </select>
                    </div>
                    <div className="input-container">
                        <label className="label" htmlFor="load-size">Vehicle max size</label>
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
                <LoadScript googleMapsApiKey={"AIzaSyD1P03JV4_NsRfuYzsvJOW5ke_tYCu6Wh0"}>
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
                        <TrafficLayer/>
                        {currentLocation ? <Marker position={currentLocation} icon={{
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