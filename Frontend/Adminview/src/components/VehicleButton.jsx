import React, { useRef, useEffect, useState } from 'react';
import '../assets/VehicleButton.css';

const VehicleButton = ({vehicle, index, selectedVehicle, setSelectedVehicle, vehicleRefs, setAddMode, getColor, company}) => {
return (
    <button
    className={`vehicle-button ${selectedVehicle && vehicle.id === selectedVehicle.id ? 'selected' : ''}`}
    key={vehicle.id}
    ref={(el) => vehicleRefs.current[index] = el}
    onClick={() => {
        setAddMode(null)
        if (selectedVehicle && vehicle.id === selectedVehicle.id) {
            setSelectedVehicle(null);
        } else {
            setSelectedVehicle(vehicle);
        }
    }}
    >
        <div className="icon-container">
            <img className="icon" alt="companyimage" src={company.image || "https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/Question_mark_%28black%29.svg/800px-Question_mark_%28black%29.svg.png"}/>
            <div className="colored-square" style={{
                backgroundColor: getColor(index-1)
            }}/>
        </div>

        <div className="text-container">
            <div className="title">Vehicle {vehicle.id}</div>
            <div className="sub-text">Status: {vehicle.destinations.length > 0 && vehicle.nodes.length > 0 ? (vehicle.destinations.first().isPickup ? `On-route to pickup at ${vehicle.destinations.first().address}` : `Currently delivering to ${vehicle.destinations.first().address}`) : "Idle"}</div>
            {vehicle.destinations.length > 0 && vehicle.nodes.length > 0 ?  (<div className="sub-text">Distance: {Math.round(vehicle.destinations.first().distance * 1000) / 1000.0}km left</div>) : (<></>)}
            {vehicle.destinations.length > 0 && vehicle.nodes.length > 0 ?  (<div className="sub-text">Stops left of route: {vehicle.destinations.length}</div>) : (<></>)}
        </div>
    </button>);
}

export default VehicleButton;