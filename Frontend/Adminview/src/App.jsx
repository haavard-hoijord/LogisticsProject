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
import { throttle } from 'lodash';
import './App.css'

const containerStyle = {
    width: '100%',
    height: '900px'
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
    const [error, setError] = React.useState("");

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

    async function fetchVehicles() {
        await fetch(`http://localhost:5001/track/all`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        })
            .then(response => response.json())
            .then(data => setVehicles([...data]));

        //calculate routes only when it updates new vechiles instead of each render
    }

    useEffect(() => {
        fetchVehicles()
        const interval = setInterval(() => {
            fetchVehicles();
        }, 10 * 1000);
        return () => clearInterval(interval);
    }, []);

    const [response, setResponse] = useState([]);

    const directionsCallback = (result, status) => {
        if (status === google.maps.DirectionsStatus.OK) {
            setResponse((prevResponse) => [...prevResponse, result]);
            setError(null);
        } else {
            setError('Directions request failed due to ' + status);
            setResponse([]);
        }
    };

    const calculateAndDisplayRoute = (route) => {
        const directionsServiceOptions = {
            origin: route.start,
            destination: route.end,
            travelMode: google.maps.TravelMode.DRIVING,
        };

        return (
            <DirectionsService
                key={`directions_service_${route.id}`}
                options={directionsServiceOptions}
                callback={directionsCallback}
            />
        );
    };


    let paths = []
    const items = vehicles.map((vehicle, index) => {
        let path = []
        if(vehicle.destinations) {
            let position = {lat: vehicle.latitude, lng: vehicle.longitude}
            vehicle.destinations.forEach((destination, index) => {
                let pos = {lat: destination.item1, lng: destination.item2}
                path.push(<Circle key={`Destination ${vehicle.id}-${index}`} center={pos} options={
                    {
                        fillColor: "cyan",
                        visible: true,
                        clickable: false,
                        radius: 100,
                        zIndex: 1
                    }
                }/>)
                //path.push(<Polyline key={`Path ${vehicle.id}-${index}`} path={[position, pos]}/>)
                paths.push({start: position, end: pos, id: `${vehicle.id}-${index}`})
                position = pos;
            });
        }
        {paths.map((route) => calculateAndDisplayRoute(route))}
        {response && response.map((res, index) => (
            <DirectionsRenderer key={`directions_renderer_${index}`} directions={res} />
        ))}

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
            <p className="error">{error}</p>
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
