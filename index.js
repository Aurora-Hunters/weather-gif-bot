/**
 * Load environment variables
 */
require('dotenv').config();

const TelegramBot = require('node-telegram-bot-api');
const bot = new TelegramBot(process.env.BOT_TOKEN, {polling: true});

const createSatelliteGif = require('./src/weather/index_sat');
const createCloudsGif = require('./src/weather/index_pre');

const fs = require('fs');
const path = require('path');
const downloadImage = require('./src/weather/tools/download-image');
const randomString = require('./src/weather/tools/randomString');

const PLACES = require('./src/weather/tools/places');

bot.on('polling_error', function(error){ console.log(error); });

bot.on('message', (msg) => {
    console.log(msg)
});

bot.onText(/\/cme_lollipop/, (msg, match) => {
    const chatId = msg.chat.id;

    const video = `https://iswa.gsfc.nasa.gov/IswaSystemWebApp/iSWACygnetStreamer?timestamp=2038-01-23+00%3A44%3A00&window=-1&cygnetId=261&t=${Date.now()}`;
    bot.sendChatAction(chatId, 'upload_video');
    bot.sendVideo(chatId, video);
});

bot.onText(/\/cme_pics/, (msg, match) => {
    const chatId = msg.chat.id;

    bot.sendChatAction(chatId, 'upload_photo');
    bot.sendMediaGroup(chatId, [
        {
            type: 'photo',
            media: `https://sohowww.nascom.nasa.gov/data/realtime/eit_171/512/latest.jpg?${Date.now()}`
        },
        {
            type: 'photo',
            media: `https://sohowww.nascom.nasa.gov/data/realtime/eit_195/512/latest.jpg?${Date.now()}`
        },
        {
            type: 'photo',
            media: `https://sohowww.nascom.nasa.gov/data/realtime/eit_284/512/latest.jpg?${Date.now()}`
        },
        {
            type: 'photo',
            media: `https://sohowww.nascom.nasa.gov/data/realtime/eit_304/512/latest.jpg?${Date.now()}`
        },
        {
            type: 'photo',
            media: `https://sohowww.nascom.nasa.gov/data/realtime/hmi_igr/512/latest.jpg?${Date.now()}`
        },
        {
            type: 'photo',
            media: `https://sohowww.nascom.nasa.gov/data/realtime/hmi_mag/512/latest.jpg?${Date.now()}`
        },
        {
            type: 'photo',
            media: `https://sohowww.nascom.nasa.gov/data/realtime/c2/512/latest.jpg?${Date.now()}`
        },
        {
            type: 'photo',
            media: `https://sohowww.nascom.nasa.gov/data/realtime/c3/512/latest.jpg?${Date.now()}`
        },
    ]);
});

bot.onText(/\/clouds_sat(.*)/, async (msg, match) => {
    const chatId = msg.chat.id;

    let place = match[1];

    /**
     * Remove bot's name
     */
    if (place.indexOf('@') !== -1) {
        place = place.substring(0, place.indexOf('@'));
    }

    /**
     * Remove _
     * @type {string}
     */
    place = place.substring(place.indexOf("_") + 1);

    if (place in PLACES) {
        bot.sendChatAction(chatId, 'upload_photo');
        const intervalObject = setInterval(() => {
            bot.sendChatAction(chatId, 'upload_photo');
        }, 3000);

        const gifPath = await createSatelliteGif(PLACES[place]);

        clearInterval(intervalObject);
        bot.sendChatAction(chatId, 'upload_video');
        bot.sendVideo(chatId, gifPath);
    } else {
        const message =
            `Satellite clouds maps for regions:\n` +
            `\n` +
            `/clouds_sat_LEN\n` +
            `\n` +
            `/clouds_sat_MSK\n` +
            `\n` +
            `/clouds_sat_KAR\n` +
            `\n` +
            `/clouds_sat_MUR\n`;

        bot.sendChatAction(chatId, 'typing');
        bot.sendMessage(chatId, message);
    }
});

bot.onText(/\/clouds_pre(.*)/, async (msg, match) => {
    const chatId = msg.chat.id;

    let place = match[1];

    /**
     * Remove bot's name
     */
    if (place.indexOf('@') !== -1) {
        place = place.substring(0, place.indexOf('@'));
    }

    /**
     * Remove _
     * @type {string}
     */
    place = place.substring(place.indexOf("_") + 1);

    if (place in PLACES) {
        bot.sendChatAction(chatId, 'upload_photo');
        const intervalObject = setInterval(() => {
            bot.sendChatAction(chatId, 'upload_photo');
        }, 3000);

        const gifPath = await createCloudsGif(PLACES[place]);

        clearInterval(intervalObject);
        bot.sendChatAction(chatId, 'upload_video');
        bot.sendVideo(chatId, gifPath);
    } else {
        const message =
            `Cloud coverage prediction for regions:\n` +
            `\n` +
            `/clouds_pre_LEN\n` +
            `\n` +
            `/clouds_pre_MSK\n` +
            `\n` +
            `/clouds_pre_KAR\n` +
            `\n` +
            `/clouds_pre_MUR\n`;

        bot.sendChatAction(chatId, 'typing');
        bot.sendMessage(chatId, message);
    }
});

const SEND_WITHOUT_DOWNLOAD = false;

bot.onText(/((Ш|ш)пиц)|((С|с)вал(ь?)бард)|((Г|г)румант)/, async (msg, match) => {
    const chatId = msg.chat.id;
    let photo = `https://aurorainfo.eu/aurora-live-cameras/svalbard-norway-all-sky-aurora-live-camera.jpg?t=${Date.now()}`;

    if (!SEND_WITHOUT_DOWNLOAD) {
        photo = await downloadImage(photo, path.join(__dirname, 'temp', `${randomString()}.jpg`));
    }

    bot.sendChatAction(chatId, 'upload_photo');
    await bot.sendPhoto(chatId, photo);

    if (!SEND_WITHOUT_DOWNLOAD) { try { fs.unlinkSync(photo) } catch (e) {} }
});

bot.onText(/(К|к)ирун(а|е)/, async (msg, match) => {
    const chatId = msg.chat.id;
    let photo = `https://aurorainfo.eu/aurora-live-cameras/kiruna-sweden-all-sky-aurora-live-camera.jpg?t=${Date.now()}`;

    if (!SEND_WITHOUT_DOWNLOAD) {
        photo = await downloadImage(photo, path.join(__dirname, 'temp', `${randomString()}.jpg`));
    }

    bot.sendChatAction(chatId, 'upload_photo');
    await bot.sendPhoto(chatId, photo);

    if (!SEND_WITHOUT_DOWNLOAD) { try { fs.unlinkSync(photo) } catch (e) {} }
});

bot.onText(/(П|п)ор(д?)жус/, async (msg, match) => {
    const chatId = msg.chat.id;

    let photos = [
        `https://aurorainfo.eu/aurora-live-cameras/porjus-sweden-north-view-sweden-aurora-live-camera.jpg?t=${Date.now()}`,
        `https://aurorainfo.eu/aurora-live-cameras/porjus-sweden-west-view-aurora-live-camera.jpg?t=${Date.now()}`,
        `https://aurorainfo.eu/aurora-live-cameras/porjus-sweden-east-view-sweden-aurora-live-camera.jpg?t=${Date.now()}`
    ];

    if (!SEND_WITHOUT_DOWNLOAD) {
        photos[0] = await downloadImage(photos[0], path.join(__dirname, 'temp', `${randomString()}.jpg`));
        photos[1] = await downloadImage(photos[1], path.join(__dirname, 'temp', `${randomString()}.jpg`));
        photos[2] = await downloadImage(photos[2], path.join(__dirname, 'temp', `${randomString()}.jpg`));
    }

    bot.sendChatAction(chatId, 'upload_photo');
    await bot.sendMediaGroup(chatId, [
        {
            type: 'photo',
            media: photos[0]
        },
        {
            type: 'photo',
            media: photos[1]
        },
        {
            type: 'photo',
            media: photos[2]
        },
    ]);

    if (!SEND_WITHOUT_DOWNLOAD) { try {
        fs.unlinkSync(photos[0]);
        fs.unlinkSync(photos[1]);
        fs.unlinkSync(photos[2]);
    } catch (e) {} }
});

bot.onText(/(А|а)биско/, async (msg, match) => {
    const chatId = msg.chat.id;

    let photo = `https://aurorainfo.eu/aurora-live-cameras/abisko-lights-over-lapland-sweden-aurora-live-camera.jpg?t=${Date.now()}`;

    if (!SEND_WITHOUT_DOWNLOAD) {
        photo = await downloadImage(photo, path.join(__dirname, 'temp', `${randomString()}.jpg`));
    }

    bot.sendChatAction(chatId, 'upload_photo');
    await bot.sendPhoto(chatId, photo);

    if (!SEND_WITHOUT_DOWNLOAD) { try { fs.unlinkSync(photo) } catch (e) {} }
});

bot.onText(/((Т|т)ромс((е|ё)?))|((Ш|ш)ибот(н?))/, async (msg, match) => {
    const chatId = msg.chat.id;

    let photo = `https://aurorainfo.eu/aurora-live-cameras/skibotn-norway-all-sky-aurora-live-camera.jpg?t=${Date.now()}`;

    if (!SEND_WITHOUT_DOWNLOAD) {
        photo = await downloadImage(photo, path.join(__dirname, 'temp', `${randomString()}.jpg`));
    }

    bot.sendChatAction(chatId, 'upload_photo');
    await bot.sendPhoto(chatId, photo);

    if (!SEND_WITHOUT_DOWNLOAD) { try { fs.unlinkSync(photo) } catch (e) {} }
});