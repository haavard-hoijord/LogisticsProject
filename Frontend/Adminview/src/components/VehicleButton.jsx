import React, { useRef, useEffect, useState } from 'react';
import '../assets/VehicleButton.css';

const VehicleButton = ({vehicles, vehicle, index, selectedVehicle, setSelectedVehicle, vehicleRefs, setAddMode, getColor, company}) => {
    let veh = vehicles.find((v) => v.id === vehicle.id);
    let vehicleId = vehicle.id || Math.max(...vehicles.map((v) => v.id));
    return (
    <button
    className={`vehicle-button ${selectedVehicle && vehicle.id === selectedVehicle.id ? 'selected' : ''}`}
    key={`vehicle-btn ${vehicleId}`}
    ref={(el) => vehicleRefs.current[index] = el}
    onClick={() => {
        setAddMode(null)
        if (selectedVehicle && veh.id === selectedVehicle.id) {
            setSelectedVehicle(null);
        } else {
            setSelectedVehicle(veh);
        }
    }}
    >
        <div className="icon-container">
            <img className="icon" alt="companyimage" src={company.image || "https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/Question_mark_%28black%29.svg/800px-Question_mark_%28black%29.svg.png"}/>
            <div className="colored-square" style={{
                backgroundColor: getColor(vehicleId-1)
            }}/>
        </div>

        <div className="text-container">
            <div className="title">Vehicle {vehicleId}</div>
            <div className="sub-text">Status: {veh.destinations.length > 0 && veh.nodes.length > 0 ? (veh.destinations[0]?.isPickup ? `On-route to pickup at ${veh.destinations[0]?.address}` : `Currently delivering to ${veh.destinations[0]?.address}`) : "Idle"}</div>
            {veh.destinations.length > 0 && veh.nodes.length > 0 ?  (<div className="sub-text">Distance: {Math.round(veh.destinations[0]?.distance * 1000) / 1000.0}km</div>) : (<></>)}
            {veh.destinations.length > 0 && veh.nodes.length > 0 ?  (<div className="sub-text">Stops left: {veh.destinations.length}</div>) : (<></>)}
        </div>
    </button>);
}

export default VehicleButton;