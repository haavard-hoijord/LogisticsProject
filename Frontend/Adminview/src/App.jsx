import React, {useState, memo, useMemo, useEffect} from 'react'
import {
    GoogleMap,
    useJsApiLoader,
    TrafficLayer,
    Polyline,
    Marker,
    Circle,
    DirectionsService,
    DirectionsRenderer,
} from '@react-google-maps/api';
import './App.css'


const css3Colors = [
    'aqua', 'black', 'blue', 'fuchsia', 'gray', 'green', 'lime', 'maroon', 'navy',
    'olive', 'orange', 'purple', 'red', 'silver', 'teal', 'white', 'yellow',
];

// Seeded random number generator
function seededRandom(seed) {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
}

// Generate a random CSS3 color based on a seed value
function seededRandomColor(seed) {
    const randomIndex = Math.floor(seededRandom(seed) * css3Colors.length);
    return css3Colors[randomIndex];
}

function MapComponent() {
    const {isLoaded} = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: "AIzaSyD1P03JV4_NsRfuYzsvJOW5ke_tYCu6Wh0"
    })
    const [map, setMap] = useState(null)
    const [mode, setMode] = useState("car");
    const [pathMode, setPathMode] = useState("start");
    const [center, setCenter] = useState({lat: 0, lng: 0});
    const [vehicles, setVehicles] = useState([]);
    const [selectedVehicle, setSelectedVehicle] = useState(null);
    const [error, setError] = React.useState("");
    const [response, setResponse] = useState({});
    const [load, setLoad] = useState(50);
    const [tempPath, setTempPath] = useState([]);
    const [directions, setDirections] = useState({});

    const onLoad = React.useCallback(function callback(map) {
        navigator.geolocation.getCurrentPosition(function (position) {
            const bounds = new window.google.maps.LatLngBounds({
                lat: position.coords.latitude,
                lng: position.coords.longitude
            });
            setCenter(bounds.getCenter());
            map.fitBounds(bounds);
            map.setZoom(12)
            setMap(map)
        });
    }, [])
    const onUnmount = React.useCallback(function callback(map) {
        setMap(null)
    }, [])
    const onClick = async (...args) => {
        if (mode === "car") {
            let vehicle =
                {
                    coordinate: {
                        latitude: args[0].latLng.lat(),
                        longitude: args[0].latLng.lng(),
                    },
                    company: "Company",
                    maxLoad: load,
                    destinations: []
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
        } else if (mode === "path") {
            if (pathMode === "start") {
                setTempPath([...tempPath, {lat: args[0].latLng.lat(), lng: args[0].latLng.lng()}]);
                setPathMode("end");
            } else if (pathMode === "end") {
                setPathMode("start");
                await fetch(`http://localhost:5002/add`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        size: load,
                        pickup: {
                            latitude: tempPath[0].lat,
                            longitude: tempPath[0].lng
                        },
                        dropoff: {
                            latitude: args[0].latLng.lat(),
                            longitude: args[0].latLng.lng()
                        }
                    })
                });
                setTempPath([]);
                fetchVehicles();
            }
        }
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

    useEffect(() => {
        fetchVehicles()
        const interval = setInterval(() => {
            fetchVehicles();
        }, 10 * 1000);
        return () => clearInterval(interval);
    }, []);

    let paths = []
    const items = vehicles.map((vehicle, index) => {
        let path = []
        if (vehicle.destinations) {
            let position = {lat: vehicle.coordinate.latitude, lng: vehicle.coordinate.longitude}
            vehicle.destinations.forEach(async (destination, index) => {
                if (destination.coordinate) {

                    if (!directions[`${vehicle.id}-${index}`]) {
                        let response = await fetch(`http://localhost:5001/path`, {
                            method: 'GET',
                            headers: {
                                'Content-Type': 'application/json',
                                'id': `${vehicle.id}-${index}`
                            },
                        })

                        if (response.status === 200) {
                            let data = await response.json();
                            if (data) {
                                setDirections({...directions, [`${vehicle.id}-${index}`]: data})
                            }
                        }
                    }

                    let pos = {lat: destination.coordinate.latitude, lng: destination.coordinate.longitude}
                    path.push(<Circle key={`Destination ${vehicle.id}-${index}`} center={pos} options={
                        {
                            fillColor: destination.isPickup ? "green" : "red",
                            strokeColor: "white",
                            fillOpacity: 1,
                            strokeOpacity: 0,
                            visible: true,
                            clickable: false,
                            radius: 300,
                            zIndex: 1000
                        }
                    }/>)
                    paths.push({start: position, end: pos, id: `${vehicle.id}-${index}`})

                    if (directions[`${vehicle.id}-${index}`]) {
                        let ob = directions[`${vehicle.id}-${index}`];
                        if (ob && Array.isArray(ob)) {
                            let lastPos = position;

                            ob.forEach((pos, index) => {
                                path.push(<Polyline key={`Path ${vehicle.id}-${index}-${Math.random()}`}
                                                    path={[lastPos, pos]} options={
                                    {
                                        zIndex: -1000,
                                        strokeColor: seededRandomColor(vehicle.id)
                                    }
                                }/>)
                                lastPos = pos;
                            })
                        }
                    } else {
                        path.push(<Polyline key={`Path ${vehicle.id}-${index}`} path={[position, pos]} options={
                            {
                                zIndex: -1000
                            }
                        }/>)
                    }

                    position = pos;

                }
            });
        }

        return <Marker key={`Vehicle ${vehicle.id} - ${Math.random()}`}
                       position={{lat: vehicle.coordinate.latitude, lng: vehicle.coordinate.longitude}}
                       onClick={(e) => {
                           setSelectedVehicle(vehicle)
                       }}>
            {path}
        </Marker>
    });

    const path = selectedVehicle ? <></> : <></>

    return isLoaded ? (
        <div>
            <p className="error">{error}</p>
            <GoogleMap
                mapContainerStyle={{
                    width: '100%',
                    height: '600px'
                }}
                center={center}
                zoom={2}
                onLoad={onLoad}
                onClick={onClick}
                onUnmount={onUnmount}
            >
                <TrafficLayer/>
                <Marker position={center} icon={{
                    path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
                    scale: 7,
                }}/>
                {items}
                {path}
                {tempPath.map((pos, index) =>
                    <Circle key={`Temp position ${Math.random()}`} center={pos} options={
                        {
                            fillColor: "green",
                            visible: true,
                            clickable: false,
                            radius: 200,
                            zIndex: 1
                        }
                    }/>)}
            </GoogleMap>
            <button onClick={e => {
                setMode(mode === "car" ? "path" : "car")
                setLoad(mode === "car" ? 5 : 50)
            }}>{mode === "car" ? "Add Car" : "Add Path"}</button>
            <br/>

            <input className="load_amount" type="number" value={load} placeholder="Load" required onChange={(e) => {
                setLoad(e.target.value)
            }}/>
            <br/>

            <button onClick={e => {
                for (let vehicle of vehicles) {
                    fetch(`http://localhost:5001/delete`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(vehicle)
                    });
                }
                window.location.reload();
            }}>Clear
            </button>
        </div>
    ) : <></>;
}

function App() {
    return (
        <div className="App">
            <MapComponent/>
        </div>
    )
}

export default App