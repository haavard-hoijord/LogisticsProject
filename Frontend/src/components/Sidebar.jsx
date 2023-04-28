import React, {useEffect, useRef, useState} from 'react';
import '../assets/Sidebar.css';
import VehicleButton from "./VehicleButton.jsx";
import GoogleMapsAutocomplete from "./GoogleMapsAutocomplete.jsx";
import {DAPR_URL} from "../App.jsx";

const Sidebar = ({
                     vehicles,
                     selectedVehicle,
                     setSelectedVehicle,
                     getColor,
                     vehicleRefs,
                     setMapPicker,
                     reRender,
                     currentLocation
                 }) => {
    const [simSpeed, setSimSpeed] = useState(1.00);

    const [addMode, setAddMode] = useState(null);

    const [mapModes, setMapModes] = useState([]);
    const [companies, setCompanies] = useState([]);

    const [pickupPoint, setPickupPoint] = useState({});
    const [deliveryPoint, setDeliveryPoint] = useState({});
    const [vehiclePoint, setVehiclePoint] = useState({});

    const [randomVehicles, setRandomVehicles] = useState(1);
    const [randomDeliveries, setRandomDeliveries] = useState(1);

    const [closedCompanies, setClosedCompanies] = useState({});

    const [simServiceOnline, setSimServiceOnline] = useState(false);

    useEffect(() => {
        fetch(`${DAPR_URL}/v1.0/invoke/backend/method/companies`, {
            method: 'GET', headers: {
                'Content-Type': 'application/json'
            }
        })
            .then(response => response.json())
            .then(data => {
                setCompanies([...data])
            });

        fetch(`${DAPR_URL}/v1.0/invoke/DeliveryPlanner/method/mapmodes`, {
            method: 'GET', headers: {
                'Content-Type': 'application/json'
            }
        })
            .then(response => response.json())
            .then(data => {
                setMapModes([...data])
            });

        fetch(`${DAPR_URL}/v1.0/invoke/simulation/method/health`, {
            method: 'GET', headers: {
                'Content-Type': 'application/json'
            }
        })
            .then(response=> {
                if(response.ok){
                    setSimServiceOnline(true);

                    fetch(`${DAPR_URL}/v1.0/invoke/simulation/method/simulation/speed`, {
                        method: 'GET', headers: {
                            'Content-Type': 'application/json'
                        }
                    })
                        .then(response => response.json())
                        .then(data => {
                            setSimSpeed(data)
                        });
                }
            });
    }, []);


    useEffect(() => {
        if(selectedVehicle){
            if(closedCompanies[selectedVehicle.company]){
                setClosedCompanies({...closedCompanies, [selectedVehicle.company]: false})
            }
        }
    }, [selectedVehicle]);

    let veh = vehicles.find((v) => v.id === selectedVehicle?.id)
    let routes = [];
    if (veh) {
        veh.destinations.forEach((dest, index) => {
            if (dest) {
                if (routes.length > 0 && routes[routes.length - 1][0].routeId === dest.routeId) {
                    routes[routes.length - 1].push(dest);
                } else {
                    routes.push([dest]);
                }
            }
        });
    }


    async function postSimSpeed(e) {
        await fetch(`${DAPR_URL}/v1.0/invoke/simulation/method/simulation/speed`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(e)
        });
    }

    return (<div className={`sidebar ${(selectedVehicle || addMode) ? "sidebar-wide" : ""}`}>
        <div className="sidebar-top">
            <div className="sidebar-top-vehicles" style={{
                width: `${selectedVehicle || addMode ? "50%" : "100%"}`
            }}>
                <div className="sidebar-buttons">
                    <button className="new-vehicle"
                            onClick={() => {
                                setSelectedVehicle(null);
                                if (addMode === "vehicle") {
                                    setAddMode(null);
                                } else {
                                    setAddMode("vehicle")
                                }
                            }}>
                        Add Vehicle
                    </button>
                    <button className="new-delivery"
                            onClick={() => {
                                setSelectedVehicle(null);
                                if (addMode === "delivery") {
                                    setAddMode(null);
                                } else {
                                    setAddMode("delivery")
                                }
                            }}>
                        Add Delivery
                    </button>

                    {simServiceOnline ? (
                    <button className="new-simulate"
                            onClick={() => {
                                setSelectedVehicle(null);
                                if (addMode === "simulate") {
                                    setAddMode(null);
                                } else {
                                    setAddMode("simulate")
                                }
                            }}>
                        Add Randoms
                    </button>
                    ) : (<> </>)}

                    <br/>
                    {simServiceOnline ? [0, 1, 2, 5, 10, 50, 100].map((speed) => {
                        return (<button key={`sim-speed${speed}`}
                                        className={`sim-speed ${simSpeed === speed ? "selected" : ""}`} onClick={() => {
                            setSimSpeed(speed);
                            postSimSpeed(speed);
                        }}>
                            {speed}x
                        </button>)
                    }) : (<> </>)}
                </div>
                <div className="sidebar-companies">
                    {companies.filter(e => vehicles.filter(e1 => e1.company === e.id).length > 0).map((company, index) => (
                        <div className={`company ${closedCompanies[company] ? "closed" : ""}`} key={company.id} onClick={() => {
                            let temp = closedCompanies;
                            temp[company.id] = !temp[company.id];
                            setClosedCompanies({...temp});
                        }}>
                            <p>{company.name}</p>
                            {!closedCompanies[company.id] ? (
                            <div className="vehicle-buttons">
                                {vehicles.filter(e => e.company === company.id).map((vehicle, index) => (
                                    <VehicleButton key={`vehicle ${vehicle.id}`} vehicle={vehicle} vehicles={vehicles}
                                                   company={company} index={index}
                                                   setAddMode={setAddMode} vehicleRefs={vehicleRefs}
                                                   selectedVehicle={selectedVehicle}
                                                   setSelectedVehicle={setSelectedVehicle} getColor={getColor}/>))}
                            </div>) : (<></>)}
                        </div>))}
                </div>
            </div>

            {addMode || selectedVehicle ? (<div className="sidebar-top-info">
                {selectedVehicle ?
                    (<div className="vehicle-view">
                        <div className="title">Vehicle {selectedVehicle.id}</div>
                        <div
                            className="sub-title">Capacity: {selectedVehicle.maxLoad -
                            (selectedVehicle.destinations.filter(s => s && !s.isPickup).map(s => s.load).reduce((a1, a2) => a1 + a2, 0) - selectedVehicle.destinations.filter(s => s && s.isPickup).map(s => s.load).reduce((a1, a2) => a1 + a2, 0))}</div>
                        {routes.map((rt, index) => {
                            return (
                                <div>
                                    <div key={`route ${index}`} className="route">
                                        <div className="route-index">Route {routes[index][0].routeId}</div>
                                        <div className="route-destinations">
                                            {routes[index].map((dest, index1) => {
                                                return (
                                                    <div key={`destination-${index}-${index1}`} className="destination">
                                                        <div
                                                            className="destination-type">{dest.isPickup ? "Pickup" : "Deliver"}</div>
                                                        <div className="destination-title">{dest.address}</div>
                                                        <div className="destination-load">Load: {dest.load}</div>
                                                        <div
                                                            className="destination-distance">Distance: {Math.round(dest.distance * 1000) / 1000.0}km
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                    {index !== routes.length - 1 && (<div className="destination-arrow">
                                        <div className="destination-arrow-line"/>
                                        <div className="destination-arrow-head"/>
                                    </div>)}
                                </div>
                            )
                        })}
                    </div>) : (<> </>)}

                {addMode ?
                    addMode === "vehicle" ?
                        (
                            <div className="add-vehicle-view">
                                <div className="title">Add Vehicle</div>

                                <div className="vehicle-points">
                                    <div className="input-container">
                                        <label className="label">Destination type</label>
                                        <select value={vehiclePoint?.type || "address"} onChange={(e) => {
                                            setVehiclePoint(prevState => ({...prevState, type: e.target.value}))
                                        }}>
                                            <option key="o1" value="address">Address</option>
                                            <option key="o2" value="cords">Coordinates</option>
                                        </select>
                                    </div>

                                    <div className="input">
                                        {vehiclePoint?.type === "cords" ?
                                            (
                                                <div>
                                                    <div className="input-container">
                                                        <label className="label">Latitude</label>
                                                        <input type="number"
                                                               value={vehiclePoint?.coordinate?.latitude || 0}
                                                               onChange={e => {
                                                                   setVehiclePoint(prevState => ({
                                                                       ...prevState,
                                                                       coordinate: {
                                                                           ...prevState?.coordinate || {},
                                                                           latitude: e.target.value
                                                                       }
                                                                   }))
                                                               }} required/>
                                                    </div>
                                                    <div className="input-container">
                                                        <label className="label">Longitude</label>
                                                        <input type="number"
                                                               value={vehiclePoint?.coordinate?.longitude || 0}
                                                               onChange={e => {
                                                                   setVehiclePoint(prevState => ({
                                                                       ...prevState,
                                                                       coordinate: {
                                                                           ...prevState?.coordinate || {},
                                                                           longitude: e.target.value
                                                                       }
                                                                   }))
                                                               }} required/>
                                                    </div>

                                                    <div className="input-container">
                                                        <button className="pick-coords" onClick={() => {
                                                            setMapPicker(() => {
                                                                return (lat, lng) => {
                                                                    setVehiclePoint(prevState => ({
                                                                        ...prevState,
                                                                        coordinate: {
                                                                            ...prevState?.coordinate || {},
                                                                            latitude: lat,
                                                                            longitude: lng
                                                                        }
                                                                    }))
                                                                }
                                                            });
                                                        }}>Pick from map
                                                        </button>
                                                    </div>
                                                </div>
                                            )
                                            :
                                            (
                                                <div className="input-container">
                                                    <label className="label">Address: </label>
                                                    <GoogleMapsAutocomplete
                                                        onComplete={(e) => setVehiclePoint(prevState => ({
                                                            ...prevState,
                                                            address: e.formatted_address,
                                                            type: "address"
                                                        }))}/>
                                                </div>
                                            )
                                        }
                                    </div>

                                    <div className="input-container">
                                        <label className="label">Max size</label>
                                        <input type="number" min="1" value={vehiclePoint?.size || 50}
                                               onChange={e => {
                                                   setVehiclePoint(prevState => ({
                                                       ...prevState,
                                                       size: e.target.value
                                                   }))
                                               }} required/>
                                    </div>

                                    <div className="input-container">
                                        <label className="label">Company</label>
                                        <select value={vehiclePoint?.company || undefined}
                                                onChange={(e) =>
                                                    setVehiclePoint(prevState => ({
                                                        ...prevState,
                                                        company: e.target.value
                                                    }))}>
                                            {companies.map((mode) => {
                                                return <option key={mode.id} value={mode.id}>{mode.name}</option>
                                            })}
                                        </select>
                                    </div>


                                    <div className="input-container">
                                        <label className="label">Map service</label>
                                        <select value={vehiclePoint?.mapMode?.toLowerCase() || undefined}
                                                onChange={(e) =>
                                                    setVehiclePoint(prevState => ({
                                                        ...prevState,
                                                        mapMode: e.target.value
                                                    }))}>
                                            {mapModes.map((mode) => {
                                                return <option key={mode}
                                                               value={mode.toLowerCase()}>{mode.charAt(0).toUpperCase() + mode.slice(1)}</option>
                                            })}
                                        </select>
                                    </div>
                                </div>

                                <button className="add-vehicle-button" disabled={!vehiclePoint}
                                        onClick={() => {
                                            fetch(`${DAPR_URL}/v1.0/invoke/Data/method/add`, {
                                                method: 'POST', headers: {
                                                    'Content-Type': 'application/json'
                                                },
                                                body: JSON.stringify({
                                                    company: vehiclePoint.company || companies[0].id,
                                                    mapService: vehiclePoint.mapMode || mapModes[0],
                                                    maxLoad: vehiclePoint.size || 50,
                                                    coordinate: vehiclePoint.coordinate,
                                                    sections: [],
                                                    destinations: [],
                                                })
                                            }).then((e) => {
                                                setPickupPoint({});
                                                setDeliveryPoint({});
                                                setAddMode(null);
                                                reRender()
                                            });
                                        }}>Add Vehicle
                                </button>
                            </div>
                        )
                        :
                        addMode === "delivery" ? (
                                <div className="add-delivery-view">
                                    <div className="title">Add Delivery</div>
                                    <div className="sub-title">Pickup points</div>

                                    <div className="pickup-points">
                                        <div className="input-container">
                                            <label className="label">Destination type</label>
                                            <select value={pickupPoint?.type || "address"} onChange={(e) => {
                                                setPickupPoint(prevState => ({...prevState, type: e.target.value}))
                                            }}>
                                                <option key="o1" value="address">Address</option>
                                                <option key="o2" value="cords">Coordinates</option>
                                            </select>
                                        </div>

                                        <div className="input">
                                            {pickupPoint?.type === "cords" ?
                                                (
                                                    <div>
                                                        <div className="input-container">
                                                            <label className="label">Latitude</label>
                                                            <input type="number"
                                                                   value={pickupPoint?.coordinate?.latitude || 0}
                                                                   onChange={e => {
                                                                       setPickupPoint(prevState => ({
                                                                           ...prevState,
                                                                           coordinate: {
                                                                               ...prevState?.coordinate || {},
                                                                               latitude: e.target.value
                                                                           }
                                                                       }))
                                                                   }} required/>
                                                        </div>
                                                        <div className="input-container">
                                                            <label className="label">Longitude</label>
                                                            <input type="number"
                                                                   value={pickupPoint?.coordinate?.longitude || 0}
                                                                   onChange={e => {
                                                                       setPickupPoint(prevState => ({
                                                                           ...prevState,
                                                                           coordinate: {
                                                                               ...prevState?.coordinate || {},
                                                                               longitude: e.target.value
                                                                           }
                                                                       }))
                                                                   }} required/>
                                                        </div>

                                                        <div className="input-container">
                                                            <button className="pick-coords" onClick={() => {
                                                                setMapPicker(() => {
                                                                    return (lat, lng) => {
                                                                        setPickupPoint(prevState => ({
                                                                            ...prevState,
                                                                            coordinate: {
                                                                                ...prevState?.coordinate || {},
                                                                                latitude: lat,
                                                                                longitude: lng
                                                                            }
                                                                        }))
                                                                    }
                                                                });
                                                            }}>Pick from map
                                                            </button>
                                                        </div>
                                                    </div>
                                                )
                                                :
                                                (
                                                    <div className="input-container">
                                                        <label className="label">Address: </label>
                                                        <GoogleMapsAutocomplete
                                                            onComplete={(e) => setPickupPoint(prevState => ({
                                                                ...prevState,
                                                                address: e.formatted_address,
                                                                type: "address"
                                                            }))}
                                                            onChange={(e) => {
                                                                setPickupPoint(prevState => ({
                                                                    ...prevState,
                                                                    address: e,
                                                                    type: "address"
                                                                }))
                                                            }}/>
                                                    </div>
                                                )
                                            }
                                        </div>

                                        <div className="input-container">
                                            <label className="label">Load size</label>
                                            <input type="number" min="1" value={pickupPoint?.size || 1}
                                                   onChange={e => {
                                                       setPickupPoint(prevState => ({...prevState, size: e.target.value}))
                                                   }} required/>
                                        </div>
                                    </div>

                                    <div className="sub-title">Dropoff points</div>
                                    <div className="dropoff-points">
                                        <div className="input-container">
                                            <label className="label">Destination type</label>
                                            <select value={deliveryPoint?.type || "address"} onChange={(e) => {
                                                setDeliveryPoint(prevState => ({...prevState, type: e.target.value}))
                                            }}>
                                                <option key="o1" value="address">Address</option>
                                                <option key="o2" value="cords">Coordinates</option>
                                            </select>
                                        </div>

                                        <div className="input">
                                            {deliveryPoint?.type === "cords" ?
                                                (
                                                    <div>
                                                        <div className="input-container">
                                                            <label className="label">Latitude</label>
                                                            <input type="number"
                                                                   value={deliveryPoint?.coordinate?.latitude || 0}
                                                                   onChange={e => {
                                                                       setDeliveryPoint(prevState => ({
                                                                           ...prevState,
                                                                           coordinate: {
                                                                               ...prevState?.coordinate || {},
                                                                               latitude: e.target.value
                                                                           }
                                                                       }))
                                                                   }} required/>
                                                        </div>
                                                        <div className="input-container">
                                                            <label className="label">Longitude</label>
                                                            <input type="number"
                                                                   value={deliveryPoint?.coordinate?.longitude || 0}
                                                                   onChange={e => {
                                                                       setDeliveryPoint(prevState => ({
                                                                           ...prevState,
                                                                           coordinate: {
                                                                               ...prevState?.coordinate || {},
                                                                               longitude: e.target.value
                                                                           }
                                                                       }))
                                                                   }} required/>
                                                        </div>

                                                        <div className="input-container">
                                                            <button className="pick-coords" onClick={() => {
                                                                setMapPicker(() => {
                                                                    return (lat, lng) => {
                                                                        setDeliveryPoint(prevState => ({
                                                                            ...prevState,
                                                                            coordinate: {
                                                                                ...prevState?.coordinate || {},
                                                                                latitude: lat,
                                                                                longitude: lng
                                                                            }
                                                                        }))
                                                                    }
                                                                });
                                                            }}>Pick from map
                                                            </button>
                                                        </div>
                                                    </div>
                                                )
                                                :
                                                (
                                                    <div className="input-container">
                                                        <label className="label">Address: </label>
                                                        <GoogleMapsAutocomplete
                                                            onComplete={(e) => setDeliveryPoint(prevState => ({
                                                                ...prevState,
                                                                address: e.formatted_address,
                                                                type: "address"
                                                            }))}
                                                            onChange={(e) => {
                                                                setDeliveryPoint(prevState => ({
                                                                    ...prevState,
                                                                    address: e,
                                                                    type: "address"
                                                                }))
                                                            }}/>
                                                    </div>
                                                )
                                            }

                                            <div className="input-container">
                                                <label className="label">Load size</label>
                                                <input type="number" min="1" value={deliveryPoint?.size || 1}
                                                       onChange={e => {
                                                           setDeliveryPoint(prevState => ({
                                                               ...prevState,
                                                               size: e.target.value
                                                           }))
                                                       }} required/>
                                            </div>
                                        </div>
                                    </div>


                                    <button className="add-delivery-button" disabled={!pickupPoint || !deliveryPoint}
                                            onClick={() => {
                                                fetch(`${DAPR_URL}/v1.0/invoke/DeliveryPlanner/method/add`, {
                                                    method: 'POST', headers: {
                                                        'Content-Type': 'application/json'
                                                    },
                                                    body: JSON.stringify({
                                                        pickup: {
                                                            ...pickupPoint,
                                                            size: pickupPoint.size || 1
                                                        },
                                                        dropoff: {
                                                            ...deliveryPoint,
                                                            size: deliveryPoint.size || 1
                                                        }
                                                    })
                                                }).then((e) => {
                                                    setPickupPoint({});
                                                    setDeliveryPoint({});
                                                    setAddMode(null);
                                                    reRender();
                                                });
                                            }}>Add Delivery
                                    </button>
                                </div>
                            )
                            : addMode != null ?
                            (
                                <div className="add-randoms-view">
                                    <div className="title">Add Randoms</div>

                                    <div className="sub-title">Add Vehicles</div>
                                    <div className="input">
                                        <div className="input-container">
                                            <label className="label">Amount of Vehicles</label>
                                            <input type="number" min="1" value={randomVehicles}
                                                   onChange={e => {
                                                       setRandomVehicles(e.target.value);
                                                   }} required/>
                                        </div>

                                        <button className="add-random-vehicle-button"
                                                onClick={async () => {
                                                    //TODO Set is adding loading icon
                                                    await fetch(`${DAPR_URL}/v1.0/invoke/simulation/method/random/vehicle`, {
                                                        method: 'POST',
                                                        headers: {
                                                            'Content-Type': 'application/json'
                                                        },
                                                        body: JSON.stringify({
                                                            amount: randomVehicles,
                                                            location: {
                                                                latitude: currentLocation.lat,
                                                                longitude: currentLocation.lng
                                                            }
                                                        })
                                                    });
                                                    //TODO Remove loading icon again
                                                    reRender();

                                                }}>
                                            Add Random Vehicles
                                        </button>
                                    </div>


                                    <div className="sub-title">Add Deliveries</div>
                                    <div className="input">
                                        <div className="input-container">
                                            <label className="label">Amount of Deliveries</label>
                                            <input type="number" min="1" value={randomDeliveries}
                                                   onChange={e => {
                                                       setRandomDeliveries(e.target.value);
                                                   }} required/>
                                        </div>

                                        <button className="add-random-delivery-button" onClick={async () => {
                                            await fetch(`${DAPR_URL}/v1.0/invoke/simulation/method/random/delivery`, {
                                                method: 'POST',
                                                headers: {
                                                    'Content-Type': 'application/json'
                                                },
                                                body: JSON.stringify({
                                                    amount: randomDeliveries,
                                                    location: {
                                                        latitude: currentLocation.lat,
                                                        longitude: currentLocation.lng
                                                    }
                                                })
                                            });
                                            reRender();
                                        }}>
                                            Add Random Deliveries
                                        </button>
                                    </div>
                                </div>
                            )
                                : (<> </>)
                    : (<> </>)}

            </div>) : (<></>)}
        </div>
    </div>);
};

export default Sidebar;