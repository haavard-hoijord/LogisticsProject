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

function MapComponent() {
    const topSectionRef = useRef(null);
    const mapRef = useRef(null);

    const [isResizing, setIsResizing] = useState(false);

    const [currentLocation, setCurrentLocation] = useState(null);
    const [center, setCenter] = useState(null);
    const [zoom, setZoom] = useState(12);

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
                    company: "Company",
                    maxLoad: vehicleLoad,
                    destinations: [],
                    nodes: []
                };
            setVehicles([...vehicles, vehicle]);
            setSelectedVehicle(vehicle)
            await fetch(`http://localhost:5001/add`, { //http://localhost:${daprPort}/v1.0/invoke/tracker/method/add
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
                await setPathPreview({pickup: args[0].latLng, dropoff: pathPreview.dropoff});
                setPathMode("end");
            } else if (pathMode === "end") {
                setPathMode("start");
                await setPathPreview({pickup: pathPreview.pickup, dropoff: args[0].latLng});
                await addPath(pathPreview.pickup, args[0].latLng);
                if (!args[0].domEvent.shiftKey) setMode(null);
                setPathPreview({dropoff: null, pickup: null});
            }
        }
    }

    async function addPath(pickup, dropoff) {
        await fetch(`http://localhost:5002/add`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                size: pathLoad,
                pickup: {
                    latitude: pickup.lat(),
                    longitude: pickup.lng()
                },
                dropoff: {
                    latitude: dropoff.lat(),
                    longitude: dropoff.lng()
                }
            })
        });
        fetchVehicles();
    }

    function clear() {
        for (let vehicle of vehicles) {
            fetch(`http://localhost:5001/delete`, {
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
        await fetch(`http://localhost:5001/track/all`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        })
            .then(response => response.json())
            .then(data => setVehicles([...data]));
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
        const interval = setInterval(() => {
            fetchVehicles();
        }, 10000); // 10000 milliseconds = 10 seconds

        fetchVehicles();
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

        // Cleanup function that will be called when the component is unmounted
        return () => {
            clearInterval(interval);
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
                strokeColor: css3Colors[vehicle.id % css3Colors.length],
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
                strokeColor: css3Colors[vehicle.id % css3Colors.length],
                strokeWeight: selectedVehicle && selectedVehicle.id === vehicle.id ? 10 : 3
            }}
            onClick={() => setSelectedVehicle(vehicle)}/>)
        }

        return <Marker key={`Vehicle ${vehicle.id || Math.random()}`}
                       label={{
                           text: "\ue558",
                           fontFamily: "Material Icons",
                           color: css3Colors[vehicle.id % css3Colors.length],
                           fontSize: "18px",
                       }}
                       title={`Vehicle ${vehicle.id}`}
                       position={{lat: vehicle.coordinate.latitude, lng: vehicle.coordinate.longitude}}
                       onClick={(e) => {
                           setSelectedVehicle(vehicle)
                       }}>
            {path}
        </Marker>
    });

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
                                        backgroundColor: css3Colors[vehicle.id % css3Colors.length]
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
                                            await fetch(`http://localhost:5001/delete`, {
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
                    <form className="input-container" onSubmit={e => {
                        e.preventDefault();
                        let val = e.target[0].value;

                        if (val) {
                            fetch(`http://localhost:5002/address`, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({address: val})

                            }).then(response => async () => {
                                    if (response.ok) {
                                        let js = response.json();
                                        await setPathPreview({
                                            pickup: {lat: js.latitude, lng: js.longitude},
                                            dropoff: pathPreview.dropoff
                                        })
                                        if (pathPreview.pickup && pathPreview.dropoff) {
                                            await addPath({lat: js.latitude, lng: js.longitude}, pathPreview.dropoff);
                                        } else {
                                            setPathMode("end")
                                        }
                                    }
                                });
                        }
                    }}>
                        <label className="label" htmlFor="pickup-address">Pickup address</label>
                        <input id="pickup-address" type="text" placeholder="Address"/>
                    </form>
                    <form className="input-container" onSubmit={e => {
                        e.preventDefault();
                        let val = e.target[0].value;

                        if (val) {
                            fetch(`http://localhost:5002/address`, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({address: val})
                            })
                                .then(response => async () => {
                                    if (response.ok) {
                                        let js = response.json();
                                        await setPathPreview({
                                            pickup: pathPreview.pickup,
                                            dropoff: {lat: js.latitude, lng: js.longitude}
                                        })
                                        if (pathPreview.pickup && pathPreview.dropoff) {
                                            await addPath(pathPreview.pickup, {lat: js.latitude, lng: js.longitude});
                                        } else {
                                            setPathMode("start")
                                        }
                                    }
                                });
                        }
                    }}>
                        <label className="label" htmlFor="dropoff-address">Dropoff address</label>
                        <input id="dropoff-address" type="text" placeholder="Address"/>
                    </form>
                    <div className="input-container">
                        <label className="label" htmlFor="load-size">Vehicle max size</label>
                        <input id="load-size" type="number" min="1" value={vehicleLoad}
                               onChange={e => setVehicleLoad(e.target.value)} required/>
                    </div>
                    <button className={"form-element " + (mode === "car" ? "selected" : "")}
                            onClick={() => setMode(mode === "car" ? null : "car")}>Add car
                    </button>

                    <div className="input-container">
                        <label className="label" htmlFor="load-size">Delivery size</label>
                        <input id="load-size" type="number" min="1" value={pathLoad}
                               onChange={e => setPathLoad(e.target.value)} required/>
                    </div>
                    <button className={"form-element " + (mode === "path" ? "selected" : "")}
                            onClick={() => setMode(mode === "path" ? null : "path")}>Add path
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