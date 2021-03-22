const fs = require('fs');
const path = require('path');

/**
 * Create a directory if not exists
 * @param {string} pathChunks
 * @returns {string}
 */
module.exports = (...pathChunks) => {
    const DIR_PATH = path.join(...pathChunks);

    if (!fs.existsSync(DIR_PATH)) {
        fs.mkdirSync(DIR_PATH, { recursive: true });
    }

    return DIR_PATH;
}
