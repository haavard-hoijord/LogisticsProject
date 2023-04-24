import React, {useEffect, useRef, useState} from 'react'
import {GoogleMap, LoadScript, Marker, Polyline, TrafficLayer} from '@react-google-maps/api';

import './App.css'
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


export const DAPR_URL = `http://localhost:5000/dapr`;
export const GOOGLE_API_TOKEN = "AIzaSyD1P03JV4_NsRfuYzsvJOW5ke_tYCu6Wh0";

function MapComponent() {
    const vehicleRefs = useRef([]);

    const [mapPicker, setMapPicker] = useState(null);
    const [reRenderValue, setReRender] = useState(false);

    const [currentLocation, setCurrentLocation] = useState(null);
    const [center, setCenter] = useState(null);
    const [zoom, setZoom] = useState(12);
    const [mousePosition, setMousePosition] = useState(null);

    const [vehicles, setVehicles] = useState([]);
    const [selectedVehicle, setSelectedVehicle] = useState(null);
    const [followedVehicle, setFollowedVehicle] = useState(null);

    const [logMessages, setLogMessages] = useState([]);

    const [ws, setWs] = useState(null);

    async function reRender(){
        await setReRender(!reRenderValue);
        //window.location.reload();
    }

    const onClick = async (...args) => {
        focusVehicle(null)

        if(mapPicker){
            mapPicker(args[0].latLng.lat(), args[0].latLng.lng());
            setMapPicker(null);
        }
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
        const webSocket = new WebSocket("ws://localhost:5000/ws");

        webSocket.onopen = () => {
            setWs(webSocket);
        };

        webSocket.onmessage = async (event) => {
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

        webSocket.onclose = (event) => {
            setWs(null);
        };

        webSocket.onerror = (error) => {
            console.log('WebSocket error:', error);
        };

        return () => {
            if (webSocket) {
                webSocket.close();
            }
        };
    }, [vehicles]);

    function focusVehicle(vehicle) {
        setSelectedVehicle(vehicle);
        setFollowedVehicle(vehicle);
        //setZoom(15);

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

    return (
        <div className="layout-container">
            <Sidebar vehicles={vehicles} currentLocation={currentLocation} reRender={reRender} vehicleRefs={vehicleRefs} setMapPicker={setMapPicker} logMessages={logMessages} selectedVehicle={selectedVehicle} setSelectedVehicle={focusVehicle} getColor={getColor}/>
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
                        onMouseOver={(e) => {
                            setMousePosition({
                                lat: e.latLng.lat(),
                                lng: e.latLng.lng()
                            })
                        }}
                        onMouseMove={(e) => {
                            setMousePosition({
                                lat: e.latLng.lat(),
                                lng: e.latLng.lng()
                            })
                        }}
                        onDrag={(e) => {
                            setFollowedVehicle(null)
                        }}
                        onDragStart={(e) => {
                            setFollowedVehicle(null)
                        }}
                    >
                        <TrafficLayer key="Traffic"/>

                        {currentLocation ? <Marker key={"current-pos"} position={currentLocation}/> : <></>}
                        {mapPicker !== null && mousePosition ? <Marker key={"pick-pos"} position={mousePosition} /> : <></>}

                        {items}
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