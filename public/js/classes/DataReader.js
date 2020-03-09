'use strict';

// eslint-disable-next-line
class DataReader {
    constructor() {
        this.fileContents = new Map();
        this.jsonResults = new Map();
    }

    async getJSONFromFile(id, selectHeaders = []) {
        return new Promise((resolve, reject) => {
            csv()
                .on('error', err => {
                    reject(err);
                })
                .fromString(this.fileContents.get(id))
                .then(jsonObj => {
                    if (selectHeaders.length > 0) {
                        let temp = jsonObj.map(row => {
                            let formatted = {};
                            selectHeaders.forEach((header) => {
                                formatted[header] = row[header];
                            })
                            return formatted
                        })
                        this.jsonResults.set(id, temp);
                        resolve(temp);
                    }
                    else {
                        this.jsonResults.set(id, jsonObj);
                        resolve(jsonObj);
                    }
                });
        });
    }

    unsetFileContentByKey(key) {
        this.fileContents.delete(key);
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
            console.log(file);

            if (file.type !== 'text/csv' && file.type !== 'application/vnd.ms-excel')
                throw `Cannot read file type ${file.type}. Can only read text/csv or application/vnd.ms-excel files.`;
            var reader = new FileReader();
            reader.onload = event => {
                this.fileContents.set(id, event.target.result);
                console.log(`File content saved under id ${id}.`);

                resolve(event.target.result);
            };
            reader.onerror = (err) => {
                reject(err);
            };

            reader.readAsText(document.getElementById(id).files[0]);
        });
    }

    getJsonResults() {
        return Array.from(this.jsonResults.values());
    }
}
