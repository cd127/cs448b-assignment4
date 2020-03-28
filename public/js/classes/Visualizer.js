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
    _pulsingDot(col = [255, 100, 100, true]) {
        const dotSize = 20;
        let self = this;
        return {
            pulse: col[3],
            color: col.splice(0,3),
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
                let t = this.pulse ? ((performance.now() % duration) / duration) : 1;

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
                context.fillStyle = this.pulse?
                                        'rgba(' + color[0] + ', ' + color[1] + ', ' + color[2] + ', 1)' :
                                        'rgba(155, 155, 155, 0.7)';
                context.strokeStyle = this.pulse? 'white' : 'rgba(' + color[0] + ', ' + color[1] + ', ' + color[2] + ', 0.8)';
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

    _moveTo(features) {
        function _areBoundsTooWide(map, minLon, maxLon, minLat, maxLat) {
            const lonDiff = maxLon - minLon;
            const latDiff = maxLat - minLat;
            const currBounds = map.getBounds();
            const curLonDiff = currBounds._ne.lng - currBounds._sw.lng;
            const curLatDiff = currBounds._ne.lat - currBounds._sw.lat;
            return (latDiff < curLatDiff/4) && (lonDiff < curLonDiff/4);
        }

        function onlyUnique(value, index, self) {
            return self.indexOf(value) === index;
        }

        if (features.length === 0) return;

        let minLon, maxLon, minLat, maxLat;
        [minLon, maxLon, minLat, maxLat] = this._minMaxCoord(features);

        // Determine most zoomed-in level
        const maxZoom =
            this.store.get('zoomOutOnly') ?
            this.map.getZoom() :
            (features.filter(onlyUnique).length <= 2) ?
            this.map.getZoom() :
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
                maxZoom: maxZoom,
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

        var displayedPopups = [];
        const popupClasses = [
            'mapboxgl-popup-content-red',
            'mapboxgl-popup-content-green',
            'mapboxgl-popup-content-blue'
        ]

        // Create a new image and two layers for each dataset (new and old)
        new Set(['old_points_', 'points_']).forEach(d =>
        {
            const points_datasetColours = [
                [255, 100, 100, true],
                [100, 155, 100, true],
                [100, 100, 255, true]
            ];

            const old_points_datasetColours = [
                [255, 100, 100, false],
                [100, 155, 100, false],
                [100, 100, 255, false]
            ];

            for (let dataSetIdx = 0; dataSetIdx < allData.length; ++dataSetIdx)
            {
                const name = d + dataSetIdx;

                this.map.addImage(name, this._pulsingDot(eval(`${d}datasetColours[dataSetIdx]`)));

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

                // Create a popup on click and show on event card
                this.map.on("click", name, e => {
                    // Link to event card
                    let eventForCard = e.features[0].properties;
                    eventForCard.datasetName = allData[dataSetIdx].title;
                    this.store.set(`displayedEvent${dataSetIdx}`, [eventForCard]);

                    let coords = e.features[0].geometry.coordinates.slice();

                    // Ensure that if the map is zoomed out such that multiple
                    // copies of the feature are visible, the popup appears
                    // over the copy being pointed to.
                    while (Math.abs(e.lngLat.lng - coords[0]) > 180) {
                        coords[0] += (e.lngLat.lng > coords[0]) ? 360 : -360;
                    }

                    const textToShow = e.features[0].properties.event;
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
        });

        const points_datasetColours = [
            [255, 100, 100],
            [100, 155, 100],
            [100, 100, 255]
        ];

        // Create all features as they will be displayed
        // to avoid doing it during the animation
        for (let dataSetIdx = 0; dataSetIdx < allData.length; ++dataSetIdx)
        {
            allData[dataSetIdx].features = [];
            allData[dataSetIdx].data.forEach( d =>
                {
                    allData[dataSetIdx].features.push(
                        {
                            type: 'Feature',
                            geometry:
                            {
                                type: 'Point',
                                coordinates: [d.longitude, d.latitude]
                            },
                            properties:
                            {
                                event: d.event,
                                dateStartStr: d.dateStart,
                                dateStart: new Date(d.dateStart),
                                dateEndStr: d.dateEnd,
                                dateEnd: new Date(d.dateEnd),
                                duration: d.duration,
                                description: d.description,
                                r: points_datasetColours[dataSetIdx][0],
                                g: points_datasetColours[dataSetIdx][1],
                                b: points_datasetColours[dataSetIdx][2]
                            }
                        }
                    )
                }
            );

            delete allData[dataSetIdx].data;
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
            this.store.set('virtualTime', virtualTime);
            this.store.set('progress', '0%');
            this.store.set('isYearOnly', isYear);
        }

        // on a regular basis, add more coordinates from the saved list and update the map
        var eventIndices = [];
        var virtualTime = earliestDateMs;
        var timer = window.setInterval(() => {

            function SetToClear()
            {
                for (let dataSetIdx = 0; dataSetIdx < allData.length; ++dataSetIdx) {
                    const features = allData[dataSetIdx].features;
                    for (let i = 0; i < features.length; ++i) {
                        const feature = features[i].properties;
                        feature.timestampEnd = 0;
                        feature.durationMs = 0;
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

            let speed = this.store.get('speed');

            // Handle scrub
            if (this.store.get("reqProgress") !== 0)
            {
                const newVirtualTime = earliestDateMs +
                                       ((latestDateMs - earliestDateMs) * this.store.get("reqProgress"));

                // Reset event indices
                if (newVirtualTime < virtualTime)
                {
                    SetToClear();
                    eventIndices = [];
                }
                virtualTime = newVirtualTime;
                this.store.set("reqProgress", 0)
            }
            else if (speed <= 0) return;

            // Assume speed is positive to calculate display durations
            speed = Math.abs(speed);

            // Add new features
            let allDataProcessed = true;
            for (let dataSetIdx = 0; dataSetIdx < allData.length; ++dataSetIdx) {
                if (typeof eventIndices[dataSetIdx] === 'undefined') eventIndices.push(0);

                const features = allData[dataSetIdx].features;
                let i = eventIndices[dataSetIdx];

                if (i < features.length) {
                    allDataProcessed = false;

                    const layerName = 'points_' + dataSetIdx;
                    let geojsonData = this.map.getSource(layerName)._data;

                    // Since the date array is sorted, we only need to check
                    // the elements at and after 'i' in each array
                    for (; (i < features.length) && (features[i].properties.dateStart.getTime() <= virtualTime); ++i) {

                        geojsonData.features.push(features[i]);

                        // Make sure there is a duration or an end date
                        const feature = features[i].properties;
                        if (typeof feature.dateEndStr === 'undefined')
                        {
                            if (typeof feature.duration === 'undefined')
                            {
                                // [duration, dateEnd] = [0, 0]
                                feature.durationMs = defaultDurationMs * speed;
                            }
                            else
                            {
                                // [duration, dateEnd] = [1, 0]
                                feature.durationMs = Math.max(defaultDurationMs * speed, feature.duration);
                            }
                        }
                        else    // Check that the minimum duration is long enough
                        {
                            // [duration, dateEnd] = [0, 1]
                            // [duration, dateEnd] = [1, 1]
                            feature.durationMs = Math.max(defaultDurationMs * speed,
                                                             feature.dateEnd - feature.dateStart);
                        }
                        feature.timestampEnd = feature.dateStart.getTime() + feature.durationMs;

                        // Add popup
                        if (this.store.get('displayPopups') &&
                            ( /*feature.event !== undefined &&*/ feature.event !== ""))
                        {
                            const coords = features[i].geometry.coordinates;
                            const textToShow = feature.event;
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
                            displayedPopups[displayedPopups.length-1].timestampEnd = feature.timestampEnd;
                        }
                    }

                    // Move the pointer forward for this dataset
                    eventIndices[dataSetIdx] = i;

                    if (i > 0)
                    {
                        let eventForCard = features[i-1].properties;
                        eventForCard.datasetName = allData[dataSetIdx].title;
                        this.store.set(`displayedEvent${dataSetIdx}`, [eventForCard]);
                    }

                    // Refresh set of points on map for this dataset
                    this.map.getSource(layerName).setData(geojsonData);
                }
            }

            // Remove old features
            let activeCoordinates = [];
            let allEventsRemoved = true;
            for (let dataSetIdx = 0; dataSetIdx < allData.length; ++dataSetIdx)
            {
                const layerName = 'points_' + dataSetIdx;
                let geojsonData = this.map.getSource(layerName)._data;

                const oldLayerName = 'old_points_' + dataSetIdx;
                let oldGeojsonData = this.map.getSource(oldLayerName)._data;

                const features = geojsonData.features;

                // Remove event markers
                for (let i = features.length - 1; i >= 0; --i)
                {
                    if (features[i].properties.timestampEnd <= virtualTime)
                    {
                        if (!this.store.get('clearPoints'))  // Move to old layer
                        {
                            oldGeojsonData.features.push(features[i]);
                        }
                        features.splice(i, 1);
                    }
                    else
                    {
                        allEventsRemoved = false;
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
                    else
                    {
                        allEventsRemoved = false;
                    }
                }

                // Refresh set of points on map for this dataset
                this.map.getSource(layerName).setData(geojsonData);
                this.map.getSource(oldLayerName).setData(oldGeojsonData);

                // Update coordinates which need framing
                activeCoordinates.push(...geojsonData.features.map(d => d.geometry.coordinates));
            }

            // Pan-and-zoom to include all points currently displayed
            this._moveTo(activeCoordinates);

            // Advance time
            virtualTime += timeIntervalMs * speed;
            this.store.set('virtualTime', Math.min(latestDateMs, virtualTime));
            this.store.set('progress', `${(virtualTime - earliestDateMs) / dateRangeMs * 100}%`);

            if (allDataProcessed && allEventsRemoved && (virtualTime >= latestDateMs)) {
                // Loop back to start date
                virtualTime = earliestDateMs;

                // Force pause
                this.store.set('speed', -1 * this.store.get('speed'));
                let x = document.getElementById('playButton');
                x.classList.remove("fa-pause");
                x.classList.add("fa-play");

                // Set dataset to clear everything at next iteration
                SetToClear();
            }
        }, refreshIntervalMs);
    }
}
