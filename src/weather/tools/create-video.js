/**
 * Use videoshow package to compose the list of images to a gif
 * @see https://github.com/h2non/videoshow
 */
const videoshow = require('videoshow');

/**
 * Options list
 * @see https://github.com/h2non/videoshow#video-options
 *
 * @type {object}
 */
const options = {
    fps: 25,
    loop: 0.4, // seconds
    transition: false,
    videoBitrate: 1024,
    videoCodec: 'libx264',
    size: '760x760',
    audioBitrate: '128k',
    audioChannels: 2,
    format: 'mp4',
    pixelFormat: 'yuv420p'
};

/**
 * Run the converter
 * @param {string[]} imagesList — list of paths to images
 * @param {string} outputFile — filename for output video
 * @returns {Promise<any>}
 */
module.exports = function (imagesList, outputFile) {
    return new Promise((resolve, reject) => {
        videoshow(imagesList,options)
            .save(outputFile)
            .on('error', reject)
            .on('end', resolve)
    });
}