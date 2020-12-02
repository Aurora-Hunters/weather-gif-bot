/**
 * Load environment variables
 */
require('dotenv').config();

const TelegramBot = require('node-telegram-bot-api');
const bot = new TelegramBot(process.env.BOT_TOKEN, {polling: true});

bot.on('polling_error', function(error){ console.log(error); });

bot.on('message', (msg) => {
    console.log(msg)
});

bot.onText(/^\/cme$/, (msg, match) => {
    const chatId = msg.chat.id;

    video = `https://iswa.gsfc.nasa.gov/IswaSystemWebApp/iSWACygnetStreamer?timestamp=2038-01-23+00%3A44%3A00&window=-1&cygnetId=261&t=${Date.now()}`;
    bot.sendChatAction(chatId, 'upload_video');
    bot.sendVideo(chatId, video);
});

bot.onText(/^\/cme_pics$/, (msg, match) => {
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