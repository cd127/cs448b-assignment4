const path = require('path');

module.exports = {
    entry: './index.js',
    output: {
        filename: 'js/bundle.js',
        path: path.resolve(__dirname, 'public')
    }
};
