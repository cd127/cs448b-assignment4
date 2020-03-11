'use strict';

// eslint-disable-next-line
class DataReader {
    constructor() {
        this.fileContents = new Map();
        this.fileType = new Map();
    }

    async getJSONFromFile(id, mappings) {

        function mapFields(objArray, mappings) {
            let newObjArray = [];
            objArray.forEach(obj => {
                let newObj = {};
                const keys = Object.keys(mappings);
                keys.forEach(key => {
                    if (key !== 'title') {
                        let mappedField = mappings[key];
                        newObj[key] = obj[mappedField];
                    }
                })
                newObjArray.push(newObj);
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
