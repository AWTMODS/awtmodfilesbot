const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');

// Replace with your bot token
const TOKEN = '7989937085:AAF8_i_0NKvf-iuxDMx3ywAbAjS6oh9l3Sg';

// Create a new bot instance
const bot = new TelegramBot(TOKEN, { polling: true });

// Load the file database from a JSON file
let fileDatabase = {};
try {
  fileDatabase = JSON.parse(fs.readFileSync('fileDatabase.json', 'utf-8'));
  console.log('File database loaded:', fileDatabase);
} catch (error) {
  console.error('Error loading file database:', error.message);
}

// Load the premium users database from a JSON file
let premiumUsers = [];
try {
  premiumUsers = JSON.parse(fs.readFileSync('premium.json', 'utf-8'));
  console.log('Premium users loaded:', premiumUsers);
} catch (error) {
  console.error('Error loading premium users:', error.message);
}

// In-memory database for daily requests
const dailyRequests = {};

// Helper function to reset daily requests at midnight
setInterval(() => {
  const currentDate = new Date().toISOString().split('T')[0];
  Object.keys(dailyRequests).forEach((userId) => {
    if (dailyRequests[userId].date !== currentDate) {
      delete dailyRequests[userId];
    }
  });
}, 60 * 60 * 1000); // Run every hour

// Command to handle file requests
bot.onText(/\/get (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const requestedFile = match[1].trim().toLowerCase();
  const currentDate = new Date().toISOString().split('T')[0];

  // Check if the user is a premium member
  if (premiumUsers.includes(userId)) {
    // Premium users can request unlimited files
    if (fileDatabase[requestedFile]) {
      const fileId = fileDatabase[requestedFile];
      bot.sendDocument(chatId, fileId, { caption: `Here is your requested file: ${requestedFile}` });
    } else {
      bot.sendMessage(chatId, `Sorry, I couldn't find the file "${requestedFile}".`);
    }
  } else {
    // Non-premium users can request one file per day
    if (!dailyRequests[userId] || dailyRequests[userId].date !== currentDate) {
      dailyRequests[userId] = { count: 1, date: currentDate };
    } else {
      dailyRequests[userId].count += 1;
    }

    if (dailyRequests[userId].count > 1) {
      bot.sendMessage(
        chatId,
        `You have reached your daily limit of 1 file request. Upgrade to premium to request unlimited files! Use /upgrade to subscribe.`
      );
    } else {
      if (fileDatabase[requestedFile]) {
        const fileId = fileDatabase[requestedFile];
        bot.sendDocument(chatId, fileId, { caption: `Here is your requested file: ${requestedFile}` });
      } else {
        bot.sendMessage(chatId, `Sorry, I couldn't find the file "${requestedFile}".`);
      }
    }
  }
});

// /start command handler
bot.onText(/\/start/, (msg) => {
  const joinButtons = {
    reply_markup: {
      inline_keyboard: [
        [{ text: 'Join AWT Bots', url: 'https://t.me/awt_bots' }],
        [{ text: 'Join ArtWebTech WA', url: 'https://t.me/artwebtechwa' }],
        [{ text: 'Join ArtWebTech Official', url: 'https://t.me/artwebtechofficial' }],
        [{ text: 'I Have Joined', callback_data: 'joined' }],
      ],
    },
  };
  bot.sendMessage(
    msg.chat.id,
    `Welcome! To use this bot, please join the following channels and then click "I Have Joined":
- AWT Bots: https://t.me/awt_bots
- ArtWebTech WA: https://t.me/artwebtechwa
- ArtWebTech Official: https://t.me/artwebtechofficial

Once you've joined, you can use /get <filename> to request a file. For example: /get picsart`,
    joinButtons
  );
});

// Handle join confirmation
bot.on('callback_query', (callbackQuery) => {
  const msg = callbackQuery.message;
  if (callbackQuery.data === 'joined') {
    bot.sendMessage(msg.chat.id, 'Thank you for joining the channels! You can now use /get <filename> to request files.');
  } else if (callbackQuery.data === 'payment') {
    bot.sendMessage(
      msg.chat.id,
      'Please send 10 rupees to 9072428800@fam UPI and upload the screenshot of the payment.'
    );
  }
});

// Command to request UPI payment
bot.onText(/\/upgrade/, (msg) => {
  const chatId = msg.chat.id;
  const paymentButton = {
    reply_markup: {
      inline_keyboard: [
        [{ text: 'Pay 10 Rupees', callback_data: 'payment' }],
      ],
    },
  };
  bot.sendMessage(chatId, 'To upgrade to premium, please send 10 rupees to 9072428800@fam UPI.', paymentButton);
});

// Handle messages with files or images
bot.on('message', (msg) => {
  const chatId = msg.chat.id;

  // User details
  const userId = msg.from.id;
  const username = msg.from.username || 'N/A';
  const firstName = msg.from.first_name || '';
  const lastName = msg.from.last_name || '';
  const fullName = `${firstName} ${lastName}`.trim();

  // Generate user profile link
  const profileLink = `[${fullName}](tg://user?id=${userId})`;

  if (msg.photo) {
    // Get the largest photo (highest resolution)
    const largestPhoto = msg.photo[msg.photo.length - 1];
    console.log('Photo File ID:', largestPhoto.file_id);

    // Forward the photo to the admin group with user details
    bot.sendMessage(
      '@awtadmins',
      `Photo received from:
- **Name:** ${fullName}
- **Username:** ${username}
- **User ID:** ${userId}

[View Profile](${profileLink})`,
      { parse_mode: 'Markdown' }
    );

    bot.forwardMessage('@awtadmins', chatId, msg.message_id).catch((error) => {
      console.error('Error forwarding photo:', error.message);
    });

    bot.sendMessage(chatId, 'Photo received and forwarded to admins. An admin will verify shortly.');
  } else if (msg.document) {
    console.log('Document File ID:', msg.document.file_id);

    // Forward the document to the admin group with user details
    bot.sendMessage(
      '@awtadmins',
      `Document received from:
- **Name:** ${fullName}
- **Username:** ${username}
- **User ID:** ${userId}

[View Profile](${profileLink})`,
      { parse_mode: 'Markdown' }
    );

    bot.forwardMessage('@awtadmins', chatId, msg.message_id).catch((error) => {
      console.error('Error forwarding document:', error.message);
    });

    bot.sendMessage(chatId, 'Payment screenshot received. An admin will verify your payment shortly.');
  } else {
    console.log('No relevant file detected.');
  }
});

// Verify function for admins
bot.onText(/\/verify (\d+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const userIdToVerify = parseInt(match[1]);

  // Check if the admin is verifying
  if (msg.chat.username === 'artwebtech') {
    if (premiumUsers.includes(userIdToVerify)) {
      // Notify the user and admin if already verified
      bot.sendMessage(chatId, `User ${userIdToVerify} is already a premium member.`);
      bot.sendMessage(userIdToVerify, 'You are already a premium member! Enjoy the premium features!');
    } else {
      // Add user to premium list and notify
      premiumUsers.push(userIdToVerify);
      fs.writeFileSync('premium.json', JSON.stringify(premiumUsers, null, 2));
      bot.sendMessage(userIdToVerify, 'Congrats, now you are a premium member!');
      bot.sendMessage(chatId, `User ${userIdToVerify} has been successfully verified.`);
    }
  } else {
    bot.sendMessage(chatId, 'You do not have permission to verify users.');
  }
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Bot shutting down...');
  bot.stopPolling();
  process.exit(0);
});
