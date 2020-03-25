'use strict';

class DataReader {
    constructor() {
        this.fileContents = new Map();
        this.fileType = new Map();
        this.countryLocations = new Map();
    }

    async getJSONFromFile(id, mappings) {
        var countryLocations = this.countryLocations;

        // TODO: could be expanded to handle more than just country
        function countryToLongLat(country)
        {
            // Avoid issuing a GET command if we already know it
            if (!countryLocations.has(country))
            {
                let geoRequest = new XMLHttpRequest();
                const theUrl = 'https://api.mapbox.com/geocoding/v5/mapbox.places/' + country + '.json?types=country&access_token=pk.eyJ1IjoiY2QxMjciLCJhIjoiY2s2eTF6cGphMGY5ejNncGJ0bXJjYmxjbSJ9.AWi1_d1Z8YULzs-kaoizQg'
                geoRequest.open( "GET", theUrl, false ); // false for synchronous request
                geoRequest.send( null );
                const geo = JSON.parse(geoRequest.responseText);
                if (geo.features.length === 0 || !geo.features[0].hasOwnProperty('center'))
                {
                    console.log('Failed on: ');
                    console.log(geo);
                    countryLocations.set(country, []);
                }
                else
                {
                    countryLocations.set(country, geo.features[0].center);
                }
            }
            return countryLocations.get(country);
        }

        function mapFields(objArray, mappings) {
            let newObjArray = [];
            objArray.forEach(obj => {
                let newObj = {};
                let isComplete = true;
                for (let key in mappings)
                {
                    if (key === 'location')
                    {
                        const mappedField = mappings[key];
                        const longlat = countryToLongLat(obj[mappedField]);
                        if (longlat.length != 0)
                        {
                            newObj['longitude'] = longlat[0];
                            newObj['latitude'] = longlat[1];
                        }
                        else
                        {
                            isComplete = false;
                            break;
                        }
                    }
                    else if (key === 'description')
                    {
                        const expression = mappings[key];
                        newObj[key] = eval(expression);
                        if (!newObj[key])
                        {
                            isComplete = false;
                            break;
                        }
                    }
                    else if (key !== 'title')
                    {
                        const mappedField = mappings[key];
                        newObj[key] = obj[mappedField];
                        if (!newObj[key])
                        {
                            isComplete = false;
                            break;
                        }
                    }
                }
                if (isComplete)
                {
                    newObjArray.push(newObj);
                }
            })
            return newObjArray;
        }

        return new Promise((resolve, reject) => {
            if (this.fileType.get(id) === 'csv') {
                csv()
                    .on('error', err => {
                        reject(err);
                    })
                    .fromString(this.fileContents.get(id))
                    .then(jsonObj => {
                            resolve(mapFields(jsonObj, mappings));
                    });
            }
            else if (this.fileType.get(id) === 'json') {
                resolve(mapFields(JSON.parse(this.fileContents.get(id)), mappings));
            }
        });
    }

    getJSONFromURL(url) {
        return new Promise((resolve, reject) => {
            axios.get(url)
                .then(function (response) {
                    // handle success
                    csv()
                        .fromString(response.data)
                        .then(function (result) {
                            resolve(result);
                        })
                })
                .catch(function (error) {
                    // handle error
                    reject(error);
                })
        });
    }

    unsetFileContentByKey(key) {
        this.fileContents.delete(key);
        this.fileType.delete(key);
    }

    getHeaders(id) {
        if (this.fileType.get(id) === 'csv') {
            let firstLine = this.fileContents.get(id).split('\n')[0];
            return firstLine.split(',');
        }
        else if (this.fileType.get(id) === 'json') {
            let fields = [];
            for (var a in JSON.parse(this.fileContents.get(id))[0]) fields.push(a.toString());
            return fields;
        }
        return '';
    }

    readFileAsString(id) {
        return new Promise((resolve, reject) => {
            let file = document.getElementById(id).files[0];
            let type = file.type;
            console.log('File: ' + file + '; type: ' + type);

            if ((type === 'text/csv') || (type === 'application/vnd.ms-excel'))
                type = 'csv';
            else if (type === 'application/json')
                type = 'json';
            else
                throw `Cannot read file type ${file.type}. Can only read text/csv, application/json or application/vnd.ms-excel files.`;

            var reader = new FileReader();
            reader.onload = event => {
                this.fileContents.set(id, event.target.result);
                console.log(`File content saved under id ${id}.`);

                resolve(event.target.result);
            };
            reader.onerror = (err) => {
                reject(err);
            };

            this.fileType.set(id, type);
            reader.readAsText(document.getElementById(id).files[0]);
        });
    }
}
