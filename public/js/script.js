'use strict';

let panningSpeed = 0.7;
let allData = [];

// implementation of CustomLayerInterface to draw a pulsing dot icon on the map
// see https://docs.mapbox.com/mapbox-gl-js/api/#customlayerinterface for more info
function pulsingDot(col = [255, 100, 100])
{
    const dotSize = 20;
    return {
        color: col,
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
            let color = this.color;

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
            context.fillStyle = 'rgba(' + color[0] + ', ' + color[1] + ', ' + color[2] + ',' + (1 - t) + ')';
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
            context.fillStyle = 'rgba(' + color[0] + ', ' + color[1] + ', ' + color[2] + ', 1)';
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
}

function minMaxCoord(dataset)
{
    if (dataset.length === 0) return;

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

    return [minLon, maxLon, minLat, maxLat];
}

function MoveTo(dataset)
{
    if (dataset.length === 0) return;

    let minLon, maxLon, minLat, maxLat;
    [minLon, maxLon, minLat, maxLat] = minMaxCoord(dataset);

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

// Load data and sort by dateStart (remove once there is another way to load datasets)
{
    let xmlhttp = new XMLHttpRequest();
    xmlhttp.onreadystatechange = function() {
      if (this.readyState == 4 && this.status == 200) {
        // dataset 1
        let newData = JSON.parse(this.responseText);
        newData.sort((a,b) =>
            (a.dateStart === b.dateStart) ? 0 :
                (new Date(a.dateStart) < new Date(b.dateStart)) ? -1 : 1);
        const numPoints = newData.length;
        const dateRangeMs = [strToMs(newData[0].dateStart), strToMs(newData[numPoints-1].dateStart)];
        let obj = {
            title : this.responseURL,
            numPoints : numPoints,
            dateRangeMs : dateRangeMs,
            data : newData
        };
        allData.push(obj);

        if (allData.length === 1)
        {
            xmlhttp.open("GET", "public/data/chicago-battery-aggravated.json", true);
            xmlhttp.send();
        }
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
function startAnimation(allData, totalDesiredRuntimeMs = 3 * 60 * 1000 /*3 min*/)
{
    // Start by jumping to the view that fits all the points of all datasets
    let minLon, maxLon, minLat, maxLat;
    [minLon, maxLon, minLat, maxLat] = minMaxCoord(concat(allData.map(d => d.data)));
    map.fitBounds(
        [[minLon, minLat],
        [maxLon, maxLat]],
        {padding: 50,
        maxZoom: 100,
        linear: true,
        animate: false}
    );

    const datasetColours = [
    [255, 100, 100],
    [100, 155, 100],
    [100, 100, 255]
    ]

    // Create a new image and layer for each dataset
    for (let dataSetIdx = 0; dataSetIdx < allData.length; ++dataSetIdx)
    {
        const name = 'points_' + dataSetIdx;

        map.addImage(name, pulsingDot(datasetColours[dataSetIdx]));

        map.addSource(name, {
            type: 'geojson',
            cluster: false,
            data: {
                'type': 'FeatureCollection',
                'features': [
                    {
                        'type': 'Feature',
                        'geometry': {
                            'type': 'MultiPoint',
                            'coordinates': []
                        }
                    }
                ]
            }
        });

        map.addLayer({
            'id': name,
            'type': 'symbol',
            'source': name,
            'layout': {
                'icon-image': name
            }
        });
    }


    // Compute update frequency from date spread in all datasets
    const earliestDateMs = Math.min(...allData.map(d => d.dateRangeMs[0]));
    const latestDateMs = Math.max(...allData.map(d => d.dateRangeMs[1]));
    const dateRangeMs = latestDateMs - earliestDateMs;

    const totalNumberSteps = 1000;
    const refreshIntervalMs = Math.ceil(totalDesiredRuntimeMs / totalNumberSteps)
    var timeIntervalMs = Math.ceil(dateRangeMs / totalNumberSteps)
    var defaultDurationMs = (2000 / refreshIntervalMs) * timeIntervalMs;  // 2 sec converted to how long that is in virtual time

    // on a regular basis, add more coordinates from the saved list and update the map
    var displayedEventIndices = [];
    var eventIndices = [];
    var virtualTime = earliestDateMs;
    var timer = window.setInterval(function() {

        // Remove old features
        for (let dataSetIdx = 0; dataSetIdx < allData.length; ++dataSetIdx)
        {
            const layerName = 'points_' + dataSetIdx;
            let geojsonData = map.getSource(layerName)._data;
            if (typeof displayedEventIndices[dataSetIdx] === 'undefined') displayedEventIndices.push(new Array);
            const currentEventIndices = displayedEventIndices[dataSetIdx];
            const dataset = allData[dataSetIdx].data;

            for (let i = currentEventIndices.length - 1; i >= 0; --i)
            {
                const eventIdx = currentEventIndices[i];
                if (strToMs(dataset[eventIdx].dateStart) + dataset[eventIdx].duration <= virtualTime)
                {
                    geojsonData.features[0].geometry.coordinates.splice(i, 1);
                    currentEventIndices.splice(i, 1);
                }
            }
        }

        let activeCoordinates = [];
        let allDataProcessed = true;
        for (let dataSetIdx = 0; dataSetIdx < allData.length; ++dataSetIdx)
        {
            if (typeof eventIndices[dataSetIdx] === 'undefined') eventIndices.push(0);

            const dataset = allData[dataSetIdx].data;
            let i = eventIndices[dataSetIdx];

            if (i < dataset.length)
            {
                allDataProcessed = false;

                const layerName = 'points_' + dataSetIdx;
                let geojsonData = map.getSource(layerName)._data;

                // Since the date array is sorted, we only need to check
                // the elements at and after 'i' in each array
                for (; (i < dataset.length) && (strToMs(dataset[i].dateStart) <= virtualTime); ++i)
                {
                    geojsonData.features[0].geometry.coordinates.push(
                        [dataset[i].longitude, dataset[i].latitude]
                    );
                    displayedEventIndices[dataSetIdx].push(i);  // Keep track of what we are displaying

                    // Make sure there is a duration. If not, assign default
                    if (typeof dataset[i].duration === 'undefined')
                    {
                        dataset[i].duration = defaultDurationMs;
                    }
                }
                activeCoordinates.push(...geojsonData.features[0].geometry.coordinates);

                // Move the pointer forward for this dataset
                eventIndices[dataSetIdx] = i;

                // Refresh set of points on map for this dataset
                map.getSource(layerName).setData(geojsonData);
            }
        }

        // Pan-and-zoom to include all points currently displayed
        MoveTo(activeCoordinates);

        // Advance time
        virtualTime += timeIntervalMs;

        if (allDataProcessed)
        {
            window.clearInterval(timer);
        }
    }, refreshIntervalMs);
}