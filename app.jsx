import React from "react";
import ReactDOM from "react-dom";
import PropTypes from "prop-types";
import "./styles/main.css";
import { Container, CssBaseline } from "@material-ui/core";
import {
  withStyles,
  createMuiTheme,
  ThemeProvider
} from "@material-ui/core/styles";

import Visualization from "./components/visualization/Visualization";
import Controls from "./components/controls/Controls";
import dataset1 from "./public/data/chicago-assault-aggravated.json";
import dataset2 from "./public/data/chicago-battery-aggravated.json";

const theme = createMuiTheme({
  typography: {
    fontFamily: "Roboto, Raleway, Arial"
  }
});

const styles = theme => ({
  root: {
    padding: "30px 30px",
    width: "100%",
    height: "100%",
    background: theme.palette.action.disabledBackground
  },
  visualization: {
    // height: "80%"
  },
  contols: {
    // height: "20%"
  }
});

/**
 * GLOBALS
 */
var speed = 1; // Hacky-way of managing speed.
var timer; // Animation playback.

class App extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      timeCurrent: 0,
      timeStart: 0,
      timeEnd: 86400000,
      timeMin: 0,
      timeMax: 86400000,
      datasets: [
        this.formatChicagoDataset(dataset1),
        this.formatChicagoDataset(dataset2)
      ],
      speed: 1,
      targetRuntimInMs: 3 * 60 * 1000, // 3 minutes
      numSteps: 1000,
      refreshIntervalInMs: 0, // how many times the app should render - init in Visualization
      timeIntervalMs: 0, // each step is incremented by this - init in Visualization
      maxPlotsPerDataset: 5,
      plotColors: [
        [100, 0, 0],
        [0, 100, 0],
        [0, 0, 100]
      ],
      isPlayClicked: false
    };

    this.controls = React.createRef();
    this.visualization = React.createRef();
  }

  formatChicagoDataset = dataset => {
    let strToMs = dateStr => {
      const date = new Date(dateStr);
      return date.getTime();
    };

    return dataset.map(row => {
      return {
        msStart: strToMs(row.dateStart),
        title: row.event,
        description: row.description,
        latitude: row.latitude,
        longitude: row.longitude
      };
    });
  };

  endPlayback = () => {
    window.clearInterval(timer);
    this.controls.current.setPlayback("pause");
    this.setState({
      activePlayback: "pause",
      isPlayClicked: false
    });
  };

  // eslint-disable-next-line
  handleTrackBackwardSet = newTimeCurrent => {
    console.log("Current track moved backwards.");
    this.endPlayback();
    this.visualization.current.clear();
  };

  // eslint-disable-next-line
  handleTrackForwardSet = newTimeCurrent => {
    console.log("Current track moved forwards.");
    this.setState({ timeCurrent: newTimeCurrent });
  };

  // eslint-disable-next-line
  handleFastForward = event => {
    console.log("Handling fast forward.");
    speed = speed === 0 ? 1 : speed * 1.25; // Hacky-way of managing speed.
  };

  // eslint-disable-next-line
  handleFastRewind = event => {
    console.log("Handling fast rewind.");
    speed = speed === 0 ? 1 : speed / 1.25; // Hacky-way of managing speed.
  };

  // eslint-disable-next-line
  handlePlay = event => {
    const { isPlayClicked } = this.state;

    console.log("Handling play.");

    speed = 1; // Hacky-way of managing speed.

    this.setState({
      activePlayback: "play"
    });

    this.visualization.current.init();

    if (!isPlayClicked)
      timer = window.setInterval(() => {
        // End playback.
        if (this.state.timeCurrent >= this.state.timeEnd) {
          this.endPlayback();
          this.setState({
            timeCurrent: this.state.timeEnd
          });
          return;
        }

        // Update visualization - go to next step.
        this.visualization.current.update();

        this.setState({
          // Advance time.
          timeCurrent:
            this.state.timeCurrent + this.state.timeIntervalMs * speed,
          isPlayClicked: true
        });
      }, this.state.refreshIntervalInMs);
  };

  // eslint-disable-next-line
  handlePause = event => {
    console.log("Handling pause.");

    speed = 0; // Hacky-way of managing speed.

    this.setState({
      activePlayback: "pause"
    });
  };

  render() {
    const { classes } = this.props;

    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Container className={classes.root} maxWidth={false}>
          <Visualization
            ref={this.visualization}
            {...this.state}
            className={classes.visualization}
            setAppState={state => {
              this.setState(state);
            }}
          />
          <Controls
            ref={this.controls}
            setTime={time => {
              this.setState({
                timeStart: time[0],
                timeCurrent: time[1],
                timeEnd: time[2]
              });
            }}
            {...this.state}
            handleFastForward={this.handleFastForward}
            handleFastRewind={this.handleFastRewind}
            handleTrackBackwardSet={this.handleTrackBackwardSet}
            handlePlay={this.handlePlay}
            handlePause={this.handlePause}
          />
        </Container>
      </ThemeProvider>
    );
  }
}

App.propTypes = {
  classes: PropTypes.object.isRequired
};

let Application = withStyles(styles)(App);

ReactDOM.render(<Application />, document.getElementById("app"));
