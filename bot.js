const { Client, GatewayIntentBits, REST, Routes } = require("discord.js");
const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  NoSubscriberBehavior,
  AudioPlayerStatus,
  StreamType,
  getVoiceConnection,
} = require("@discordjs/voice");
const axios = require("axios");
const { Readable } = require("stream");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

const config = require("./config.json"); // Lấy token từ file config.json
let voiceConnection = null; // Lưu trữ kết nối voice
let audioQueue = [];
let isPlaying = false;
let timeoutId = null; // Lưu trữ timeout để disconnect bot

// Đăng ký lệnh /leave với Discord
const rest = new REST({ version: "10" }).setToken(config.TOKEN);

(async () => {
  try {
    console.log("Bắt đầu đăng ký lệnh slash toàn cục...");

    await rest.put(Routes.applicationCommands(config.CLIENT_ID), {
      body: [
        {
          name: "leave",
          description: "Bot sẽ rời khỏi voice channel.",
        },
        {
          name: "play",
          description: "Phát một file mp3 từ link.",
          options: [
            {
              name: "link",
              type: 3, // STRING
              description: "Link của file mp3.",
              required: true,
            },
          ],
        },
      ],
    });

    console.log("Lệnh đã đăng ký thành công trên toàn cầu!");
  } catch (error) {
    console.error("Có lỗi khi đăng ký lệnh slash:", error);
  }
})();

// Hủy kết nối và bot sẽ rời khỏi voice channel
const disconnectBot = () => {
  if (voiceConnection) {
    console.log("Không có tin nhắn mới, bot sẽ rời khỏi voice channel.");
    voiceConnection.destroy(); // Disconnect bot khỏi voice channel
    voiceConnection = null; // Reset kết nối
  }
};

// Đặt timeout để đợi 3 phút sau tin nhắn cuối
const setDisconnectTimeout = () => {
  if (timeoutId) {
    clearTimeout(timeoutId); // Xóa timeout cũ nếu có
  }

  timeoutId = setTimeout(() => {
    disconnectBot(); // Nếu không có tin nhắn mới, bot sẽ rời khỏi sau 3 phút
  }, 180000); // 60000 ms = 3 phút
};

// Hàm phát âm thanh cho user
const playAudioForUser = async (link, guildId, channelId) => {
  audioQueue.push({ link, guildId, channelId });
  if (!isPlaying) {
    playNextAudio();
  }

  // try {
  //   // Kết nối vào voice channel
  //   voiceConnection = joinVoiceChannel({
  //     channelId: channelId,
  //     guildId: guildId,
  //     adapterCreator: client.guilds.cache.get(guildId).voiceAdapterCreator,
  //   });

  //   // Tạo audio player
  //   const player = createAudioPlayer({
  //     behaviors: {
  //       noSubscriber: NoSubscriberBehavior.Stop,
  //     },
  //   });

  //   // Tải dữ liệu âm thanh
  //   const response = await axios({
  //     url: link,
  //     method: "GET",
  //     responseType: "arraybuffer",
  //   });

  //   const audioBuffer = Buffer.from(response.data); // Chuyển dữ liệu thành buffer
  //   const readableStream = Readable.from(audioBuffer); // Tạo stream từ buffer

  //   const resource = createAudioResource(readableStream, {
  //     inputType: StreamType.Arbitrary,
  //   });

  //   voiceConnection.subscribe(player); // Kết nối player vào voice channel
  //   // Đặt timeout 1 giây trước khi phát âm thanh
  //   setTimeout(() => {
  //     player.play(resource); // Bắt đầu phát âm thanh sau 1 giây
  //   }, 1000); // 1000 ms = 1 giây

  //   // Lắng nghe sự kiện khi phát xong
  //   player.on(AudioPlayerStatus.Idle, () => {
  //     console.log("Âm thanh đã phát xong.");
  //     setDisconnectTimeout(); // Đặt timeout để bot rời sau 3 phút
  //   });

  //   // Xử lý lỗi trong quá trình phát
  //   player.on("error", (error) => {
  //     console.error("Lỗi khi phát âm thanh:", error);
  //     disconnectBot(); // Nếu có lỗi, bot sẽ rời đi
  //   });
  // } catch (error) {
  //   console.error("Lỗi khi xử lý phát âm thanh:", error);
  // }
};

const playNextAudio = async () => {
  if (audioQueue.length === 0) {
    isPlaying = false;
    return;
  }

  isPlaying = true;
  const { link, guildId, channelId } = audioQueue.shift();

  try {
    voiceConnection = joinVoiceChannel({
      channelId: channelId,
      guildId: guildId,
      adapterCreator: client.guilds.cache.get(guildId).voiceAdapterCreator,
    });

    const player = createAudioPlayer({
      behaviors: {
        noSubscriber: NoSubscriberBehavior.Stop,
      },
    });

    const response = await axios({
      url: link,
      method: "GET",
      responseType: "arraybuffer",
    });

    const audioBuffer = Buffer.from(response.data);
    const readableStream = Readable.from(audioBuffer);

    const resource = createAudioResource(readableStream, {
      inputType: StreamType.Arbitrary,
    });

    voiceConnection.subscribe(player);
    setTimeout(() => {
      player.play(resource);
    }, 1000);

    player.on(AudioPlayerStatus.Idle, () => {
      console.log("Âm thanh đã phát xong.");
      playNextAudio(); // Phát file tiếp theo trong hàng đợi
    });

    player.on("error", (error) => {
      console.error("Lỗi khi phát âm thanh:", error);
      playNextAudio(); // Bỏ qua file hiện tại và phát file tiếp theo
    });
  } catch (error) {
    console.error("Lỗi khi xử lý phát âm thanh:", error);
    playNextAudio(); // Bỏ qua file hiện tại và phát file tiếp theo
  }
};

// Lắng nghe sự kiện khi tin nhắn được gửi
client.on("messageCreate", async (message) => {
  if (
    message.author.id === client.user.id &&
    message.content.includes("https://files.shapes.inc/")
  ) {
    if (message.reference) {
      try {
        const repliedMessage = await message.channel.messages.fetch(
          message.reference.messageId
        );

        if (!repliedMessage) {
          console.warn("Không thể tìm thấy tin nhắn được trả lời.");
          return;
        }

        // Lấy thông tin user X
        const userX = message.guild.members.cache.get(repliedMessage.author.id);

        if (!userX || !userX.voice.channelId) {
          console.warn("User X không ở trong voice channel.");
          return;
        }

        const link = message.content.match(
          /https:\/\/files\.shapes\.inc\/[\w\-]+\.mp3/
        )[0];

        if (link) {
          await playAudioForUser(link, message.guild.id, userX.voice.channelId);
        }
      } catch (error) {
        console.error("Có lỗi xảy ra khi xử lý tin nhắn:", error);
      }
    }
  }

  // Nếu là tin nhắn khác, sẽ reset thời gian timeout
  if (voiceConnection) {
    setDisconnectTimeout(); // Đặt lại timeout khi có tin nhắn mới
  }
});

// Xử lý lệnh slash /leave
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand()) return;

  if (interaction.commandName === "leave") {
    const connection = getVoiceConnection(interaction.guild.id);

    if (!connection) {
      return interaction.reply("Bot hiện không ở trong voice channel nào.");
    }

    const userVoiceChannel = interaction.member.voice.channel;

    if (!userVoiceChannel) {
      return interaction.reply(
        "Bạn cần phải ở trong một voice channel để sử dụng lệnh này."
      );
    }

    if (userVoiceChannel.id !== connection.joinConfig.channelId) {
      return interaction.reply(
        "Bạn phải ở cùng voice channel với bot để sử dụng lệnh này."
      );
    }

    // Ngắt kết nối bot
    connection.destroy();
    voiceConnection = null; // Reset kết nối
    return interaction.reply("Bot đã rời khỏi voice channel.");
  }

  if (interaction.commandName === "play") {
    const link = interaction.options.getString("link");

    if (!link) {
      return interaction.reply("Vui lòng nhập link của file mp3.");
    }

    if (!interaction.member.voice.channel) {
      return interaction.reply(
        "Bạn cần phải ở trong một voice channel để sử dụng lệnh này."
      );
    }

    await playAudioForUser(
      link,
      interaction.guild.id,
      interaction.member.voice.channelId
    );

    return interaction.reply("Đang phát âm thanh...");
  }
});

client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.login(config.TOKEN);
