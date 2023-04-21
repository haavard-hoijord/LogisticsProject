import React, {useEffect, useRef, useState} from 'react';
import '../assets/Sidebar.css';
import Chatlog from "./Chatlog.jsx";
import VehicleButton from "./VehicleButton.jsx";

const DAPR_URL = `http://localhost:5000/dapr`;

const Sidebar = ({vehicles, selectedVehicle, setSelectedVehicle, logMessages, getColor, vehicleRefs}) => {
    const topSectionRef = useRef(null);
    const [isResizing, setIsResizing] = useState(false);

    const [simSpeed, setSimSpeed] = useState(1.00);

    const [addMode, setAddMode] = useState(null);

    const [mapModes, setMapModes] = useState([]);
    const [mapMode, setMapMode] = useState(null);

    const [companies, setCompanies] = useState([]);
    const [company, setCompany] = useState(null);

    const [pickupPoints, setPickupPoints] = useState([]);
    const [deliveryPoints, setDeliveryPoints] = useState([]);

    useEffect(() => {
        fetch(`${DAPR_URL}/v1.0/invoke/backend/method/companies`, {
            method: 'GET', headers: {
                'Content-Type': 'application/json'
            }
        })
            .then(response => response.json())
            .then(data => {
                setCompanies([...data])
                if (company === null && data.length > 0) {
                    setCompany(data[0]);
                }
            });

        fetch(`${DAPR_URL}/v1.0/invoke/planner/method/mapmodes`, {
            method: 'GET', headers: {
                'Content-Type': 'application/json'
            }
        })
            .then(response => response.json())
            .then(data => {
                setMapModes([...data])
                if (mapMode === null && data.length > 0) {
                    setMapMode(data[0]);
                }
            });

        fetch(`${DAPR_URL}/v1.0/invoke/backend/method/simulation/speed`, {
            method: 'GET', headers: {
                'Content-Type': 'application/json'
            }
        })
            .then(response => response.json())
            .then(data => {
                setSimSpeed(data)
            });
    }, []);

    //Resize handling
    React.useEffect(() => {
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing]);

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

    React.useEffect(() => {
        if (sessionStorage.getItem('topSectionHeight')) {
            topSectionRef.current.style.height = `${sessionStorage.getItem('topSectionHeight')}px`;
        }
    }, []);

    return (<div className={`sidebar ${(selectedVehicle || addMode) ? "sidebar-wide" : ""}`}>
            <div className="sidebar-top" ref={topSectionRef}>
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
                    </div>
                    <div className="sidebar-companies">
                        {companies.filter(e => vehicles.filter(e1 => e1.company === e.id || true).length > 0).map((company, index) => (
                            <div className="company" key={company}>
                                <p>{company.name}</p>
                                <div className="vehicle-buttons">
                                    {vehicles.filter(e => e.company === company).map((vehicle, index) => (<VehicleButton vehicle={vehicle} company={company} index={index} setAddMode={setAddMode} vehicleRefs={vehicleRefs} selectedVehicle={selectedVehicle} setSelectedVehicle={setSelectedVehicle} getColor={getColor}/>))}
                                </div>
                            </div>))}
                    </div>
                </div>

                {addMode || selectedVehicle ? (<div className="sidebar-top-info">
                    {selectedVehicle ?
                        (<div className="vehicle-view">
                            <p>Vehicle: {selectedVehicle.id}</p>
                        </div>) : (<> </>)}

                    {addMode ?
                        addMode === "vehicle" ?
                            (
                            <div className="add-vehicle-view">
                                <p>Add Vehicle</p>
                            </div>
                            )
                            :
                            (
                            <div className="add-delivery-view">
                                <div className="title">Add Delivery</div>

                                <div className="sub-title">Pickup points</div>
                                <div className="pickup-points">
                                    {pickupPoints.map((point, index) => (
                                        <div className="pickup-point" key={index}>
                                            <div className="input-container">
                                                <label className="label" >Address: </label>
                                                <input type="text" min="1" value={point.address} onChange={e => {
                                                    const newPoints = [...pickupPoints];
                                                    newPoints[index].address = e.target.value;
                                                    setPickupPoints(newPoints);
                                                }} required/>
                                            </div>
                                            <div className="input-container">
                                                <label className="label">Load size</label>
                                                <input type="number" min="1" value={point.size}
                                                       onChange={e => {
                                                              const newPoints = [...pickupPoints];
                                                              newPoints[index].size = e.target.value;
                                                              setPickupPoints(newPoints);
                                                       }} required/>
                                            </div>

                                            <div className="input-container">
                                                <button className="remove-pickup-point" onClick={() => {
                                                    const newPoints = [...pickupPoints];
                                                    newPoints.splice(index, 1);
                                                    setPickupPoints(newPoints);
                                                }}>Remove</button>
                                            </div>
                                        </div>
                                        ))}

                                    <button className="add-pickup-point" onClick={() => {
                                        setPickupPoints([...pickupPoints, {address: "Stavanger", size: 5}])
                                    }}>Add pickup point</button>
                                </div>

                                <div className="sub-title">Dropoff points</div>
                                <div className="dropoff-points">
                                </div>
                            </div>
                            )
                        : (<> </>)}

                </div>) : (<></>)}
            </div>

            <div className="sidebar-divider" onMouseDown={handleMouseDown}/>

            <div className="sidebar-bottom">
                <Chatlog messages={logMessages}/>
            </div>
        </div>);
};

export default Sidebar;
