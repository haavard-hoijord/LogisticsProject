import React, {useState, memo, useMemo, useEffect} from 'react'
import {
    GoogleMap,
    useJsApiLoader,
    TrafficLayer,
    Polyline,
    Marker,
    InfoWindow,
    Circle,
    DirectionsService,
    DirectionsRenderer,
    Rectangle, CircleF, RectangleF
} from '@react-google-maps/api';

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
    const [mode, setMode] = React.useState("car");
    const [center, setCenter] = React.useState({lat: 0, lng: 0});
    const [vehicles, setVehicles] = React.useState([]);
    const [selectedVehicle, setSelectedVehicle] = React.useState(null);
    const [directions, setDirections] = React.useState({});

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


    const onClick = async (...args) => {
        if(mode === "car") {
            let vehicle =
                {
                    latitude: args[0].latLng.lat(),
                    longitude: args[0].latLng.lng(),
                    company: "Company",
                    destinations: []
                };
            setVehicles([...vehicles, vehicle]);
            setSelectedVehicle(vehicle)
            setMode("path")

            await fetch(`http://localhost:5001/add`, { //http://localhost:${daprPort}/v1.0/invoke/tracker/method/add
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(vehicle)
            });
        } else if(mode === "path" && selectedVehicle) {
            selectedVehicle.destinations.push({item1: args[0].latLng.lat(), item2: args[0].latLng.lng()});
            await fetch(`http://localhost:5001/update`, { //http://localhost:${daprPort}/v1.0/invoke/tracker/method/add
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(selectedVehicle)
            });
            fetchVehicles();
        }
    }

    function fetchVehicles() {
        fetch(`http://localhost:5001/track/all`, {
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

    let desIndex = 0;
    const items = vehicles.map((vehicle, index) => {
        let path = []
        if(vehicle.destinations) {
            let position = {lat: vehicle.latitude, lng: vehicle.longitude}
            for (let destination of vehicle.destinations) {
                let pos = {lat: destination.item1, lng: destination.item2}
                path.push(<Circle key={`Destination ${vehicle.id}-${desIndex++}`} center={pos} options={
                    {
                        fillColor: "red",
                        visible: true,
                        clickable: false,
                    }
                }/>)
                path.push(<Polyline key={`Path ${vehicle.id}-${desIndex++}`} path={[position, pos]}/>)
    /*            path.push(<DirectionsService key={`Direction ${vehicle.id}-${index}`} options={{
                    destination: pos,
                    origin: position,
                    travelMode: window.google.maps.TravelMode.DRIVING
                }} callback={e => {
                    setDirections({...directions, [`${vehicle.id}-${index}`]: ()=> e})
                }
                }/>)
               // path.push(<DirectionsRenderer key={`Path ${vehicle.id}-${index}`} directions={directions[`${vehicle.id}-${index}`]}/>);
     */
                position = pos;
            }
        }
        return <Marker key={`Vehicle ${vehicle.id}`}
                position={{lat: vehicle.latitude, lng: vehicle.longitude}}
                onClick={(e) => {
                    setSelectedVehicle(vehicle)
                }}>
            {path}
        </Marker>
});

    const infoPath = selectedVehicle ?
        <InfoWindow
            position={{lat: selectedVehicle.latitude, lng: selectedVehicle.longitude}}
            onCloseClick={() => setSelectedVehicle(null)}
        >
            <div style={divStyle}>
                <h2>Vehicle {selectedVehicle.id} from {selectedVehicle.company}</h2>
            </div>
        </InfoWindow> : <></>
    const path = selectedVehicle ? <></> : <></>

    return isLoaded ? (
        <div>
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
            <button onClick={e => setMode("car")}>Done</button>
            <button onClick={e => {
                for(let vehicle of vehicles) {
                    fetch(`http://localhost:5001/delete`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(vehicle)
                    });
                }
            }}>Clear</button>
        </div>
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
