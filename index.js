/**
 * Load environment variables
 */
require("dotenv").config();

const { PostHog } = require("posthog-node");

const posthog = new PostHog(process.env.POSTHOG_API_KEY, {
  host: "https://eu.i.posthog.com",
});

const TelegramBot = require("node-telegram-bot-api");
const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });
let botInfo = {};

const createSatelliteGif = require("./src/index_sat");
const createCloudsGif = require("./src/index_pre");
const createThundersGif = require("./src/index_thunder");

const fs = require("fs");
const path = require("path");
const downloadImage = require("./src/tools/download-image");
const randomString = require("./src/tools/randomString");
const ffmpeg = require("./src/tools/ffmpeg");

const PLACES = require("./src/tools/places");
const SOLAR_HOLES = [
  "0094",
  "0131",
  "0171",
  "0193",
  "0211",
  "0304",
  "0335",
  "1600",
  "1700",
];
const SOLAR_PLOTS = ["HMIIF", "HMIBC"];

bot.on("polling_error", function (error) {
  console.log(error);
});

bot.on("message", async (msg) => {
  console.log(msg);
});

const cron = require("node-cron");

/**
 * First set up
 */
(async () => {
  botInfo = await bot.getMe();

  for (const [name, code] of Object.entries(PLACES)) {
    try {
      await createThundersGif(code);
      await createSatelliteGif(code);
      await createCloudsGif(code);
    } catch (error) {
      console.error(`Error processing ${name}:`, error);
    }
  }

  cron.schedule("*/15 * * * *", async () => {
    for (const [name, code] of Object.entries(PLACES)) {
      try {
        await createThundersGif(code);
        await createSatelliteGif(code);
        await createCloudsGif(code);
      } catch (error) {
        console.error(`Error processing ${name}:`, error);
      }
    }
  });
})();

/**
 * Check if we need to remove and ignore user's message
 *
 * Returns false if message
 */
const doesBotNeedToIgnoreMessage = async (msg, needToRemoveMessage = false) => {
  /**
   * Allow to use in private messages
   */
  if (["private"].includes(msg.chat.type)) return;

  /**
   * if bot has admin rights then
   * - allow messages only from admins
   * - remove all other messages
   *
   * if bot is a user in a group then it should process everything
   */
  if (["group", "supergroup"].includes(msg.chat.type)) {
    const adminsList = await bot.getChatAdministrators(msg.chat.id);
    const adminIds = adminsList.map((admin) => {
      return admin.user.id;
    });

    /**
     * Check if bot is admin
     */
    if (adminIds.includes(botInfo.id)) {
      /**
       * If the message from an admin then ok
       */
      if (adminIds.includes(msg.from.id)) {
        return;
      }

      /**
       * If the message from the regular user then check
       * to remove it and then do nothing
       */
      if (needToRemoveMessage) {
        try {
          await bot.deleteMessage(msg.chat.id, msg.message_id);
        } catch (e) {
          console.log(e);
        }
      }

      /**
       * Skip message processing
       */
      return true;
    }
  }

  /**
   * Allow to process message
   */
};

bot.onText(/\/start/, async (msg, match) => {
  if (await doesBotNeedToIgnoreMessage(msg, true)) return;

  posthog.capture({
    distinctId: msg.chat.id,
    event: "command:start",
  });

  const chatId = msg.chat.id;
  const message =
    `Hello. I can show you weather data from satellites and cloud coverage prediction.\n` +
    `\n` +
    `Solar wind params /graph_all\n` +
    `\n` +
    `Clouds from satellite for past 2 hours /clouds_sat\n` +
    `Cloud coverage prediction for future 25 hours /clouds_pre\n` +
    `\n` +
    `Show webcams /webcam`;

  const options = {};
  if (msg.is_topic_message) {
    options.message_thread_id = msg.message_thread_id;
  }

  bot.sendChatAction(chatId, "typing");
  bot.sendMessage(chatId, message, options);
});

bot.onText(/^\/commands(@\w+)?$/, async (msg, match) => {
  if (await doesBotNeedToIgnoreMessage(msg, true)) return;

  const chatId = msg.chat.id;
  let message =
    `/start\n` +
    `/commands — this list\n` +
    `\n` +
    `/solar — sun images and gifs\n` +
    `\n` +
    `/webcam — list of available webcams\n` +
    `\n` +
    `/clouds_sat — available regions for satellite maps\n` +
    `/clouds_pre — available regions for clouds coverage prediction\n` +
    `/clouds_thunder — available regions for thunderstorm prediction\n` +
    `\n`;

  for (const [name, code] of Object.entries(PLACES)) {
    message += `/clouds_sat_${name}\n` + `/clouds_pre_${name}\n` + `\n`;
  }

  const options = {};
  if (msg.is_topic_message) {
    options.message_thread_id = msg.message_thread_id;
  }

  bot.sendChatAction(chatId, "typing");
  bot.sendMessage(chatId, message, options);
});

bot.onText(/(^\/cme_lollipop(@\w+)?$)|((Л|л)еденец)/, async (msg, match) => {
  if (await doesBotNeedToIgnoreMessage(msg, true)) return;

  const chatId = msg.chat.id;

  let date =
    new Date().toISOString().slice(0, 10) +
    "+" +
    new Date().toISOString().slice(11, 19);
  let video = `https://iswa.gsfc.nasa.gov/IswaSystemWebApp/iSWACygnetStreamer?timestamp=${date}&window=-1&cygnetId=261&t=`;

  bot.sendChatAction(chatId, "upload_video");

  video = await downloadImage(
    video,
    path.join(__dirname, "temp", `${randomString()}.gif`)
  );

  bot.sendChatAction(chatId, "upload_video");

  ffmpeg()
    .input(video)
    .outputOption(["-y", "-pix_fmt yuv420p"])
    .on("end", async function (stdout, stderr) {
      console.log("Transcoding succeeded!");

      video += ".mp4";

      const options = {};
      if (msg.is_topic_message) {
        options.message_thread_id = msg.message_thread_id;
      }

      await bot.sendVideo(chatId, video, options);

      try {
        fs.unlinkSync(video);
      } catch (e) {}
    })
    .save(`${video}.mp4`);
});

bot.onText(/^\/solar(@\w+)?$/, async (msg, match) => {
  if (await doesBotNeedToIgnoreMessage(msg, true)) return;

  const chatId = msg.chat.id;
  let message =
    `/space_weather — X-Ray Flux, Proton Flux, Geomagnetic activity\n` +
    `\n` +
    `/solar_map — handwritten map\n` +
    `\n` +
    `/solar_holes\n` +
    `/solar_plots\n` +
    `\n` +
    `48h movies:\n`;

  SOLAR_HOLES.forEach((element) => {
    message += `/solar_holes_${element}\n`;
  });

  SOLAR_PLOTS.forEach((element) => {
    message += `/solar_plots_${element}\n`;
  });

  const options = {};
  if (msg.is_topic_message) {
    options.message_thread_id = msg.message_thread_id;
  }

  bot.sendChatAction(chatId, "typing");
  bot.sendMessage(chatId, message, options);
});

bot.onText(/^\/space_weather(@\w+)?$/, async (msg, match) => {
  if (await doesBotNeedToIgnoreMessage(msg, true)) return;

  posthog.capture({
    distinctId: msg.chat.id,
    event: "command:space_weather",
  });

  const chatId = msg.chat.id;

  const mediaGroup = [
    {
      type: "photo",
      media: `https://services.swpc.noaa.gov/images/swx-overview-large.gif?${Date.now()}`,
    },
  ];

  const options = {};
  if (msg.is_topic_message) {
    options.message_thread_id = msg.message_thread_id;
  }

  bot.sendChatAction(chatId, "upload_photo");
  bot.sendMediaGroup(chatId, mediaGroup, options);
});

bot.onText(/((Р|р)укопись)|(^\/solar_map(@\w+)?$)/, async (msg, match) => {
  if (await doesBotNeedToIgnoreMessage(msg, true)) return;

  const chatId = msg.chat.id;

  const mediaGroup = [
    {
      type: "photo",
      media: `https://services.swpc.noaa.gov/images/synoptic-map.jpg?${Date.now()}`,
    },
  ];

  const options = {};
  if (msg.is_topic_message) {
    options.message_thread_id = msg.message_thread_id;
  }

  bot.sendChatAction(chatId, "upload_photo");
  bot.sendMediaGroup(chatId, mediaGroup, options);
});

bot.onText(/^\/solar_holes(@\w+)?$/, async (msg, match) => {
  if (await doesBotNeedToIgnoreMessage(msg, true)) return;

  const chatId = msg.chat.id;
  const size = 1024;

  const mediaGroup = [];

  SOLAR_HOLES.forEach((element) => {
    mediaGroup.push({
      type: "photo",
      media: `https://sdo.gsfc.nasa.gov/assets/img/latest/latest_${size}_${element}.jpg?${Date.now()}`,
    });
  });

  const options = {};
  if (msg.is_topic_message) {
    options.message_thread_id = msg.message_thread_id;
  }

  bot.sendChatAction(chatId, "upload_photo");
  bot.sendMediaGroup(chatId, mediaGroup, options);
});

bot.onText(/\/graph_all/, async (msg, match) => {
  if (await doesBotNeedToIgnoreMessage(msg, true)) return;

  posthog.capture({
    distinctId: msg.chat.id,
    event: "command:graph_all",
  });

  const chatId = msg.chat.id;
  const mediaGroup = [];
  const GRAPHS = [
    {
      name: "bz",
      url: "https://auroralights.ru/renders/copyright/Bz-3h.png",
    },
    {
      name: "speed",
      url: "https://auroralights.ru/renders/copyright/speed+arrival-3h.png",
    },
    {
      name: "density",
      url: "https://auroralights.ru/renders/copyright/density-3h.png",
    },
    {
      name: "bt",
      url: "https://auroralights.ru/renders/copyright/Bt-3h.png",
    },
  ];

  GRAPHS.forEach((element) => {
    mediaGroup.push({
      type: "photo",
      media: `${element.url}?${Date.now()}`,
    });
  });

  const options = {};
  if (msg.is_topic_message) {
    options.message_thread_id = msg.message_thread_id;
  }

  bot.sendChatAction(chatId, "upload_photo");
  bot.sendMediaGroup(chatId, mediaGroup, options);
});

bot.onText(/^\/magnetometers?$/, async (msg, match) => {
  if (await doesBotNeedToIgnoreMessage(msg, true)) return;

  posthog.capture({
    distinctId: msg.chat.id,
    event: "command:magnetometers",
  });

  const chatId = msg.chat.id;

  let imageUrl = `https://flux.phys.uit.no/cgi-bin/mkstackplot.cgi?GifOnly&&comp=H&fin=&Sync=&?${Date.now()}`;

  const options = {};
  if (msg.is_topic_message) {
    options.message_thread_id = msg.message_thread_id;
  }

  bot.sendChatAction(chatId, "upload_photo");
  bot.sendPhoto(chatId, imageUrl, options);
});

bot.onText(/^\/solar_holes_(\d{4})(@\w+)?$/, async (msg, match) => {
  if (await doesBotNeedToIgnoreMessage(msg, true)) return;

  const chatId = msg.chat.id;
  const element = match[1];
  const mediaGroup = [];

  if (element in SOLAR_HOLES) return;

  mediaGroup.push({
    type: "video",
    media: `https://sdo.gsfc.nasa.gov/assets/img/latest/mpeg/latest_512_${element}.mp4?${Date.now()}`,
  });

  const options = {};
  if (msg.is_topic_message) {
    options.message_thread_id = msg.message_thread_id;
  }

  bot.sendChatAction(chatId, "upload_video");
  bot.sendMediaGroup(chatId, mediaGroup, options);
});

bot.onText(/^\/solar_plots(@\w+)?$/, async (msg, match) => {
  if (await doesBotNeedToIgnoreMessage(msg, true)) return;

  const chatId = msg.chat.id;
  const size = 1024;

  const mediaGroup = [];

  SOLAR_PLOTS.forEach((element) => {
    mediaGroup.push({
      type: "photo",
      media: `https://sdo.gsfc.nasa.gov/assets/img/latest/latest_${size}_${element}.jpg?${Date.now()}`,
    });
  });

  const options = {};
  if (msg.is_topic_message) {
    options.message_thread_id = msg.message_thread_id;
  }

  bot.sendChatAction(chatId, "upload_photo");
  bot.sendMediaGroup(chatId, mediaGroup, options);
});

bot.onText(/^\/solar_plots_(\w{5})(@\w+)?$/, async (msg, match) => {
  if (await doesBotNeedToIgnoreMessage(msg, true)) return;

  const chatId = msg.chat.id;
  const element = match[1];
  const mediaGroup = [];

  if (element in SOLAR_PLOTS) return;

  mediaGroup.push({
    type: "video",
    media: `https://sdo.gsfc.nasa.gov/assets/img/latest/mpeg/latest_512_${element}.mp4?${Date.now()}`,
  });

  const options = {};
  if (msg.is_topic_message) {
    options.message_thread_id = msg.message_thread_id;
  }

  bot.sendChatAction(chatId, "upload_video");
  bot.sendMediaGroup(chatId, mediaGroup, options);
});

bot.onText(/^\/clouds_sat(.*)(@\w+)?$/, async (msg, match) => {
  if (await doesBotNeedToIgnoreMessage(msg, true)) return;

  const chatId = msg.chat.id;

  let place = match[1];

  /**
   * Remove bot's name
   */
  if (place.indexOf("@") !== -1) {
    place = place.substring(0, place.indexOf("@"));
  }

  /**
   * Remove _
   * @type {string}
   */
  place = place.substring(place.indexOf("_") + 1);

  const options = {};
  if (msg.is_topic_message) {
    options.message_thread_id = msg.message_thread_id;
  }

  if (place in PLACES) {
    const gifPath = path.join(
      __dirname,
      "output",
      `sat_${PLACES[place]}_latest.mp4`
    );

    if (!fs.existsSync(gifPath)) {
      const message = `Gif is not ready. Try again in 15 minutes.`;

      bot.sendChatAction(chatId, "typing");
      bot.sendMessage(chatId, message, options);
      return;
    }

    bot.sendChatAction(chatId, "upload_video");
    bot.sendVideo(chatId, gifPath, options);
  } else {
    const message =
      `Satellite clouds maps for regions:\n` +
      `\n` +
      `/clouds_sat_EUROPE\n` +
      `\n` +
      `/clouds_sat_LENINGRAD\n` +
      `\n` +
      `/clouds_sat_KARELIA\n` +
      `\n` +
      `/clouds_sat_MURMANSK\n` +
      `\n` +
      `/clouds_sat_PSKOV\n` +
      `\n` +
      `/clouds_sat_TVER\n` +
      `\n` +
      `/clouds_sat_MOSCOW\n`;

    bot.sendChatAction(chatId, "typing");
    bot.sendMessage(chatId, message, options);
  }
});

bot.onText(/^\/clouds_pre(.*)(@\w+)?$/, async (msg, match) => {
  if (await doesBotNeedToIgnoreMessage(msg, true)) return;

  const chatId = msg.chat.id;

  let place = match[1];

  /**
   * Remove bot's name
   */
  if (place.indexOf("@") !== -1) {
    place = place.substring(0, place.indexOf("@"));
  }

  const options = {};
  if (msg.is_topic_message) {
    options.message_thread_id = msg.message_thread_id;
  }

  /**
   * Remove _
   * @type {string}
   */
  place = place.substring(place.indexOf("_") + 1);

  if (place in PLACES) {
    const gifPath = path.join(
      __dirname,
      "output",
      `pre_${PLACES[place]}_latest.mp4`
    );

    if (!fs.existsSync(gifPath)) {
      const message = `Gif is not ready. Try again in 15 minutes.`;

      bot.sendChatAction(chatId, "typing");
      bot.sendMessage(chatId, message, options);
      return;
    }

    bot.sendChatAction(chatId, "upload_video");
    bot.sendVideo(chatId, gifPath, options);
  } else {
    const message =
      `Cloud coverage prediction for regions:\n` +
      `\n` +
      `/clouds_pre_EUROPE\n` +
      `\n` +
      `/clouds_pre_LENINGRAD\n` +
      `\n` +
      `/clouds_pre_KARELIA\n` +
      `\n` +
      `/clouds_pre_MURMANSK\n` +
      `\n` +
      `/clouds_pre_PSKOV\n` +
      `\n` +
      `/clouds_pre_TVER\n` +
      `\n` +
      `/clouds_pre_MOSCOW\n`;

    bot.sendChatAction(chatId, "typing");
    bot.sendMessage(chatId, message, options);
  }
});

bot.onText(/^\/clouds_thunder(.*)(@\w+)?$/, async (msg, match) => {
  if (await doesBotNeedToIgnoreMessage(msg, true)) return;

  const chatId = msg.chat.id;

  let place = match[1];

  /**
   * Remove bot's name
   */
  if (place.indexOf("@") !== -1) {
    place = place.substring(0, place.indexOf("@"));
  }

  const options = {};
  if (msg.is_topic_message) {
    options.message_thread_id = msg.message_thread_id;
  }

  /**
   * Remove _
   * @type {string}
   */
  place = place.substring(place.indexOf("_") + 1);

  if (place in PLACES) {
    const gifPath = path.join(
      __dirname,
      "output",
      `thunder_${PLACES[place]}_latest.mp4`
    );

    if (!fs.existsSync(gifPath)) {
      const message = `Gif is not ready. Try again in 15 minutes.`;

      bot.sendChatAction(chatId, "typing");
      bot.sendMessage(chatId, message, options);
      return;
    }

    bot.sendChatAction(chatId, "upload_video");
    bot.sendVideo(chatId, gifPath, options);
  } else {
    const message =
      `Thunderstorms prediction for regions:\n` +
      `\n` +
      `/clouds_thunder_EUROPE\n` +
      `\n` +
      `/clouds_thunder_LENINGRAD\n` +
      `\n` +
      `/clouds_thunder_KARELIA\n` +
      `\n` +
      `/clouds_thunder_MURMANSK\n` +
      `\n` +
      `/clouds_thunder_PSKOV\n` +
      `\n` +
      `/clouds_thunder_TVER\n` +
      `\n` +
      `/clouds_thunder_MOSCOW\n`;

    bot.sendChatAction(chatId, "typing");
    bot.sendMessage(chatId, message, options);
  }
});

const SEND_WITHOUT_DOWNLOAD = !false;

const dataSources = [
  /**
   * Norway
   */
  // {
  //     name: 'Longyearbyen',
  //     country: 'Norway',
  //     lat: 79,
  //     regexp: /((L|l)ongyearbyen)/,
  //     data: [
  //         'http://kho.unis.no/Quicklooks/ZWO/Allsky.jpg'
  //     ]
  // },
  // {
  //     name: 'Svalbard',
  //     country: 'Norway',
  //     lat: 78,
  //     regexp: /((S|s)valbard)|((Ш|ш)пиц)|((С|с)вал(ь?)бар(т|д))|((Г|г)руман(т|д))/,
  //     data: [
  //         'http://kho.unis.no/Quicklooks/kho_sony.png'
  //     ]
  // },
  // {
  //     name: 'Ny-Ålesund',
  //     country: 'Norway',
  //     lat: 78,
  //     regexp: /((N|n)y(-?)((Å|å)|(A|a))lesund)|((Н|н)ю(-?)((А|а)|(О|о))лес(а|у)н(д|т))/,
  //     data: [
  //         'http://193.156.10.139/Allsky.jpg'
  //     ]
  // },
  {
    name: "Skibotn",
    country: "Norway",
    lat: 69,
    regexp: /((S|s)kibotn)|((Ш|ш)ибот(н?))|((T|t)roms(ø|o))|((Т|т)ромс(е|ё))/,
    data: [
      "https://fox.phys.uit.no/ASC/BACC5.jpg",
      // 'https://fox.phys.uit.no/ASC/Latest_ASC01.png',
    ],
  },

  /**
   * Finland
   */
  // {
  //     name: 'Kevo',
  //     country: 'Finland',
  //     lat: 69,
  //     regexp: /((K|k)evo)|((К|к)ево)/,
  //     data: [
  //         'https://space.fmi.fi/MIRACLE/ASC/ASC_keograms/tmp_KEV_keo/Allsky_KEVO.jpg'
  //     ]
  // },
  // {
  //     name: 'Muonio',
  //     country: 'Finland',
  //     lat: 68,
  //     regexp: /((M|m)uonio)|((М|м)уонио)/,
  //     data: [
  //         'https://aurorasnow.fmi.fi/public_service/images/latest_MUO.jpg'
  //     ]
  // },
  {
    name: "Sodankylä",
    country: "Finland",
    lat: 67,
    regexp: /((S|s)odankyl(ä|a))|((С|с)оданкюл(я|а))/,
    data: ["https://www.sgo.fi/Data/RealTime/Kuvat/UCL.jpg"],
  },
  {
    name: "Nyrölä",
    country: "Finland",
    lat: 62,
    regexp: /((N|n)yr(ö|o)l(ä|a))|((Н|н)юрол(а|я))/,
    data: ["http://nyrola.jklsirius.fi/allsky/image-resize.jpg"],
  },
  {
    name: "Hankasalmi",
    country: "Finland",
    lat: 62,
    regexp: /((H|h)ankasalmi)|((Х|х)анка)/,
    data: [
      "https://www.ursa.fi/yhd/sirius/sivut/kuvat/ImageLastFTP_AllSKY.jpg",
    ],
  },
  {
    name: "Tampere",
    country: "Finland",
    lat: 61,
    regexp: /((T|t)ampere)|((Т|т)ампере)/,
    data: [
      "https://www.ursa.fi/yhd/tampereenursa/ys-images/north-snapshot.jpg",
    ],
  },
  {
    name: "Pori",
    country: "Finland",
    lat: 61,
    regexp: /((P|p)ori)/,
    data: ["https://karhunvartijat.fi/allsky/images/image-resize.jpg"],
  },
  // {
  //     name: 'Metsähovi',
  //     country: 'Finland',
  //     lat: 60,
  //     regexp: /((M|m)ets(ä|a)hovi)|((М|м)етсахови)/,
  //     data: [
  //         'https://space.fmi.fi/MIRACLE/RWC/latest_HOV.jpg'
  //     ]
  // },

  /**
   * Sweden
   */
  // {
  //     name: 'Kiruna',
  //     country: 'Sweden',
  //     lat: 67,
  //     regexp: /((K|k)iruna)|((К|к)ирун(a?))/,
  //     data: [
  //         'https://www.irf.se/alis/allsky/krn/latest_medium.jpeg'
  //     ]
  // },
  {
    name: "Porjus",
    country: "Sweden",
    lat: 66,
    regexp: /((P|p)orjus)|((П|п)ор((д?)жу|ью)с)/,
    data: [
      "https://uk.jokkmokk.jp/photo/nr4/latest.jpg",
      "https://uk.jokkmokk.jp/photo/nr3/latest.jpg",
      "https://uk.jokkmokk.jp/photo/nr5/latest.jpg",
    ],
  },

  /**
   * Russia
   */
  {
    name: "Nizino",
    country: "Russia",
    lat: 59,
    regexp: /(((N|n)izino)|((Н|н)изино))/,
    data: ["https://www.nizino-astro.ru/current.jpg"],
  },

  // /**
  //  *
  //  */
  // {
  //     name: 'Yellowknife',
  //     country: 'Canada',
  //     lat: 62,
  //     regexp: /((|) )|((|) )/,
  //     data: [
  //         'http://auroramax.phys.ucalgary.ca/recent/recent_1080p.jpg'
  //     ]
  // },
  // {
  //     name: '',
  //     country: '',
  //     lat: 69,
  //     regexp: /((|) )|((|) )/,
  //     data: [
  //         ''
  //     ]
  // },
];

dataSources.forEach((source) => {
  bot.onText(source.regexp, async (msg, match) => {
    let calledByCommand = false;

    try {
      if (match.input[0] === "/") calledByCommand = true;
    } catch (e) {}

    if (await doesBotNeedToIgnoreMessage(msg, calledByCommand)) return;

    const chatId = msg.chat.id;

    const command = source.name
      .replace("ö", "o")
      .replace("ä", "a")
      .replace("å", "a")
      .replace("Å", "A")
      .replace("-", "");

    const photos = source.data.map((item, index) => {
      return {
        type: "photo",
        media: `${source.data[index]}?t=${Date.now()}`,
      };
    });

    photos[0].caption = `${source.lat}° — ${source.name}, ${source.country} — /${command}`;

    const options = {};
    if (msg.is_topic_message) {
      options.message_thread_id = msg.message_thread_id;
    }

    bot.sendChatAction(chatId, "upload_photo");
    bot.sendMediaGroup(chatId, photos, options);
  });
});

bot.onText(/^\/webcam(@\w+)?$/, async (msg, match) => {
  if (await doesBotNeedToIgnoreMessage(msg, true)) return;

  const chatId = msg.chat.id;
  let message =
    `Name a webcam in message or use commands.\n` +
    `Get all images by /webcam_all command.\n` +
    `\n`;

  dataSources.forEach((source, index) => {
    const command = source.name
      .replace("ö", "o")
      .replace("ä", "a")
      .replace("å", "a")
      .replace("Å", "A")
      .replace("-", "");

    message += `${source.lat}° — /${command} — ${source.name}, ${source.country}\n`;

    try {
      if (source.country !== dataSources[index + 1].country) {
        message += "\n";
      }
    } catch (e) {}
  });

  const options = {};
  if (msg.is_topic_message) {
    options.message_thread_id = msg.message_thread_id;
  }

  bot.sendChatAction(chatId, "typing");
  bot.sendMessage(chatId, message, options);
});

bot.onText(/^\/webcam_all(@\w+)?$/, async (msg, match) => {
  if (await doesBotNeedToIgnoreMessage(msg, true)) return;

  posthog.capture({
    distinctId: msg.chat.id,
    event: "command:webcam_all",
  });

  const chatId = msg.chat.id;
  const photos = [];
  let message = `Available webcams sorted by latitude\n\n`;

  bot.sendChatAction(chatId, "upload_photo");

  dataSources
    .sort((place1, place2) => {
      if (place1.lat < place2.lat) {
        return 1;
      }
      if (place1.lat > place2.lat) {
        return -1;
      }
      return 0;
    })
    .forEach((source) => {
      const command = source.name
        .replace("ö", "o")
        .replace("ä", "a")
        .replace("å", "a")
        .replace("Å", "A")
        .replace("-", "");

      source.data.forEach((item, index) => {
        photos.push({
          type: "photo",
          media: `${source.data[index]}?t=${Date.now()}`,
        });
      });

      message += `${source.lat}° — ${source.name}, ${source.country} — /${command}\n`;
    });

  message += `\nUse /webcam_all to get this message again`;

  photos[0].caption = message;

  const options = {};
  if (msg.is_topic_message) {
    options.message_thread_id = msg.message_thread_id;
  }

  await bot.sendMediaGroup(chatId, photos, options);
});
