import React, {useState, memo, useMemo, useEffect} from 'react'
import { GoogleMap, useJsApiLoader, TrafficLayer, Polyline, Marker, InfoWindow} from '@react-google-maps/api';

import './App.css'

const containerStyle = {
  width: '600px',
  height: '600px'
};

const divStyle = {
    background: `white`,
    border: `1px solid #ccc`,
    padding: 15
}

function MapComponent() {
    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: "AIzaSyD1P03JV4_NsRfuYzsvJOW5ke_tYCu6Wh0"
    })
    const [map, setMap] = React.useState(null)
    const [center, setCenter] = React.useState({lat: 0, lng: 0});
    const [vehicles, setVehicles] = React.useState([]);
    const [selectedVehicle, setSelectedVehicle] = React.useState(null);

    const onLoad = React.useCallback(function callback(map) {
        navigator.geolocation.getCurrentPosition(function(position) {
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


    const onClick = (...args) => {
        setSelectedVehicle(null)
    }

    function fetchVehicles() {
        fetch('http://localhost:5001/track/all', {
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

    const items = vehicles.map((vehicle, index) => {
        return <Marker key={`Vehicle ${vehicle.id}`}
                       position={{lat: vehicle.latitude, lng: vehicle.longitude}}
                       onClick={(e) => {
                           setSelectedVehicle(vehicle)
                       }}
        />
    })

    const infoPath = selectedVehicle ?
        <InfoWindow
            position={{lat: selectedVehicle.latitude, lng: selectedVehicle.longitude}}
            onCloseClick={() => setSelectedVehicle(null)}
        >
        <div style={divStyle}>
            <h1>Delivery from {""}</h1>
        </div>
    </InfoWindow> : <></>
    const path = selectedVehicle ? <></> : <></>

    return isLoaded ? (
        <GoogleMap
            mapContainerStyle={containerStyle}
            center={center}
            zoom={2}
            onLoad={onLoad}
            onClick={onClick}
            onUnmount={onUnmount}
        >
            <TrafficLayer/>
            {infoPath}
            <Marker position={center}/>
            {items}
            {path}
        </GoogleMap>
    ) : <></>;
}

function App() {
  return (
    <div className="App">
        <MapComponent />
    </div>
  )
}

export default App
