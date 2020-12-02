const download_image = require('./tools/download-image');
const create_video = require('./tools/create-video');
const path = require('path');
const fs = require('fs');
const Jimp = require('jimp');

const PLACE = {
    LEN: 5063,
    KAR: 5023,
    MUR: 5069
}

const IS_FLASH = !false;

/**
 *
 * @param {Date} forecastDate — forecast datetime
 * @param {number} offset — number of hours after forecast time
 * @returns {string}
 */
const composeForecastLabel = function (forecastDate, offset) {
    const YEAR = forecastDate.getFullYear();
    const MONTH = forecastDate.getMonth() + 1;
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
const getFrame = async function (date, offset) {
    const LABEL = composeForecastLabel(date, offset);
    const place = PLACE.LEN;

    const imageUrl = `https://img4.meteologix.com/images/data/cache/model/model_moddeuhd${IS_FLASH ? '2' : ''}_${LABEL}_${place}_101.png`
    const imagePath = path.join(__dirname, 'output', 'pre', `${LABEL}.png`);

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
                .print(font, 655, 630, `${HOUR}:${MINUTE} MSK`)
                .print(font, 650, 650, `${DAY} ${MONTH} ${YEAR}`);
        })

    await newImage.write(imagePath);

    return imagePath
}


const framesLimit = 15;

module.exports = async () => {
    const frames = [];

    let now = new Date();
    let lastPredictionDate = new Date();

    now.setTime(now.getTime() - (3 * 60 * 60 * 1000));
    now.setSeconds(0);
    now.setMinutes(0);
    now.setMilliseconds(0);

    // console.log(now);

    let nowHours = now.getHours();

    lastPredictionDate.setTime(now.getTime() - ((((nowHours + 6) % 6) + 3) * 60 * 60 * 1000));

    if (!IS_FLASH) {
        lastPredictionDate.setTime(lastPredictionDate.getTime() - (3 * 60 * 60 * 1000));
    }

    const offset = (now - lastPredictionDate) / (60 * 60 * 1000)

    for (let i = 0; i < framesLimit; i++) {
        try {
            const imagePath = await getFrame(lastPredictionDate, offset + i);

            frames.push(imagePath);
        } catch (e) {
            console.error('❌️ Cannot save image because of', e);
        }
    }

    console.log(frames);

    // frames.reverse();

    /**
     * Create video file
     */
    try {
        const gifPath = path.join(__dirname, 'output', 'pre.mp4');

        await create_video(frames, gifPath);

        return gifPath;
    } catch (e) {
        console.error('⚠️ Cannot create a video because of', e);
    }
};


