import React, {useEffect, useRef, useState} from 'react'
import {GoogleMap, LoadScript, Marker, Polyline, TrafficLayer} from '@react-google-maps/api';
import polyline from '@mapbox/polyline';

import './App.css'
import Sidebar from "./components/Sidebar.jsx";

const css3Colors = ['aqua', 'black', 'blue', 'fuchsia', 'gray', 'green', 'lime', 'maroon', 'navy', 'olive', 'orange', 'purple', 'red', 'teal', 'yellow',];


//Custom map markers: https://github.com/Concept211/Google-Maps-Markers

const mapMarkers = ['http://maps.gstatic.com/mapfiles/markers2/marker.png', 'http://maps.gstatic.com/mapfiles/markers2/icon_green.png', 'http://maps.gstatic.com/mapfiles/markers2/icon_purple.png', 'http://maps.gstatic.com/mapfiles/markers2/icon_yellow.png', 'http://maps.gstatic.com/mapfiles/markers2/icon_orange.png', 'http://maps.gstatic.com/mapfiles/markers2/icon_pink.png', 'http://maps.gstatic.com/mapfiles/markers2/icon_brown.png',]

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
export const GOOGLE_API_TOKEN = import.meta.env.VITE_GOOGLE_API_TOKEN;

function MapComponent() {
    const vehicleRefs = useRef([]);
    const mapRef = useRef(null);

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

    async function reRender() {
        await setReRender(!reRenderValue);
        //window.location.reload();
    }

    const onClick = async (...args) => {
        focusVehicle(null)

        if (mapPicker) {
            mapPicker(args[0].latLng.lat(), args[0].latLng.lng());
            setMapPicker(null);
        }
    }

    async function fetchVehicles() {
        await fetch(`${DAPR_URL}/v1.0/invoke/Database/method/track/all`, {
            method: 'GET', headers: {
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
        navigator.geolocation.getCurrentPosition((position) => {
            setCurrentLocation({
                lat: position.coords.latitude, lng: position.coords.longitude,
            });
        }, (error) => {
            console.error('Error getting current position:', error);
        });
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
                            lat: data.vehicle.coordinate.latitude, lng: data.vehicle.coordinate.longitude
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
            if (vehicleRefs[index]) {
                vehicleRefs[index].scrollIntoView({
                    behavior: 'smooth', block: 'center'
                });
            }
            setCenter({
                lat: vehicle.coordinate.latitude, lng: vehicle.coordinate.longitude
            })
        }
    }

    const items = !mapRef ? [(<></>)] : vehicles.map((vehicle) => {
        if (selectedVehicle && selectedVehicle.id !== vehicle.id) {
            return null;
        }

        let vehicleId = vehicle.id || Math.max(...vehicles.map((v) => v.id));
        let path = []
        if (vehicle.route && vehicle.route.destinations) {
            let position = {lat: vehicle.coordinate.latitude, lng: vehicle.coordinate.longitude}
            vehicle.route.destinations.forEach(async (destination, index) => {
                if (destination && destination.coordinate) {
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

        let overviewThreshold = 8;

        if (vehicle.route) {
            if (vehicle.route.sections && Array.isArray(vehicle.route.sections) && vehicle.route.sections.length > 0 || (vehicle.route.overviewPolyline)) {
                let paths = [];
                let basicPath = false;

                if (zoom <= overviewThreshold && vehicle.route.overviewPolyline || vehicle.route.overviewPolyline && !vehicle.sections) {
                    paths = polyline.decode(vehicle.route.overviewPolyline).map(([lat, lng]) => ({lat, lng}));
                    basicPath = true;

                } else {
                    vehicle.route.sections.forEach((section) => {
                        let sections = polyline.decode(section.polyline).map(([lat, lng]) => ({lat, lng}));
                        paths.push(...sections);
                    });
                }

                paths.unshift({
                    lat: vehicle.coordinate.latitude, lng: vehicle.coordinate.longitude
                });

                path.push(<Polyline key={`${basicPath ? "Simple-Path" : "Path"} ${vehicleId}`} path={paths} options={{
                    strokeColor: getColor(vehicleId - 1),
                    strokeOpacity: basicPath && !(selectedVehicle && selectedVehicle.id === vehicleId) ? 0.5 : 1,
                    strokeWeight: 3
                }} onClick={() => focusVehicle(vehicle)}/>)

            } else if (vehicle.route.destinations && Array.isArray(vehicle.route.destinations) && vehicle.route.destinations.length > 0) {
                path.push(<Polyline key={`Path ${vehicleId}`} path={vehicle.route.destinations.map((destination) => {
                    return {
                        lat: destination.coordinate.latitude, lng: destination.coordinate.longitude
                    }
                })} options={{
                    strokeColor: getColor(vehicleId - 1),
                    strokeWeight: selectedVehicle && selectedVehicle.id === vehicle.id ? 10 : 3
                }} onClick={() => focusVehicle(vehicle)}/>)
            }
        }

        return <Marker key={`Vehicle ${vehicleId}`}
                       label={{
                           text: "\ue558",
                           fontFamily: "Material Icons",
                           color: getColor(vehicleId - 1),
                           fontSize: "18px",
                       }}
                       icon={{
                           url: "", scaledSize: new google.maps.Size(0, 0),
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
            <Sidebar
                vehicles={vehicles}
                currentLocation={currentLocation}
                reRender={reRender}
                vehicleRefs={vehicleRefs}
                setMapPicker={setMapPicker}
                logMessages={logMessages}
                selectedVehicle={selectedVehicle}
                setSelectedVehicle={focusVehicle}
                getColor={getColor}/>

            <div className="map-container">
                <LoadScript googleMapsApiKey={GOOGLE_API_TOKEN}>
                    <GoogleMap
                        mapContainerStyle={{
                            width: '100%', height: '100%'
                        }}
                        options={{
                            disableDefaultUI: true,
                        }}
                        center={center || currentLocation || {lat: 0, lng: 0}}
                        zoom={12}
                        onClick={onClick}
                        clickableIcons={false}
                        onMouseOver={(e) => {
                            setMousePosition({
                                lat: e.latLng.lat(), lng: e.latLng.lng()
                            })
                        }}
                        onZoomChanged={() => {
                            if (mapRef.current) {
                                setZoom(mapRef.current.getZoom())
                            }
                        }}
                        onMouseMove={(e) => {
                            setMousePosition({
                                lat: e.latLng.lat(), lng: e.latLng.lng()
                            })
                        }}
                        onDrag={() => {
                            setFollowedVehicle(null)
                        }}
                        onDragStart={() => {
                            setFollowedVehicle(null)
                        }}

                        onLoad={(map) => {
                            mapRef.current = map;
                        }}
                    >
                        <TrafficLayer key="Traffic"/>

                        {currentLocation ? <Marker key={"current-pos"} position={currentLocation}/> : <></>}
                        {items}
                    </GoogleMap>
                </LoadScript>
            </div>
        </div>);
}

function App() {
    return (<div className="App">
            <MapComponent/>
        </div>)
}

export default App