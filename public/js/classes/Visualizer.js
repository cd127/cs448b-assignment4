'use strict';

// eslint-disable-next-line
class Visualizer {
    constructor(store) {
        this.removeOldEvents = true;   // Set to false to see all events stack up over time
        this.panningSpeed = 0.7;
        this.allData = [];
        this.isLoadTestData = true;
        this.store = store;
        console.log(this.store);

    }

    // implementation of CustomLayerInterface to draw a pulsing dot icon on the map
    // see https://docs.mapbox.com/mapbox-gl-js/api/#customlayerinterface for more info
    _pulsingDot(col = [255, 100, 100]) {
        const dotSize = 20;
        let self = this;
        return {
            color: col,
            width: dotSize,
            height: dotSize,
            data: new Uint8Array(dotSize * dotSize * 4),

            // get rendering context for the map canvas when layer is added to the map
            onAdd: function () {
                let canvas = document.createElement('canvas');
                canvas.width = this.width;
                canvas.height = this.height;
                this.context = canvas.getContext('2d');
            },

            // called once before every frame where the icon will be used
            render: function () {
                let duration = 1500;
                let t = (performance.now() % duration) / duration;

                let radius = (dotSize / 2) * 0.5;
                let outerRadius = ((dotSize / 2) - radius) * t + radius;
                let context = this.context;
                let color = this.color;

                // draw outer circlef
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
                context.lineWidth = 2 + 4 * Math.max(0, 1 - 5 * t);
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
                        '\nzoom = ' + self.map.getZoom().toFixed(2) +
                        ';\ncentre = ' + self.map.getCenter().toString()

                // continuously repaint the map, resulting in the smooth animation of the dot
                self.map.triggerRepaint();

                // return `true` to let the map know that the image was updated
                return true;
            }
        }
    }

    _minMaxCoord(dataset) {
        if (dataset.length === 0) return;

        // Handle any number of points
        function getLon(coord) {
            return coord.map(d => Array.isArray(d) ? d[0] : ('longitude' in d) ? d.longitude : d.lon);
        }
        function getLat(coord) {
            return coord.map(d => Array.isArray(d) ? d[1] : ('latitude' in d) ? d.latitude : d.lat);
        }
        function getMinY() {
            return Math.min(...getYs());
        }
        function getMaxY() {
            return Math.max(...getYs());
        }
        const minLon = Math.min(...getLon(dataset));
        const maxLon = Math.max(...getLon(dataset));
        const minLat = Math.min(...getLat(dataset));
        const maxLat = Math.max(...getLat(dataset));

        return [minLon, maxLon, minLat, maxLat];
    }

    _moveTo(dataset) {
        if (dataset.length === 0) return;

        let minLon, maxLon, minLat, maxLat;
        [minLon, maxLon, minLat, maxLat] = this._minMaxCoord(dataset);

        this.map.fitBounds(
            [[minLon, minLat],
            [maxLon, maxLat]],
            {
                padding: 50,
                speed: this.panningSpeed,
                curve: 0.7,
                maxZoom: (dataset.length === 1) ? 5 : 100,
                linear: false,
                easing(t) { return Math.sin(t * Math.PI / 2); },
                essential: true
            }
        );
    }

    loadTestData() {
        let xmlhttp = new XMLHttpRequest();
        xmlhttp.onreadystatechange = function () {
            if (this.readyState == 4 && this.status == 200) {
                // dataset 1
                let newData = JSON.parse(this.responseText);
                newData.sort((a, b) =>
                    (a.dateStart === b.dateStart) ? 0 :
                        (new Date(a.dateStart) < new Date(b.dateStart)) ? -1 : 1);
                const numPoints = newData.length;
                const dateRangeMs = [this._strToMs(newData[0].dateStart), this._strToMs(newData[numPoints - 1].dateStart)];
                let obj = {
                    title: this.responseURL,
                    numPoints: numPoints,
                    dateRangeMs: dateRangeMs,
                    data: newData
                };
                this.allData.push(obj);

                if (this.allData.length === 1) {
                    xmlhttp.open("GET", "public/data/chicago-battery-aggravated.json", true);
                    xmlhttp.send();
                }
            }
        };
        xmlhttp.open("GET", "public/data/chicago-assault-aggravated.json", true);
        xmlhttp.send();
    }

    init(container = 'map') {
        return new Promise((resolve, reject) => {
            try {
                // Create the mapbox object
                mapboxgl.accessToken = 'pk.eyJ1IjoiY2QxMjciLCJhIjoiY2s2eTF6cGphMGY5ejNncGJ0bXJjYmxjbSJ9.AWi1_d1Z8YULzs-kaoizQg';
                this.map = new mapboxgl.Map({
                    container: container,
                    style: 'mapbox://styles/mapbox/light-v10',
                    center: [0, 30],            // starting position
                    zoom: 1                   // starting zoom
                });

                let self = this;
                // Add a layer with the pulsing dot
                this.map.on('load', function () {
                    // Insert the layer beneath any symbol layer.
                    const layers = self.map.getStyle().layers;

                    let labelLayerId;
                    for (let i = 0; i < layers.length; i++) {
                        if (layers[i].type === 'symbol' && layers[i].layout['text-field']) {
                            labelLayerId = layers[i].id;
                            break;
                        }
                    }

                    self.map.addLayer(
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

                    resolve(self.map);
                });
            } catch (err) {
                reject(err);
            }
        });
    }

    _strToMs(dateStr) {
        const date = new Date(dateStr);
        return date.getTime();    // FIXME: would fail if < 1970
    }

    _switchMapLayer(layerId = 'dark-v10') {
        this.map.setStyle('mapbox://styles/mapbox/' + layerId);
    }

    mapShowSatellite() {
        this._switchMapLayer("satellite-v9");
    }

    mapShowLight() {
        this._switchMapLayer("light-v10");
    }

    mapShowDark() {
        this._switchMapLayer("dark-v10");
    }

    // Toggle clear/stack behaviour for additional features
    // {
    //     let clearEventsToggle = document.getElementById('clearToggle');
    //     let inputs = clearEventsToggle.getElementsByTagName('input');
    //     for (let i = 0; i < inputs.length; i++) {
    //         inputs[i].onclick =
    //             (d => this.removeOldEvents = inputs[i].attributes.value.value);
    //     }
    // }

    _concat(array) {
        let allValues = [];
        array.forEach(function (d) {
            allValues.push(...d)
        });
        return allValues;
    }

    // Start the animation
    startAnimation(allData, totalDesiredRuntimeMs = 3 * 60 * 1000 /*3 min*/) {
        console.log(this.store);

        // Start by jumping to the view that fits all the points of all datasets
        let minLon, maxLon, minLat, maxLat;

        [minLon, maxLon, minLat, maxLat] = this._minMaxCoord(
            this._concat(
                allData.map(d => {
                    return d.data
                })
            )
        );

        this.map.fitBounds(
            [[minLon, minLat],
            [maxLon, maxLat]],
            {
                padding: 50,
                maxZoom: 100,
                linear: true,
                animate: false
            }
        );

        const datasetColours = [
            [255, 100, 100],
            [100, 155, 100],
            [100, 100, 255]
        ]

        // Create a new image and layer for each dataset
        for (let dataSetIdx = 0; dataSetIdx < allData.length; ++dataSetIdx) {
            const name = 'points_' + dataSetIdx;

            this.map.addImage(name, this._pulsingDot(datasetColours[dataSetIdx]));

            this.map.addSource(name, {
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

            this.map.addLayer({
                'id': name,
                'type': 'symbol',
                'source': name,
                'layout': {
                    'icon-image': name,
                    'icon-allow-overlap': true
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
        var displayedPopups = [];
        var eventIndices = [];
        var virtualTime = earliestDateMs;
        this.store.set('startTime', earliestDateMs);
        this.store.set('endTime', latestDateMs);
        this.store.set('virualTime', virtualTime);
        this.store.set('progress', `0%`);



        var timer = window.setInterval(() => {

            // Remove old features
            for (let dataSetIdx = 0; dataSetIdx < allData.length; ++dataSetIdx) {
                const layerName = 'points_' + dataSetIdx;
                let geojsonData = this.map.getSource(layerName)._data;
                if (typeof displayedEventIndices[dataSetIdx] === 'undefined') displayedEventIndices.push(new Array);
                const currentEventIndices = displayedEventIndices[dataSetIdx];

                const dataset = allData[dataSetIdx].data;
                this.store.set(`displayedEvent${dataSetIdx}`, currentEventIndices.map((index) => {
                    return (allData[dataSetIdx].data)[index];
                }));

                if (this.removeOldEvents == true)
                    for (let i = currentEventIndices.length - 1; i >= 0; --i) {
                        const eventIdx = currentEventIndices[i];
                        if (this._strToMs(dataset[eventIdx].dateStart) + dataset[eventIdx].duration <= virtualTime) {
                            geojsonData.features[0].geometry.coordinates.splice(i, 1);
                            currentEventIndices.splice(i, 1);
                            try {
                                displayedPopups[i].remove();
                                displayedPopups.splice(i, 1);
                            } catch (err) {
                                // Do nothing.
                            }
                        }
                    }
            }

            let activeCoordinates = [];
            let allDataProcessed = true;
            for (let dataSetIdx = 0; dataSetIdx < allData.length; ++dataSetIdx) {
                if (typeof eventIndices[dataSetIdx] === 'undefined') eventIndices.push(0);

                const dataset = allData[dataSetIdx].data;
                let i = eventIndices[dataSetIdx];

                if (i < dataset.length) {
                    allDataProcessed = false;

                    const layerName = 'points_' + dataSetIdx;
                    let geojsonData = this.map.getSource(layerName)._data;

                    // Since the date array is sorted, we only need to check
                    // the elements at and after 'i' in each array
                    for (; (i < dataset.length) && (this._strToMs(dataset[i].dateStart) <= virtualTime); ++i) {

                        const coords = [dataset[i].longitude, dataset[i].latitude];

                        geojsonData.features[0].geometry.coordinates.push(coords);
                        displayedEventIndices[dataSetIdx].push(i);  // Keep track of what we are displaying

                        if (dataset[i].description !== undefined && dataset[i].description !== "") {
                            const textToShow = dataset[i].description;
                            // Keep track of the popups
                            displayedPopups.push(new mapboxgl.Popup({ closeOnClick: true, closeButton: false })
                                .setLngLat(coords)
                                .setHTML('<p>' + textToShow + '</p>')
                                .addTo(this.map)
                            );
                        }

                        // Make sure there is a duration. If not, assign default
                        if (typeof dataset[i].duration === 'undefined') {
                            dataset[i].duration = defaultDurationMs;
                        }
                    }
                    activeCoordinates.push(...geojsonData.features[0].geometry.coordinates);

                    // Move the pointer forward for this dataset
                    eventIndices[dataSetIdx] = i;

                    // Refresh set of points on map for this dataset
                    this.map.getSource(layerName).setData(geojsonData);
                }
            }

            // Pan-and-zoom to include all points currently displayed
            this._moveTo(activeCoordinates);

            // Advance time
            let speed = this.store.get('speed');
            console.log(speed);
            
            virtualTime += timeIntervalMs * speed;
            this.store.set('virtualTime', virtualTime);
            this.store.set('progress', `${(virtualTime - earliestDateMs) / dateRangeMs * 100}%`);

            if (allDataProcessed) {
                window.clearInterval(timer);
            }
        }, refreshIntervalMs);
    }
}
