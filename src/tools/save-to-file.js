const fs = require('fs');

module.exports = function (data, filename) {
    fs.writeFileSync(filename, data, 'utf8');
}