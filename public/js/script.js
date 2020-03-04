'use strict';

let dotSize = 20;
let panningSpeed = 0.7;
let allData = [];

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

        let radius = (dotSize / 2) * 0.5;
        let outerRadius = ((dotSize / 2) - radius) * t + radius;
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

function MoveTo(dataset)
{
    // Handle any number of points
    function getLon(coord){
        return coord.map(d => Array.isArray(d)? d[0] : ('longitude' in d) ? d.longitude : d.lon);
    }
    function getLat(coord){
        return coord.map(d => Array.isArray(d)? d[1] : ('latitude' in d) ? d.latitude : d.lat);
    }
    function getMinY(){
        return Math.min(...getYs());
    }
    function getMaxY(){
        return Math.max(...getYs());
    }
    const minLon = Math.min(...getLon(dataset));
    const maxLon = Math.max(...getLon(dataset));
    const minLat = Math.min(...getLat(dataset));
    const maxLat = Math.max(...getLat(dataset));
    const averageLonLat = [
        (minLon + maxLon)/2,
        (minLat + maxLat)/2
    ];

    map.fitBounds(
        [[minLon, minLat],
        [maxLon, maxLat]],
        {padding: 50,
        speed: panningSpeed,
        curve: 0.7,
        maxZoom: (dataset.length === 1)? 5 : 100,
        linear: false,
        easing(t) {return Math.sin(t * Math.PI / 2);},
        essential: true
        }
    );
}


// Create the mapbox object
mapboxgl.accessToken = 'pk.eyJ1IjoiY2QxMjciLCJhIjoiY2s2eTF6cGphMGY5ejNncGJ0bXJjYmxjbSJ9.AWi1_d1Z8YULzs-kaoizQg';
let map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/light-v10',
    pitch: 10,                  // starting tilt
    center: [0, 30],            // starting position
    zoom: 1.5                   // starting zoom
});

// Add a layer with the pulsing dot
map.on('load', function() {
    map.addImage('pulsing-dot', pulsingDot);

    // Debug - REMOVEME
    function pointOnCircle(angle) {
        const radius = 15;
        return [Math.cos(angle) * radius, Math.sin(angle) * radius];
    }

    map.addSource('points', {
        type: 'geojson',
        cluster: false,
        data: {
            'type': 'FeatureCollection',
            'features': [
                {
                    'type': 'Feature',
                    'geometry': {
                        'type': 'MultiPoint',
                        'coordinates': [pointOnCircle(0), pointOnCircle(10)] // Debug - REMOVEME
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

function concat(array)
{
    let allValues = [];
    array.forEach(d => allValues.push(...d));
    return allValues;
}

function strToMs(dateStr)
{
    const date = new Date(dateStr);
    return date.getTime();    // FIXME: would fail if < 1970
}

// Start the animation on click
map.on('click', e => {
    startAnimation(allData);
});

// Change the map style depending on the state of the radio buttons
{
    function switchMapLayer(layer) {
        let layerId = layer.target.id;
        map.setStyle('mapbox://styles/mapbox/' + layerId);
        // TODO: the pulsing dots disappear
    }

    let layerList = document.getElementById('menu');
    let inputs = layerList.getElementsByTagName('input');
    for (let i = 0; i < inputs.length; i++) {
        inputs[i].onclick = switchMapLayer;
    }
}

// Load data and sort by dateStart
{
    let xmlhttp = new XMLHttpRequest();
    xmlhttp.onreadystatechange = function() {
      if (this.readyState == 4 && this.status == 200) {
        let newData = JSON.parse(this.responseText);
        newData.sort((a,b) =>
            (a.dateStart === b.dateStart) ? 0 :
                (new Date(a.dateStart) < new Date(b.dateStart)) ? -1 : 1);
        const numPoints = newData.length;
        const dateRangeMs = [strToMs(newData[0].dateStart), strToMs(newData[numPoints-1].dateStart)];
        let obj = {
            title : "chicago-assault-aggravated",
            numPoints : numPoints,
            dateRangeMs : dateRangeMs,
            data : newData
        };
        allData.push(obj);
      }
    };
    xmlhttp.open("GET", "public/data/chicago-assault-aggravated.json", true);
    xmlhttp.send();
}

// @Nathan once data is loaded, retrieve then using this function.
function getDataSets(){ 
    if(isDataSetsAvailable)
        return dataReader.getJsonResults();
    else throw ("Data sets are not yet available.")
}

// Start the animation
function startAnimation(allData)
{
    var geojsonData = map.getSource('points')._data;

    // Start by panning/zooming to the location of the first point
    // TODO: find the first point among all datasets
    MoveTo([[allData[0].data[0].longitude, allData[0].data[0].latitude]])

    // Compute update frequency from date spread in all datasets
    const earliestDateMs = Math.min(...allData.map(d => d.dateRangeMs[0]));
    const latestDateMs = Math.max(...allData.map(d => d.dateRangeMs[1]));
    const dateRangeMs = latestDateMs - earliestDateMs;

    const totalDesiredRuntimeMs = 3 * 60 * 1000; // 3 min
    const totalNumberSteps = 1000;
    const refreshInterval = Math.ceil(totalDesiredRuntimeMs / totalNumberSteps)
    var timeInterval = Math.ceil(dateRangeMs / totalNumberSteps)

    // on a regular basis, add more coordinates from the saved list and update the map
    var eventIndices = [];
    var virtualTime = earliestDateMs;
    var timer = window.setInterval(function() {
        // Clear the array before starting
        if (eventIndices.length === 0) geojsonData.features[0].geometry.coordinates = [];

        let allDataProcessed = true;
        for (let dataSetIdx = 0; dataSetIdx < allData.length; ++dataSetIdx)
        {
            if (typeof eventIndices[dataSetIdx] === 'undefined') eventIndices.push(0);

            const dataset = allData[dataSetIdx].data;
            let i = eventIndices[dataSetIdx];

            if (i < dataset.length)
            {
                allDataProcessed = false;

                // Since the date array is sorted, we only need to check
                // the elements at and after 'i' in each array
                for (; (i < dataset.length) && (strToMs(dataset[i].dateStart) <= virtualTime); ++i)
                {
                    geojsonData.features[0].geometry.coordinates.push(
                        [dataset[i].longitude, dataset[i].latitude]
                    );
                }

                // Move the pointer forward for each array
                eventIndices[dataSetIdx] = i;
            }
        }
        // Refresh set of points on map
        map.getSource('points').setData(geojsonData);

        // Pan-and-zoom to include all points currently displayed
        MoveTo(geojsonData.features[0].geometry.coordinates);

        // Advance time
        virtualTime += timeInterval;

        if (allDataProcessed)
        {
            window.clearInterval(timer);
        }
    }, refreshInterval);
}