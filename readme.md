# Discord Bot Usage Guide

## Introduction
This bot is designed to provide an enhanced experience on Discord by interacting with voice channels and executing commands seamlessly. Follow this guide to set up and use the bot.

---

## Features
- **Play Audio:** Automatically joins a voice channel and plays audio from provided links.
- **Auto-Disconnect:** Leaves the voice channel if no one is present or after a set timeout.
- **Custom Commands:** Includes commands like `/leave` for manual disconnection.

---

## Requirements
- [Node.js](https://nodejs.org/) (version 16.6.0 or higher).
- A Discord bot token.
- Necessary permissions for the bot in your server:
  - Manage Messages
  - Connect and Speak in Voice Channels

---

## Installation

1. Clone this repository or download the source code:
   ```bash
   git clone https://github.com/nguyendanhda98/DND-Voicebot.git
   cd DND-Voicebot
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `config.json` file in the root directory and add your bot credentials:
   ```json
   {
     "TOKEN": "your-bot-token",
     "CLIENT_ID": "your-client-id",
     "GUILD_ID": "your-guild-id"
   }
   ```

4. Start the bot:
   ```bash
   node index.js
   ```

---

## Commands

### `/leave`
- **Description:** Disconnect the bot from the voice channel.
- **Usage:**
  - The user must be in the same voice channel as the bot.
  - Example: `/leave`
- **Behavior:**
  - If successful, the bot will leave the voice channel and confirm.
  - If the user is not in the same channel, the bot will respond with an error message.

---

## How It Works

1. **Auto-Play Audio:**
   - The bot automatically joins the voice channel of a referenced user and plays audio from supported links.

2. **Timeout for Disconnect:**
   - If no new messages are sent for 1 minute, the bot will automatically leave the voice channel.

3. **Error Handling:**
   - The bot gracefully handles missing permissions, invalid inputs, or other runtime errors.

---

## Contributing
Feel free to contribute to this project by submitting issues or pull requests.

---

## License
This project is licensed under the [MIT License](LICENSE).

---

For support, contact Da Nguyen.
