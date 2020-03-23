'use strict';

// eslint-disable-next-line
class Visualizer {
    constructor(store) {
        // this.removeOldEvents = true;   // Set to false to see all events stack up over time
        this.panningSpeed = 0.7;
        this.allData = [];
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
        function _areBoundsTooWide(map, minLon, maxLon, minLat, maxLat) {
            const lonDiff = maxLon - minLon;
            const latDiff = maxLat - minLat;
            const currBounds = map.getBounds();
            const curLonDiff = currBounds._ne.lng - currBounds._sw.lng;
            const curLatDiff = currBounds._ne.lat - currBounds._sw.lat;
            return (latDiff < curLatDiff/2) && (lonDiff < curLonDiff/2);
        }

        if (dataset.length === 0) return;

        let minLon, maxLon, minLat, maxLat;
        [minLon, maxLon, minLat, maxLat] = this._minMaxCoord(dataset);

        // Determine most zoomed-in level
        const zoom =
            (dataset.length <= 2) ?
            5 :
            _areBoundsTooWide(this.map, minLon, maxLon, minLat, maxLat) ?
            100 :
            this.map.getZoom();

        this.map.fitBounds(
            [[minLon, minLat],
            [maxLon, maxLat]],
            {
                padding: 50,
                speed: this.panningSpeed,
                curve: 0.7,
                maxZoom: zoom,
                linear: false,
                easing(t) { return Math.sin(t * Math.PI / 2); },
                essential: true
            }
        );
    }

    init(container = 'map') {
        return new Promise((resolve, reject) => {
            try {
                // Create the mapbox object
                mapboxgl.accessToken = 'pk.eyJ1IjoiY2QxMjciLCJhIjoiY2s2eTF6cGphMGY5ejNncGJ0bXJjYmxjbSJ9.AWi1_d1Z8YULzs-kaoizQg';
                this.map = new mapboxgl.Map({
                    container: container,
                    style: 'mapbox://styles/mapbox/satellite-v9',
                    center: [0, 30],            // starting position
                    zoom: 1                     // starting zoom
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

                    // Add zoom and rotation controls to the map.
                    self.map.addControl(new mapboxgl.NavigationControl(), 'bottom-right');

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

        var displayedPopups = [];
        const popupClasses = [
            'mapboxgl-popup-content-red',
            'mapboxgl-popup-content-green',
            'mapboxgl-popup-content-blue'
        ]

        // Create a new image and layer for each dataset
        for (let dataSetIdx = 0; dataSetIdx < allData.length; ++dataSetIdx) {
            const name = 'points_' + dataSetIdx;

            this.map.addImage(name, this._pulsingDot(datasetColours[dataSetIdx]));

            this.map.addSource(name, {
                type: 'geojson',
                cluster: false,
                data: {
                    type: 'FeatureCollection',
                    features: []
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


            // Change the cursor to a pointer when the mouse is over the places layer.
            this.map.on('mouseenter', name, e =>
                this.map.getCanvas().style.cursor = 'pointer');

            // Change it back to a pointer when it leaves.
            this.map.on('mouseleave', name, e =>
                this.map.getCanvas().style.cursor = '');

            // Create a popup on click
            this.map.on("click", name, e => {

                var coords = e.features[0].geometry.coordinates.slice();
                // var description = e.features[0].properties.description;

                // Ensure that if the map is zoomed out such that multiple
                // copies of the feature are visible, the popup appears
                // over the copy being pointed to.
                while (Math.abs(e.lngLat.lng - coords[0]) > 180) {
                    coords[0] += (e.lngLat.lng > coords[0]) ? 360 : -360;
                }

                // const index = e.features[0].properties.index;
                // const textToShow = dataset[index].event;
                const textToShow = "It works!";
                displayedPopups.push(
                    new mapboxgl.Popup({
                            className: popupClasses[dataSetIdx],
                            closeOnClick: false,
                            closeButton: false,
                            offset: [0, -4] })
                        .setLngLat(coords)
                        .setHTML('<p class="popupText">' + textToShow + '</p>')
                        .addTo(this.map)
                );
                displayedPopups[displayedPopups.length-1].timestampEnd = 0; // remove at next refresh (when play resumes)
            });
        }


        // Compute update frequency from date spread in all datasets
        const earliestDateMs = Math.min(...allData.map(d => d.dateRangeMs[0]));
        const latestDateMs = Math.max(...allData.map(d => d.dateRangeMs[1]));
        const dateRangeMs = latestDateMs - earliestDateMs;

        const refreshIntervalMs = 100;
        const totalNumberSteps = Math.ceil(totalDesiredRuntimeMs / refreshIntervalMs);
        var timeIntervalMs = Math.ceil(dateRangeMs / totalNumberSteps)
        var defaultDurationMs = (2000 / refreshIntervalMs) * timeIntervalMs;  // 2 sec converted to how long that is in virtual time

        // Share some variables
        {
            const startDate = new Date(earliestDateMs);
            const endDate = new Date(latestDateMs);
            const isYear = ((startDate.getUTCMonth() === 0) && (startDate.getUTCDate() === 1) &&
                            (endDate.getUTCMonth() === 0) && (endDate.getUTCDate() === 1));

            this.store.set('startTime', earliestDateMs);
            this.store.set('endTime', latestDateMs);
            this.store.set('virualTime', virtualTime);
            this.store.set('progress', '0%');
            this.store.set('isYearOnly', isYear);
        }

        // on a regular basis, add more coordinates from the saved list and update the map
        var displayedEventIndices = [];
        var eventIndices = [];
        var virtualTime = earliestDateMs;
        var timer = window.setInterval(() => {

            let speed = this.store.get('speed');
            if (speed <= 0) return;

            // Remove old features
            let allEventsRemoved = true;
            for (let dataSetIdx = 0; dataSetIdx < allData.length; ++dataSetIdx) {
                const layerName = 'points_' + dataSetIdx;
                let geojsonData = this.map.getSource(layerName)._data;
                if (typeof displayedEventIndices[dataSetIdx] === 'undefined') displayedEventIndices.push(new Array);
                const currentEventIndices = displayedEventIndices[dataSetIdx];

                const dataset = allData[dataSetIdx].data;

                // Remove event markers
                if (this.store.get('clearPoints'))
                {
                    for (let i = currentEventIndices.length - 1; i >= 0; --i)
                    {
                        const eventIdx = currentEventIndices[i];
                        if (dataset[eventIdx].timestampEnd <= virtualTime)
                        {
                            geojsonData.features.splice(i, 1);
                            currentEventIndices.splice(i, 1);
                        }
                        else
                        {
                            allEventsRemoved = false;
                        }
                    }
                }

                // Remove popups
                for (let i = displayedPopups.length - 1; i >= 0; --i)
                {
                    if (displayedPopups[i].timestampEnd <= virtualTime)
                    {
                        displayedPopups[i].remove();
                        displayedPopups.splice(i, 1);
                    }
                }

                // Refresh set of points on map for this dataset
                this.map.getSource(layerName).setData(geojsonData);
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

                        geojsonData.features.push(
                            {
                                type: 'Feature',
                                geometry:
                                {
                                    type: 'Point',
                                    coordinates: coords
                                },
                                properties:
                                {
                                    // title: row.title,
                                    // description: row.description,
                                    // msStart: row.msStart,
                                    r: 1,
                                    g: 0,
                                    b: 0
                                }
                            }
                        );
                        displayedEventIndices[dataSetIdx].push(i);  // Keep track of what we are displaying

                        // Make sure there is a duration or an end date
                        if (typeof dataset[i].dateEnd === 'undefined')
                        {
                            if (typeof dataset[i].duration === 'undefined')
                            {
                                // [duration, dateEnd] = [0, 0]
                                dataset[i].durationMs = defaultDurationMs * speed;
                            }
                            else
                            {
                                // [duration, dateEnd] = [1, 0]
                                dataset[i].durationMs = Math.max(defaultDurationMs * speed, dataset[i].duration);
                            }
                        }
                        else    // Check that the minimum duration is long enough
                        {
                            // [duration, dateEnd] = [0, 1]
                            // [duration, dateEnd] = [1, 1]
                            dataset[i].durationMs = Math.max(defaultDurationMs * speed,
                                                             new Date(dataset[i].dateEnd) - new Date(dataset[i].dateStart));
                        }
                        dataset[i].timestampEnd = this._strToMs(dataset[i].dateStart) + dataset[i].durationMs;

                        // Add popup
                        if (this.store.get('displayPopups') &&
                            (dataset[i].event !== undefined && dataset[i].event !== ""))
                        {
                            const textToShow = dataset[i].event;
                            // Keep track of the popups
                            displayedPopups.push(
                                new mapboxgl.Popup({
                                        className: popupClasses[dataSetIdx],
                                        closeOnClick: false,
                                        closeButton: false,
                                        offset: [0, -4] })
                                    .setLngLat(coords)
                                    .setHTML('<p class="popupText">' + textToShow + '</p>')
                                    .addTo(this.map)
                            );
                            displayedPopups[displayedPopups.length-1].timestampEnd = dataset[i].timestampEnd;
                        }
                    }
                    activeCoordinates.push(...geojsonData.features.map(d => d.geometry.coordinates));

                    // Move the pointer forward for this dataset
                    eventIndices[dataSetIdx] = i;

                    if (i > 0)
                    {
                        let eventForCard = dataset[i-1];
                        eventForCard.datasetName = allData[dataSetIdx].title;
                        this.store.set(`displayedEvent${dataSetIdx}`, [eventForCard]);
                    }

                    // Refresh set of points on map for this dataset
                    this.map.getSource(layerName).setData(geojsonData);
                }
            }

            // Pan-and-zoom to include all points currently displayed
            this._moveTo(activeCoordinates);

            // Advance time
            virtualTime += timeIntervalMs * speed;
            this.store.set('virtualTime', virtualTime);
            this.store.set('progress', `${(virtualTime - earliestDateMs) / dateRangeMs * 100}%`);

            if (allDataProcessed && allEventsRemoved) {
                // Loop back to start date
                virtualTime = earliestDateMs;

                // Force pause
                this.store.set('speed', -1 * this.store.get('speed'));
                let x = document.getElementById('playButton');
                x.classList.remove("fa-pause");
                x.classList.add("fa-play");

                // Set dataset to clear everything at next iteration
                for (let dataSetIdx = 0; dataSetIdx < allData.length; ++dataSetIdx) {
                    const dataset = allData[dataSetIdx].data;
                    for (let i = 0; i < dataset.length; ++i) {
                        dataset[i].timestampEnd = 0;
                        dataset[i].durationMs = 0;
                    }
                    eventIndices[dataSetIdx] = 0;

                    // Remove all popups
                    for (let i = displayedPopups.length - 1; i >= 0; --i)
                    {
                        displayedPopups[i].remove();
                        displayedPopups.splice(i, 1);
                    }
                }
            }
        }, refreshIntervalMs);
    }
}
