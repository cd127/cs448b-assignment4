var dataReader = new DataReader();
var isDataSetsAvailable = false;

var app = new Vue({
    el: '#data-load',
    data: {
        message: 'Hello Vue!',
        requiredHeaders: ['dateStart', 'title', 'latitude', 'longitude', 'description'],
        numDataFields: 1,
        headers: [[], [], []],
        headerMappings: [{}, {}, {}],
        mappingsComplete: false
    },
    methods: {
        loadData: function(event) {
            let id = event.target.name;
            dataReader.readFileAsString(id).then(
                fileContent => {
                    // console.log(res);
                    // this.headers.push(dataReader.getHeaders(fileContent));
                    console.log('Headers : ' + dataReader.getHeaders(id));
                    switch (id) {
                        case 'input1':
                            this.headers[0].length = 0;
                            dataReader.getHeaders(id).forEach(header => {
                                this.headers[0].push(header);
                            });
                            break;
                        case 'input2':
                            this.headers[1].length = 0;
                            dataReader.getHeaders(id).forEach(header => {
                                this.headers[1].push(header);
                            });
                            break;
                        case 'input3':
                            this.headers[2].length = 0;
                            dataReader.getHeaders(id).forEach(header => {
                                this.headers[2].push(header);
                            });
                            break;
                        default: // Do nothing.
                    }
                },
                err => {
                    console.log(err);
                }
            );
        },
        handleAddDataSet: function() {
            this.numDataFields++;
            this.checkMapping();
        },
        checkMapping: function() {
            try {
                for (let i = 0; i < this.numDataFields; i++) {
                    this.requiredHeaders.forEach(req => {
                        if (this.headerMappings[i][req] === undefined) {
                            throw 'Mappings incomplete.';
                        }
                    });
                }
                this.mappingsComplete = true;
                console.log('mappings complete!');
            } catch (err) {
                this.mappingsComplete = false;
            }
        },
        handleVisualize: function(event) {
            $(event.target).css('visibility', 'hidden');
            $('#data-load').css('visibility', 'hidden');
            $('#map-view').css('visibility', 'visible');

            let promises = [];

            for (let i = 0; i < this.numDataFields; i++) {
                let headers = this.headers[i];
                let headerMapping = this.headerMappings[i];
                let id = `input${i + 1}`;
                for (var newHeader in headerMapping) {
                    let oldHeader = headerMapping[newHeader];

                    headers = headers.map(header => {
                        if (header === oldHeader) return newHeader;
                        return header;
                    });
                }
                dataReader.setHeaders(headers, id);
                promises.push(dataReader.getJSONFromFile(id));
            }

            Promise.all(promises).then(jsonResults => {
                // Data has been fully parsed. Do something.
                isDataSetsAvailable = true;
            });
        }
    }
});
