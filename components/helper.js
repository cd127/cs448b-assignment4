module.exports = {
  msToDate: milliseconds => {
    let date = new Date(milliseconds);
    return `${date.toDateString()} ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`;
  },

  // Given a datestring, return milliseconds.
  strToMs: dateStr => {
    const date = new Date(dateStr);
    return date.getTime();
  },

  getLastNElements: (array, n) => {
    return array.slice(Math.max(array.length - n, 0));
  },

  getOldestMsStart: dataset => {
    let msStarts = dataset.map(row => {
      return row.msStart;
    });
    return Math.min(...msStarts);
  },

  getNewestMsStart: dataset => {
    let msEnds = dataset.map(row => {
      return row.msEnd ? row.msEnd : row.msStart;
    });
    return Math.max(...msEnds);
  },
  mergeDatasets: datasets => {
    return datasets.reduce((accumulator, currentValue) => {
      accumulator.push(...currentValue);
      return accumulator;
    }, []);
  },
  getMinMaxCoord: dataset => {
    if (dataset.length === 0) return;

    let getLon = coord => {
      return coord.map(d =>
        Array.isArray(d) ? d[0] : "longitude" in d ? d.longitude : d.lon
      );
    };
    let getLat = coord => {
      return coord.map(d =>
        Array.isArray(d) ? d[1] : "latitude" in d ? d.latitude : d.lat
      );
    };

    const minLon = Math.min(...getLon(dataset));
    const maxLon = Math.max(...getLon(dataset));
    const minLat = Math.min(...getLat(dataset));
    const maxLat = Math.max(...getLat(dataset));

    return [minLon, maxLon, minLat, maxLat];
  }
};
