import React, { useRef, useEffect } from 'react';
import { useLoadScript } from '@react-google-maps/api';
import {GOOGLE_API_TOKEN} from '../App.jsx';

const libraries = ['places'];

const  GoogleMapsAutocomplete = ({onComplete}) => {
    const inputRef = useRef(null);
    const { isLoaded, loadError } = useLoadScript({
        googleMapsApiKey: GOOGLE_API_TOKEN,
        libraries,
    });

    useEffect(() => {
        if (isLoaded) {
            const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current);
            autocomplete.addListener('place_changed', () => {
                onComplete(autocomplete.getPlace());
            });
        }
    }, [isLoaded]);

    if (loadError) {
        return <div>Error loading Google Maps API</div>;
    }

    return (
        <input
            ref={inputRef}
            type="text"
            placeholder="Search for a place"
        />
    );
}

export default GoogleMapsAutocomplete;