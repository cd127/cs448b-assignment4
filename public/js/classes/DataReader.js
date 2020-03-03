'use strict';

// eslint-disable-next-line
class DataReader {
    constructor() {
        this.fileContents = new Map();
        this.jsonResults = new Map();
    }

    async getJSONFromFile(id) {
        return new Promise((resolve, reject) => {
            csv()
                .on('error', err => {
                    reject(err);
                })
                .fromString(this.fileContents.get(id))
                .then(jsonObj => {
                    this.jsonResults.set(id, jsonObj);
                    resolve(jsonObj);
                });
        });
    }

    getHeaders(id) {
        let firstLine = this.fileContents.get(id).split('\n')[0];
        return firstLine.split(',');
    }

    setHeaders(newHeadersArray, id) {
        console.log(`Setting headers under id ${id}.`);

        let fileContent = this.fileContents.get(id);
        fileContent = fileContent.substring(fileContent.indexOf('\n') + 1); // Remove first line.
        let headersLength = this.getHeaders(id).length;

        if (newHeadersArray.length !== headersLength)
            throw `Received ${newHeadersArray.length} headers. Need ${headersLength} headers.`;

        this.fileContents.set(id, newHeadersArray.join(',').concat('\n' + fileContent));
    }

    readFileAsString(id) {
        return new Promise((resolve, reject) => {
            let file = document.getElementById(id).files[0];
            if (file.type !== 'text/csv')
                throw `Cannot read file type ${file.type}. Can only read text/csv files.`;
            var reader = new FileReader();
            reader.onload = event => {
                this.fileContents.set(id, event.target.result);
                console.log(`File content saved under id ${id}.`);

                resolve(event.target.result);
            };
            reader.onerror = () => {
                reject();
            };

            reader.readAsText(document.getElementById(id).files[0]);
        });
    }

    getJsonResults() {
        return Array.from(this.jsonResults.values());
    }
}
