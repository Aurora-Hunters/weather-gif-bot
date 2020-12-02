const download_image = require('./tools/download-image');
const create_video = require('./tools/create-video');
const Jimp = require('jimp');

/**
 *
 * @param {Date} forecastDate — forecast datetime
 * @param {number} offset — number of hours after forecast time
 * @returns {string}
 */
const composeForecastLabel = function (forecastDate, offset) {
    const YEAR = forecastDate.getFullYear();
    const MONTH = forecastDate.getMonth() + 1;
    const DAY = forecastDate.getDate();
    const HOUR = `${forecastDate.getHours() < 10 ? '0' : ''}${forecastDate.getHours()}`;

    return `${YEAR}${MONTH}${DAY}${HOUR}_${offset}`;
}

/**
 * Detect the nearest forecast date
 * @param {Date} targetDate
 */
const getForecastDate = function (targetDate) {
    /**
     * Prepare forecast creation date
     * @type {Date}
     */
    const forecastDate = new Date(targetDate - (6 * 60 * 60 * 1000));

    return forecastDate;
};

/**
 * Download frame image for target hour
 * @param {boolean} isFlashForecast — Use flash (1 day) forecast or left base (5 days)
 * @param {number} hoursOffset — hours offset forecast
 * @returns {Promise<void>}
 */
const getPredictionFrame = async function (isFlashForecast = true, hoursOffset = 0) {
    /**
     * Get current timestamp without feature time offset
     * @type {Date}
     */
    const date = new Date();

    const forecastDate = getForecastDate(date);

        /**
     * Update target date with offset
     */
    date.setTime(date.getTime() + (hoursOffset * 60 * 60 * 1000));


    const targetHours = date.getHours();
    console.log('date', date);

    console.log('forecastDate', forecastDate);

    // /** For long forecast 5 days */
    // let forecastTime = Math.ceil(forecastDate.getHours() / 6) * 6; // 00, 06, 12, 18 — hour in UTC
    forecastDate.setHours(Math.floor(forecastDate.getHours() / 6) * 6);

    if (isFlashForecast) {
        forecastDate.setHours(forecastDate.getHours() - 3);
    }

    // /** For flash forecast 1 day */
    // const forecastTime = '21'; // 03, 09, 15, 21 — hour in UTC

    /**
     * targetHours + 1 — rounded up hour
     * forecastTime — forecast creation time
     * 24 — addition for positive result after dividing
     *
     * @type {number}
     */
    // let offset = (targetHours + 1 - forecastDate.getHours() + 24) % 24;
    let offset = (targetHours + 1 - forecastDate.getHours());

    console.log(offset);

    if (offset < 27) {
        offset += 24;
    }

    /**
     * Cause time in UTC
     *
     * @type {number}
     */
    offset -= 3;

    // if (offset < 1) {
    //     offset += 24;
    // }

    /**
     * Compose image label
     * @type {string}
     */
    // const label = `${forecastDate.getFullYear()}${forecastDate.getMonth() + 1}${forecastDate.getDate()}${forecastDate.getHours() < 10 ? '0' : ''}${forecastDate.getHours()}_${offset}`;
    const label = composeForecastLabel(forecastDate, offset);

    /**
     * Compose image URL
     * @type {string}
     */
    // const imageUrl = `https://img1.meteologix.com/images/data/cache/model/download_model-en-337-0_moddeuhd${isFlashForecast ? '2' : ''}_${label}_5063_101.png`
    const imageUrl = `https://img4.meteologix.com/images/data/cache/model/model_moddeuhd${isFlashForecast ? '2' : ''}_${label}_5063_101.png`;

    /**
     *
     * @type {string}
     */
    const imagePath = `output/${label}.png`;

    console.log(`Downloading... ${imagePath}`);

    await download_image(imageUrl, imagePath);

    const mapImage = await Jimp.read(`./map.png`);
    const footerImage = await Jimp.read(`./footer-pre.png`);
    const satImage = await Jimp.read(imagePath);
    let newImage = new Jimp(760, 760);

    newImage = await newImage
        .composite(satImage, 0, 0)
        .composite(footerImage, 0, 0)
        .composite(mapImage, 0, 0);

    newImage = await Jimp
        .loadFont(Jimp.FONT_SANS_16_WHITE)
        .then(font => {
            const YEAR = forecastDate.getFullYear();
            const MONTH = forecastDate.toLocaleString('default', { month: 'short' });
            const DAY = forecastDate.getDate();

            const HOUR = `${forecastDate.getHours() < 10 ? '0' : ''}${forecastDate.getHours()}`;
            const MINUTE = `${forecastDate.getMinutes() < 10 ? '0' : ''}${forecastDate.getMinutes()}`;

            return newImage
                .print(font, 655, 630, `${HOUR}:${MINUTE} MSK`)
                .print(font, 650, 650, `${DAY} ${MONTH} ${YEAR}`);
        })

    await newImage.write(imagePath);

    return imagePath
}

/**
 * Use flash (1 day) forecast or left base (5 days)
 * @type {boolean}
 */
const isFlashForecast = true;
const framesLimit = 19;
const frames = [];

(async () => {
    for (let i = 0; i < framesLimit; i++) {
        try {
            const imagePath = await getPredictionFrame(isFlashForecast, i);

            frames.push(imagePath);
        } catch (e) {
            console.error('❌️ Cannot save image because of', e);
        }
    }

    console.log(frames);

    /**
     * Create video file
     */
    try {
        await create_video(frames, 'output/video.mp4');
    } catch (e) {
        console.error('⚠️ Cannot create a video because of', e);
    }
})();


