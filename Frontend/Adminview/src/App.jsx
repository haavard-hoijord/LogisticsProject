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
import { throttle } from 'lodash';
import './App.css'


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
    const [response, setResponse] = useState({});
    const [load, setLoad] = useState(50);

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
                    load: 0,
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
        } else if(mode === "path") {
            await fetch(`http://localhost:5002/add`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'size': load
                },
                body: JSON.stringify({
                    latitude: args[0].latLng.lat(),
                    longitude: args[0].latLng.lng(),
                })
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
    }

    useEffect(() => {
        fetchVehicles()
        const interval = setInterval(() => {
            fetchVehicles();
        }, 10 * 1000);
        return () => clearInterval(interval);
    }, []);

    const directionsCallback = (result, status, id) => {
        if (status === google.maps.DirectionsStatus.OK) {
            setResponse({...response, [id]: result});
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
                callback={(e1, e2) => directionsCallback(e1, e2, route.id)}
            />
        );
    };

    let paths = []
    const items = vehicles.map((vehicle, index) => {
        let path = []
        if(vehicle.destinations) {
            let position = {lat: vehicle.latitude, lng: vehicle.longitude}
            vehicle.destinations.forEach((destination, index) => {
                let pos = {lat: destination.Latitude, lng: destination.Longitude}
                path.push(<Circle key={`Destination ${vehicle.id}-${index}`} center={pos} options={
                    {
                        fillColor: "cyan",
                        visible: true,
                        clickable: false,
                        radius: 5,
                        zIndex: 1
                    }
                }/>)
                paths.push({start: position, end: pos, id: `${vehicle.id}-${index}`})
                path.push(<Polyline key={`Path ${vehicle.id}-${index}`} path={[position, pos]} />)
                position = pos;
            });
        }

        {paths.map((route) => {
            if(!response[route.id]){
                calculateAndDisplayRoute(route)
            }
        })}

        {response && Object.values(response).map((res, index) => (
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
                <Marker position={center}/>
                {items}
                {path}
            </GoogleMap>
            <button onClick={e => {
                setMode(mode === "car" ? "path" : "car")
                setLoad(mode === "car" ? 50 : 5)
            }}>{mode === "car" ? "Add Car" : "Add Path"}</button>
            <br/>

            <input className="cart_amount" type="number" value={load} placeholder="Load" required onChange={(e) => {
                setLoad(e.target.value)
            }}/>
            <br/>

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