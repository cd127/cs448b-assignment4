import React from "react";
import PropTypes from "prop-types";
import { Grid, Paper, Slider, Tooltip, IconButton } from "@material-ui/core";
import { withStyles } from "@material-ui/core/styles";
import {
  PlayCircleFilledRounded as PlayOn,
  PlayCircleOutlineRounded as PlayOff,
  PauseCircleFilledRounded as PauseOn,
  PauseCircleOutlineRounded as PauseOff,
  FastForwardRounded as FastForward,
  FastRewindRounded as FastRewind
} from "@material-ui/icons";

// eslint-disable-next-line
const styles = theme => ({
  root: {
    flexGrow: 1,
    display: "flex",
    alignItems: "center",
    height: "20%",
    paddingRight: "0"
  },
  paper: {
    padding: theme.spacing(2),
    textAlign: "center",
    color: theme.palette.text.secondary,
    background: theme.palette.background.paper
    // zIndex: "1 !important",
    // position: "absolute"
  },
  dateTooltip: {
    fontSize: "1.5em"
  },
  playBackButton: {
    padding: "6px"
  },
  playBackIcon: {
    fontSize: "2.5rem"
  }
});

/**
 * Define States, a React componment of CS142 project #4 problem #2.  The model
 * data for this view (the state names) is available
 * at window.cs142models.statesModel().
 */
class Controls extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      // timeStep: 1
      timeStart: null,
      timeCurrent: null,
      timeEnd: null,
      activePlayback: null // "play", "pause"
    };
  }

  msToDate = milliseconds => {
    let date = new Date(milliseconds);
    return `${date.toDateString()} ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`;
  };

  setPlayback = playback => {
    this.setState({
      activePlayback: playback
    });
  };

  handleChangeTrack = (event, value) => {
    this.props.setTime(value);
  };

  // eslint-disable-next-line
  handlePlay = event => {
    this.props.handlePlay();
    this.setState({
      activePlayback: "play"
    });
  };

  // eslint-disable-next-line
  handlePause = event => {
    this.props.handlePause();
    this.setState({
      activePlayback: "pause"
    });
  };

  componentDidMount() {}

  ValueLabelComponent = props => {
    const { children, open, value } = props;
    const { classes } = this.props;

    return (
      <Tooltip
        open={open}
        enterTouchDelay={0}
        placement="top"
        title={value}
        // className={classes.dateTooltip}
        classes={{ tooltip: classes.dateTooltip }}
        arrow
      >
        {children}
      </Tooltip>
    );
  };

  render() {
    const {
      classes,
      timeStart,
      timeCurrent,
      timeEnd,
      timeMin,
      timeMax,
      handleFastRewind,
      handleFastForward
    } = this.props;

    return (
      <div className={classes.root}>
        {/* Track */}
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Paper className={classes.paper}>
              <Slider
                value={[timeStart, timeCurrent, timeEnd]}
                ValueLabelComponent={this.ValueLabelComponent}
                min={timeMin}
                max={timeMax}
                step={(timeMax - timeMin) / 100}
                getAriaValueText={this.msToDate}
                valueLabelFormat={this.msToDate}
                onChange={this.handleChangeTrack}
                // valueLabelDisplay="on"
                valueLabelDisplay="auto"
                aria-labelledby="non-linear-slider"
              />
              <IconButton
                className={classes.playBackButton}
                onClick={handleFastRewind}
              >
                <FastRewind className={classes.playBackIcon} />
              </IconButton>
              {this.state.activePlayback === "play" ? (
                <IconButton className={classes.playBackButton}>
                  <PlayOn className={classes.playBackIcon} />
                </IconButton>
              ) : (
                <IconButton
                  onClick={this.handlePlay}
                  className={classes.playBackButton}
                >
                  <PlayOff className={classes.playBackIcon} />
                </IconButton>
              )}
              {this.state.activePlayback === "pause" ? (
                <IconButton className={classes.playBackButton}>
                  <PauseOn className={classes.playBackIcon} />
                </IconButton>
              ) : (
                <IconButton
                  onClick={this.handlePause}
                  className={classes.playBackButton}
                >
                  <PauseOff className={classes.playBackIcon} />
                </IconButton>
              )}
              <IconButton
                className={classes.playBackButton}
                onClick={handleFastForward}
              >
                <FastForward className={classes.playBackIcon} />
              </IconButton>
            </Paper>
          </Grid>
        </Grid>
      </div>
    );
  }
}

Controls.propTypes = {
  classes: PropTypes.object.isRequired,
  timeCurrent: PropTypes.number,
  timeStart: PropTypes.number,
  timeEnd: PropTypes.number,
  timeMin: PropTypes.number,
  timeMax: PropTypes.number,
  timeStep: PropTypes.number,
  setTime: PropTypes.func,
  handleFastForward: PropTypes.func,
  handleFastRewind: PropTypes.func,
  handlePlay: PropTypes.func,
  handlePause: PropTypes.func
};

export default withStyles(styles)(Controls);
