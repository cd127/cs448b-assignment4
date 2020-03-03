var express = require('express');
var app = express();
var path = require('path');
var MapboxClient = require('mapbox');
var client = new MapboxClient(
    'pk.eyJ1IjoibmF0aGFuc29vbWlubGVlIiwiYSI6ImNrNnkxeW95ZjBvbjczbnFvZW1lODJkM2cifQ.yrQDHliVfqo82qLTgSYiqw' // Nathan's access token
);

// viewed at http://localhost:8080
app.get('/', function(req, res) {
    res.sendFile(path.join(__dirname + '/index.html'));
});
app.use('/public', express.static('public'));
app.listen(process.env.PORT || 8080, function() {
    console.log('SERVER STARTED PORT: 8080');
});

// Backend API calls
app.get('/api/test', function(req, res) {
    (async () => {
        let geocode = await client.geocodeForward('Chester, NJ');
        console.log(geocode);

        res.json(geocode);
    })();
});
