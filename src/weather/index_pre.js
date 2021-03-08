const download_image = require('./tools/download-image');
const create_video = require('./tools/create-video');
const path = require('path');
const fs = require('fs');
const Jimp = require('jimp');
const PLACE = require('./tools/places');

const IS_FLASH = false;

/**
 *
 * @param {Date} forecastDate — forecast datetime
 * @param {number} offset — number of hours after forecast time
 * @returns {string}
 */
const composeForecastLabel = function (forecastDate, offset) {
    const YEAR = forecastDate.getFullYear();
    const MONTH = `${(forecastDate.getMonth() + 1) < 10 ? '0' : ''}${forecastDate.getMonth() + 1}`;
    const DAY = `${forecastDate.getDate() < 10 ? '0' : ''}${forecastDate.getDate()}`;
    const HOUR = `${forecastDate.getHours() < 10 ? '0' : ''}${forecastDate.getHours()}`;

    offset = `${offset < 10 ? '0' : ''}${offset}`;

    return `${YEAR}${MONTH}${DAY}${HOUR}_${offset}`;
}

/**
 *
 * @param {Date} date
 * @returns {Promise<*>}
 */
const getFrame = async function (date, offset, place) {
    const LABEL = composeForecastLabel(date, offset);

    const imageUrl = `https://img4.meteologix.com/images/data/cache/model/model_moddeuhd${IS_FLASH ? '2' : ''}_${LABEL}_${place}_101.png`
    const imagePath = path.join(__dirname, 'output', 'pre', `${place}_${LABEL}.png`);

    const dateTz = new Date();

    dateTz.setTime(date.getTime() + ((3 + offset) * 60 * 60 * 1000));

    if (fs.existsSync(imagePath)) {
        console.log(`File exists. ${imagePath}`);
        return imagePath;
    }

    console.log(`Downloading... ${imagePath}`);

    await download_image(imageUrl, imagePath);

    // const mapImage = await Jimp.read(`./map-${place}.png`);
    // const footerImage = await Jimp.read(`./footer-pre.png`);

    const mapImage = await Jimp.read(path.join(__dirname, 'assets', 'map', `${place}.png`));
    const footerImage = await Jimp.read(path.join(__dirname, 'assets', 'footer', 'clouds.png'));
    const satImage = await Jimp.read(imagePath);
    let newImage = new Jimp(760, 760);

    newImage = await newImage
        .composite(satImage, 0, 0)
        .composite(footerImage, 0, 0)
        .composite(mapImage, 0, 0);

    newImage = await Jimp
        .loadFont(Jimp.FONT_SANS_16_WHITE)
        .then(font => {
            const YEAR = dateTz.getFullYear();
            const MONTH = dateTz.toLocaleString('default', { month: 'short' });
            const DAY = dateTz.getDate();

            const HOUR = `${dateTz.getHours() < 10 ? '0' : ''}${dateTz.getHours()}`;
            const MINUTE = `${dateTz.getMinutes() < 10 ? '0' : ''}${dateTz.getMinutes()}`;

            return newImage
                .print(font, 655, 620, `${HOUR}:${MINUTE} MSK`)
                .print(font, 650, 640, `${DAY} ${MONTH} ${YEAR}`);
        })

    await newImage.write(imagePath);

    return imagePath
}


const framesLimit = 25;

module.exports = async (place = PLACE.LEN) => {
    let frames = [];
    let now = new Date();
    let lastPredictionDate = new Date();

    now.setTime(now.getTime() - (3 * 60 * 60 * 1000));
    now.setSeconds(0);
    now.setMinutes(0);
    now.setMilliseconds(0);

    let nowHours = now.getHours();

    lastPredictionDate.setTime(now.getTime() - ((((nowHours + 6) % 6) + 3) * 60 * 60 * 1000));

    if (!IS_FLASH) {
        lastPredictionDate.setTime(lastPredictionDate.getTime() - (3 * 60 * 60 * 1000));
    }

    const offset = (now - lastPredictionDate) / (60 * 60 * 1000)

    /** Use promises? */
    if (!true) {
        const framesPromises = [];

        for (let i = 0; i < framesLimit; i++) {
            framesPromises.push(getFrame(lastPredictionDate, offset + i, place));
        }

        frames = await Promise.all(framesPromises);
    } else {
        for (let i = 0; i < framesLimit; i++) {
            frames.push(await getFrame(lastPredictionDate, offset + i, place));
        }
    }

    console.log(frames);

    /**
     * Create video file
     */
    try {
        const datestamp = `${now.getFullYear()}${now.getMonth()}${now.getDate()}-${now.getHours()}-${now.getMinutes()}`;
        // const gifPath = path.join(__dirname, 'output', `${place}_${datestamp}_pre.mp4`);

        const gifPath = path.join(__dirname, 'output', `pre_${place}_latest.mp4`);

        // if (fs.existsSync(gifPath)) {
        //     return gifPath;
        // }

        await create_video(frames, gifPath);

        return gifPath;
    } catch (e) {
        console.error('⚠️ Cannot create a video because of', e);
    }
};


