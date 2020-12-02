const axios = require('axios');
const fs = require('fs');

/**
 * Download image file
 * @param {string} url — image source url
 * @param {string} imagePath — path to saved image
 * @returns {Promise<any>}
 */
module.exports = function (url, imagePath) {
    return axios({
        url,
        responseType: 'stream',
        headers: {
            'user-agent': 'TelegramBot (like TwitterBot)',
        }
    })
        .then(response => {
            return new Promise((resolve, reject) => {
                response.data
                    .pipe(fs.createWriteStream(imagePath))
                    .on('finish', () => {
                        resolve(imagePath)
                    })
                    .on('error', reject);
            })
        });
}