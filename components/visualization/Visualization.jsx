import React from "react";
import mapboxgl from "mapbox-gl";
import PropTypes from "prop-types";
mapboxgl.accessToken =
  "pk.eyJ1IjoiY2QxMjciLCJhIjoiY2s2eTF6cGphMGY5ejNncGJ0bXJjYmxjbSJ9.AWi1_d1Z8YULzs-kaoizQg";
import { withStyles } from "@material-ui/core/styles";

var Helper = require("../helper");

// eslint-disable-next-line
const styles = theme => ({
  mapContainer: {
    display: "flex",
    position: "relative",
    height: "80vh",
    width: "100%",
    top: "0",
    right: "0",
    left: "0",
    bottom: "0",
    borderRadius: theme.shape.borderRadius
  },
  coordinatesBar: {
    display: "inline-block",
    position: "absolute",
    top: "30px",
    left: "30px",
    margin: "12px",
    backgroundColor: theme.palette.action.disabledBackground,
    color: "#ffffff",
    zIndex: "1 !important",
    padding: "6px",
    fontWeight: "bold",
    borderRadius: theme.shape.borderRadius
  }
});

/**
 * Define States, a React componment of CS142 project #4 problem #2.  The model
 * data for this view (the state names) is available
 * at window.cs142models.statesModel().
 */
class Visualization extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      lng: 5,
      lat: 34,
      zoom: 2,
      map: null,
      step: 0,
      originalFeatureSets: [],
      featureSets: [],
      indices: [0, 0, 0], // Lastly rendered feature index for each dataset.
      plotPopups: [[], [], []],
      hoverPopups: []
    };
  }

  getGeojson = index => {
    return this.state.map.getSource(this.getDatasourceId(index))._data;
  };

  getMapLayerId = datasetsIndex => {
    return `layer-${datasetsIndex}`;
  };

  getDatasourceId = datasetsIndex => {
    return `dataset-${datasetsIndex}`;
  };

  reposition = () => {
    let coordinatesDisplayed = Helper.mergeDatasets(
      this.state.featureSets.map((f, index) => {
        return this.getGeojson(index).features.map(feature => {
          return feature.geometry.coordinates;
        });
      })
    );

    let minLon, maxLon, minLat, maxLat;
    [minLon, maxLon, minLat, maxLat] = Helper.getMinMaxCoord(
      coordinatesDisplayed
    );
    this.state.map.fitBounds(
      [
        [minLon, minLat],
        [maxLon, maxLat]
      ],
      {
        padding: 50,
        maxZoom: 100,
        linear: true,
        animate: true
      }
    );
  };

  drawLayer = (features, index) => {
    const { map } = this.state;

    let sourceId = this.getDatasourceId(index);
    let layerId = this.getMapLayerId(index);

    let geojson = {
      type: "FeatureCollection",
      features: features
    };

    map.addSource(sourceId, {
      type: "geojson",
      data: geojson
    });

    map.addLayer({
      id: layerId,
      type: "circle",
      source: sourceId,
      paint: {
        // make circles larger as the user zooms from z12 to z22
        "circle-radius": {
          base: 1.75,
          stops: [
            [12, 2 * 2],
            [22, 180 * 2]
          ]
        },
        "circle-color": ["rgba", ["get", "r"], ["get", "g"], ["get", "b"], 1]
      }
    });
  };

  init = () => {
    console.log("Initializing visualization.");

    const { datasets, timeIntervalMs, timeCurrent } = this.props;
    const { originalFeatureSets } = this.state;

    // Position the window.
    let fitBounds = datasets => {
      let minLon, maxLon, minLat, maxLat;

      [minLon, maxLon, minLat, maxLat] = Helper.getMinMaxCoord(
        Helper.mergeDatasets(datasets)
      );

      this.state.map.fitBounds(
        [
          [minLon, minLat],
          [maxLon, maxLat]
        ],
        {
          padding: 50,
          maxZoom: 100,
          linear: true,
          animate: false
        }
      );
    };
    fitBounds(datasets);

    let filteredFeatureSets = originalFeatureSets.map(featureSet => {
      return featureSet.filter(feature => {
        return feature.properties.msStart >= timeCurrent - timeIntervalMs;
      });
    });

    this.setState({ featureSets: filteredFeatureSets });
  };

  update = () => {
    const { timeCurrent, maxPlotsPerDataset, timeIntervalMs } = this.props;
    const { map, featureSets, indices } = this.state;

    let geojsons = [];

    featureSets.forEach((features, i) => {
      let index = indices[i];
      let feature = features[index];

      while (feature.properties.msStart <= timeCurrent) {
        if (index === 0) {
          console.log(
            "Beginning to plot at feature index 0. Drawing empty layer."
          );
          this.drawLayer([], i);
        }

        let geojson = this.getGeojson(i);

        // Fade old plots.
        map.setPaintProperty(this.getMapLayerId(i), "circle-color", [
          "rgba",
          ["get", "r"],
          ["get", "g"],
          ["get", "b"],
          [
            "min",
            [
              "/",
              1 * 2, // Dissapear x times slower.
              [
                "ceil",
                ["/", ["-", timeCurrent, ["get", "msStart"]], timeIntervalMs]
              ]
            ],
            1
          ]
        ]);

        // Add a new plot.
        geojson.features.push(feature);

        // Remove old plots.
        let numFeaturesRemove = geojson.features.length - maxPlotsPerDataset;
        if (numFeaturesRemove !== 0 && numFeaturesRemove > 0)
          geojson.features.splice(0, numFeaturesRemove);

        // Create a popup, but don't add it to the map yet.
        let plotPopups = this.state.plotPopups;
        let popups = this.state.plotPopups[i];
        let popup = new mapboxgl.Popup({
          closeButton: false,
          closeOnClick: false
        });
        popups.push(popup);

        // Remove old popups.
        let numPopupsRemove = popups.length - maxPlotsPerDataset;
        if (numPopupsRemove > 0) {
          for (let i = 0; i < numPopupsRemove; i++) {
            popups[i].remove();
          }
          popups.splice(0, numPopupsRemove);
        }

        this.setState({
          plotPopups: plotPopups
        });

        // Add popup to map.
        popup
          .setLngLat(feature.geometry.coordinates)
          .setHTML(
            `<div class="popup-content" style="opacity: 0;
              -webkit-animation: fadeIn 2s;
              animation: fadeIn 2s;">
              ${feature.properties.title} -
              ${feature.properties.description} -
              ${Helper.msToDate(feature.properties.msStart)} -
              </div>`
          )
          .addTo(map);

        // Increment index.
        let newIndices = this.state.indices;
        newIndices[i] = newIndices[i] + 1;
        this.setState({
          indices: newIndices
        });

        // Get new index and feature.
        index += 1;
        feature = features[index];

        geojsons[i] = geojson;
      }
    });

    // Reposition map.
    try {
      this.reposition();
    } catch (err) {
      console.log(
        'Failed repositioning. "normal" behavior if the track was moved backwards.'
      );
    }

    // Update and rerender map.
    geojsons.forEach((geojson, index) => {
      map.getSource(this.getDatasourceId(index)).setData(geojson);
    });

    // Increment step.
    this.setState({
      step: this.state.step + 1
    });
  };

  // Start over.
  clear = () => {
    const { map } = this.state;
    const { datasets } = this.props;

    let n = datasets.length;
    while (n) {
      map.removeLayer(this.getMapLayerId(n - 1));
      map.removeSource(this.getDatasourceId(n - 1));
      this.setState({
        indices: [0, 0, 0]
      });
      n--;
    }
  };

  componentDidMount() {
    const {
      setAppState,
      targetRuntimInMs,
      numSteps,
      datasets,
      maxNumHoverPopups
    } = this.props;

    let createFeature = (row, rgb) => {
      return {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [row.longitude, row.latitude]
        },
        properties: {
          title: row.title,
          description: row.description,
          msStart: row.msStart,
          r: rgb[0],
          g: rgb[1],
          b: rgb[2]
        }
      };
    };

    let createFeatures = (dataset, rgb) => {
      let features = dataset.map(row => {
        return createFeature(row, rgb);
      });
      return features;
    };

    let merged = Helper.mergeDatasets(this.props.datasets);

    // Initialize map
    let map = new mapboxgl.Map({
      container: this.mapContainer,
      style: "mapbox://styles/mapbox/light-v10",
      center: [this.state.lng, this.state.lat],
      zoom: this.state.zoom
    });

    // Coordinates display
    map.on("move", () => {
      this.setState({
        lng: map.getCenter().lng.toFixed(4),
        lat: map.getCenter().lat.toFixed(4),
        zoom: map.getZoom().toFixed(2)
      });
    });

    // Setup popup display on hover.
    let n = datasets.length;
    while (n) {
      map.on("mouseenter", this.getMapLayerId(n - 1), e => {
        // Change the cursor style as a UI indicator.
        map.getCanvas().style.cursor = "pointer";

        var coordinates = e.features[0].geometry.coordinates.slice();
        var description = e.features[0].properties.description;

        // Ensure that if the map is zoomed out such that multiple
        // copies of the feature are visible, the popup appears
        // over the copy being pointed to.
        while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
          coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
        }

        // Create a popup, but don't add it to the map yet.
        let popups = this.state.hoverPopups;
        let popup = new mapboxgl.Popup({
          closeButton: false,
          closeOnClick: false
        });
        popups.push(popup);

        // Remove old popups.
        let numPopupsRemove = popups.length - maxNumHoverPopups;
        if (numPopupsRemove > 0) {
          for (let i = 0; i < numPopupsRemove; i++) {
            popups[i].remove();
          }
          popups.splice(0, numPopupsRemove);
        }

        this.setState({
          hoverPopups: popups
        });

        // Populate the popup and set its coordinates
        // based on the feature found.
        popup
          .setLngLat(coordinates)
          .setHTML(
            `<div class="popup-content" style="opacity: 0;
              -webkit-animation: fadeInOut 4s;
              animation: fadeInOut 4s;">
              ${description}
              </div>`
          )
          .addTo(map);
      });
      n--;
    }

    // Initialize an array of geojson features
    this.setState({
      originalFeatureSets: datasets.map((dataset, index) => {
        return createFeatures(dataset, this.props.plotColors[index]);
      })
    });

    // Initialize app state
    let getOldestMsStart = Helper.getOldestMsStart(merged);
    let getNewestMsStart = Helper.getNewestMsStart(merged);

    setAppState({
      timeMin: getOldestMsStart,
      timeStart: getOldestMsStart,
      timeMax: getNewestMsStart,
      timeEnd: getNewestMsStart,
      timeCurrent: (getNewestMsStart + getOldestMsStart) / 2,
      refreshIntervalInMs: Math.ceil(targetRuntimInMs / numSteps), // how many times the app should render
      timeIntervalMs: Math.ceil(
        (getNewestMsStart - getOldestMsStart) / numSteps
      ) // each step is incremented by this many virtual milliseconds
    });

    this.setState({ map: map });
  }

  render() {
    const { classes } = this.props;
    return (
      <div>
        <div className={classes.coordinatesBar}>
          Longitude: {this.state.lng} | Latitude: {this.state.lat} | Zoom:{" "}
          {this.state.zoom}
        </div>
        <div
          ref={el => (this.mapContainer = el)}
          className={classes.mapContainer}
        />
      </div>
    );
  }
}

Visualization.propTypes = {
  classes: PropTypes.object.isRequired,
  datasets: PropTypes.array,
  plotColors: PropTypes.array,
  timeCurrent: PropTypes.number,
  timeStart: PropTypes.number,
  timeEnd: PropTypes.number,
  maxNumHoverPopups: PropTypes.number,
  targetRuntimInMs: PropTypes.number,
  timeIntervalMs: PropTypes.number,
  numSteps: PropTypes.number,
  maxPlotsPerDataset: PropTypes.number,
  setAppState: PropTypes.func
};

export default withStyles(styles)(Visualization);
