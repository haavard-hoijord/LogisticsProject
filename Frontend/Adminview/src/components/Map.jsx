import React, { useRef, useEffect, useState } from 'react';
import '../assets/Map.css';

const css3Colors = [
    'aqua', 'black', 'blue', 'fuchsia', 'gray', 'green', 'lime', 'maroon', 'navy',
    'olive', 'orange', 'purple', 'red', 'teal', 'yellow',
];

function getColor(num) {
    return css3Colors[num % css3Colors.length];
}

const Map = ({vehicles}) => {

}

export default Map;