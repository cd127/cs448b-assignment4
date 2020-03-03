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
        getFilteredHeaders: function(index) {
            return this.headers[index];
        },
        loadData: function(event) {
            let id = event.target.name;
            let index = parseInt(event.target.name.match(/-(.*)/g)[0].slice(1));

            dataReader.readFileAsString(id).then(
                fileContent => {
                    console.log('Headers : ' + dataReader.getHeaders(id));
                    this.headers[index].length = 0;
                    dataReader.getHeaders(id).forEach(header => {
                        this.headers[index].push(header);
                    });
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
        handleSelect: function(event) {
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
                let id = `input-${i}`;
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
                // console.log(jsonResults[0][0]);
                // console.log(jsonResults[1][0]);
                console.log(dataReader.getJsonResults());
                isDataSetsAvailable = true;
            });
        }
    }
});
