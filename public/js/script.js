'use strict';

let dotSize = 100;
let panningSpeed = 0.7;
let allClicks = [];

// implementation of CustomLayerInterface to draw a pulsing dot icon on the map
// see https://docs.mapbox.com/mapbox-gl-js/api/#customlayerinterface for more info
let pulsingDot = {
    width: dotSize,
    height: dotSize,
    data: new Uint8Array(dotSize * dotSize * 4),

    // get rendering context for the map canvas when layer is added to the map
    onAdd: function() {
        let canvas = document.createElement('canvas');
        canvas.width = this.width;
        canvas.height = this.height;
        this.context = canvas.getContext('2d');
    },

    // called once before every frame where the icon will be used
    render: function() {
        let duration = 1500;
        let t = (performance.now() % duration) / duration;

        let radius = (dotSize / 2) * 0.3;
        let outerRadius = (dotSize / 2) * 0.7 * t + radius;
        let context = this.context;

        // draw outer circle
        context.clearRect(0, 0, this.width, this.height);
        context.beginPath();
        context.arc(
            this.width / 2,
            this.height / 2,
            outerRadius,
            0,
            Math.PI * 2
        );
        context.fillStyle = 'rgba(255, 200, 200,' + (1 - t) + ')';
        context.fill();

        // draw inner circle
        context.beginPath();
        context.arc(
            this.width / 2,
            this.height / 2,
            radius,
            0,
            Math.PI * 2
        );
        context.fillStyle = 'rgba(255, 100, 100, 1)';
        context.strokeStyle = 'white';
        context.lineWidth = 2 + 4 * Math.max(0, 1 - 5*t);
        context.fill();
        context.stroke();

        // update this image's data with data from the canvas
        this.data = context.getImageData(
            0,
            0,
            this.width,
            this.height
        ).data;

        // update debug text
        let debugPane = document.getElementById('debugPane');
        if (debugPane)
        debugPane.textContent = 'Debug info: ' +
                                '\nzoom = ' + map.getZoom().toFixed(2) +
                                ';\ncentre = ' + map.getCenter().toString()

        // continuously repaint the map, resulting in the smooth animation of the dot
        map.triggerRepaint();

        // return `true` to let the map know that the image was updated
        return true;
    }
}

function MoveTo(coordinates)
{
    // Handle any number of points
    function getLon(coord){
        return coord.map(d => Array.isArray(d)? d[0] : d.lon);
    }
    function getLat(coord){
        return coord.map(d => Array.isArray(d)? d[1] : d.lat);
    }
    function getMinY(){
        return Math.min(...getYs());
    }
    function getMaxY(){
        return Math.max(...getYs());
    }
    const minLon = Math.min(...getLon(coordinates));
    const maxLon = Math.max(...getLon(coordinates));
    const minLat = Math.min(...getLat(coordinates));
    const maxLat = Math.max(...getLat(coordinates));
    const averageLonLat = [
        (minLon + maxLon)/2,
        (minLat + maxLat)/2
    ];

    // Fixed zoom if there is only one point
    if (coordinates.length === 1)
    {
        const zoomLevel = 5;
        map.flyTo({
            center: averageLonLat,
            zoom: zoomLevel,
            speed: panningSpeed,
            curve: 0.7,
            easing(t) {return Math.sin(t * Math.PI / 2);},
            essential: true
        });
    }
    else
    {
        map.fitBounds(
            [[minLon, minLat],
            [maxLon, maxLat]],
            {padding: 50,
            speed: panningSpeed,
            curve: 0.7,
            easing(t) {return Math.sin(t * Math.PI / 2);},
            essential: true
            }
        );
    }
}


// Create the mapbox object
mapboxgl.accessToken = 'pk.eyJ1IjoiY2QxMjciLCJhIjoiY2s2eTF6cGphMGY5ejNncGJ0bXJjYmxjbSJ9.AWi1_d1Z8YULzs-kaoizQg';
let map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/light-v10',
    pitch: 10,                   // starting tilt
    center: [0, 30],            // starting position
    zoom: 1.5                   // starting zoom
});

// Add a layer with the pulsing dot
map.on('load', function() {
    map.addImage('pulsing-dot', pulsingDot);

    map.addSource('points', {
        'type': 'geojson',
        'data': {
            'type': 'FeatureCollection',
            'features': [
                {
                    'type': 'Feature',
                    'geometry': {
                        'type': 'Point',
                        'coordinates': [0, 0]
                    }
                }
            ]
        }
    });

    map.addLayer({
        'id': 'points',
        'type': 'symbol',
        'source': 'points',
        'layout': {
            'icon-image': 'pulsing-dot'
        }
    });

    // Insert the layer beneath any symbol layer.
    const layers = map.getStyle().layers;

    let labelLayerId;
    for (let i = 0; i < layers.length; i++) {
        if (layers[i].type === 'symbol' && layers[i].layout['text-field']) {
            labelLayerId = layers[i].id;
            break;
        }
    }

    map.addLayer(
        {
            'id': '3d-buildings',
            'source': 'composite',
            'source-layer': 'building',
            'filter': ['==', 'extrude', 'true'],
            'type': 'fill-extrusion',
            'minzoom': 13,
            'paint': {
                'fill-extrusion-color': '#aaa',

                // use an 'interpolate' expression to add a smooth transition effect to the
                // buildings as the user zooms in
                'fill-extrusion-height': [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    13,
                    0,
                    15.05,
                    ['get', 'height']
                ],
                'fill-extrusion-base': [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    13,
                    0,
                    15.05,
                    ['get', 'min_height']
                ],
                'fill-extrusion-opacity': 0.6
            }
        },
        labelLayerId
    );
});

map.on('click', e => { allClicks.push({lon : e.lngLat.lng, lat : e.lngLat.lat}); MoveTo(allClicks); } );

// Change the map style depending on the state of the radio buttons
{
    function switchMapLayer(layer) {
        let layerId = layer.target.id;
        map.setStyle('mapbox://styles/mapbox/' + layerId);
        // TODO: the pulsing dot disappears
    }

    let layerList = document.getElementById('menu');
    let inputs = layerList.getElementsByTagName('input');
    for (let i = 0; i < inputs.length; i++) {
        inputs[i].onclick = switchMapLayer;
    }
}