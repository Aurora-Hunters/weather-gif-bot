const download_image = require('./tools/download-image');
const create_video = require('./tools/create-video');
const path = require('path');
const fs = require('fs');
const Jimp = require('jimp');
const PLACE = require('./tools/places');

/**
 *
 * @param {Date} forecastDate — forecast datetime
 * @param {number} offset — number of hours after forecast time
 * @returns {string}
 */
const composeForecastLabel = function (forecastDate) {
    const YEAR = forecastDate.getFullYear();
    const MONTH = forecastDate.getMonth() + 1;
    const DAY = `${forecastDate.getDate() < 10 ? '0' : ''}${forecastDate.getDate()}`;
    const HOUR = `${forecastDate.getHours() < 10 ? '0' : ''}${forecastDate.getHours()}`;
    const MINUTE = `${forecastDate.getMinutes() < 10 ? '0' : ''}${forecastDate.getMinutes()}`;

    return `${YEAR}_${MONTH}_${DAY}_${HOUR}_${MINUTE}`;
}

/**
 *
 * @param {Date} date
 * @returns {Promise<*>}
 */
const getFrame = async function (date, place) {
    const LABEL = composeForecastLabel(date);

    const imageUrl = `https://img4.kachelmannwetter.com/images/data/cache/sat/sat_${LABEL}_${place}_543.jpg`
    const imagePath = path.join(__dirname, 'output', 'sat', `${place}_${LABEL}.png`);

    const dateTz = new Date();

    dateTz.setTime(date.getTime() + (3 * 60 * 60 * 1000));

    if (fs.existsSync(imagePath)) {
        console.log(`File exists. ${imagePath}`);
        return imagePath;
    }

    console.log(`Downloading... ${imagePath}`);
    await download_image(imageUrl, imagePath);

    const mapImage = await Jimp.read(path.join(__dirname, 'assets', 'map', `${place}.png`));
    const footerImage = await Jimp.read(path.join(__dirname, 'assets', 'footer', 'satellite.png'));
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

    return imagePath;
}

const framesLimit = 15;

module.exports = async (place = PLACE.LEN) => {
    const framesPromises = [];
    let now = new Date();

    now.setTime(now.getTime() - (3 * 60 * 60 * 1000));
    now.setSeconds(0);
    now.setMilliseconds(0);

    let nowMinutes = now.getMinutes();

    now.setTime(now.getTime() - ((((nowMinutes + 15) % 15) + 30) * 60 * 1000));

    for (let i = 0; i < framesLimit; i++) {
        const date = new Date(now - (15 * 60 * 1000) * i);

        framesPromises.push(getFrame(date, place));
    }

    const frames = await Promise.all(framesPromises);

    frames.forEach(frame => console.log);

    console.log(frames);

    frames.reverse();

    /**
     * Create video file
     */
    try {
        const datestamp = `${now.getFullYear()}${now.getMonth()}${now.getDate()}-${now.getHours()}-${now.getMinutes()}`;
        const gifPath = path.join(__dirname, 'output', `${place}_${datestamp}_sat.mp4`);

        if (fs.existsSync(gifPath)) {
            return gifPath;
        }

        await create_video(frames, gifPath);

        return gifPath;
    } catch (e) {
        console.error('⚠️ Cannot create a video because of', e);
    }
};


