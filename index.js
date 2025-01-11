const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const TOKEN = '7989937085:AAF8_i_0NKvf-iuxDMx3ywAbAjS6oh9l3Sg'; // BOT_TOKEN
const ADMIN_USERNAME = 'artwebtech'; // ADMIN_USERNAME
const REQUIRED_CHANNEL = '@awt_bots'; // REQURIED_CHANNEL

// Create a new bot instance
const bot = new TelegramBot(TOKEN, { polling: true });

// Initialize file database and premium users
let fileDatabase = {};
let premiumUsers = [];
let normalUsers = {};

// Load JSON files safely
function loadJsonFile(filePath, defaultValue = {}) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return defaultValue;
  }
}

// Save JSON files safely
function saveJsonFile(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error(`Error saving ${filePath}:`, error.message);
  }
}

// Load databases
fileDatabase = loadJsonFile('fileDatabase.json');
premiumUsers = Object.keys(loadJsonFile('premiumUsers.json'));
normalUsers = loadJsonFile('normalUsers.json');

// Ensure admin is a premium user
function ensureAdminIsPremium() {
  const adminId = Object.keys(normalUsers).find(
    (id) => normalUsers[id]?.username === ADMIN_USERNAME
  );
  if (adminId && !premiumUsers.includes(adminId)) {
    premiumUsers.push(adminId);
    saveJsonFile('premiumUsers.json', {
      ...loadJsonFile('premiumUsers.json'),
      [adminId]: {
        ...normalUsers[adminId],
        premiumJoinedDate: new Date().toISOString(),
      },
    });
  }
}
ensureAdminIsPremium();

// Helper function to reset daily requests
const dailyRequests = {};
setInterval(() => {
  const currentDate = new Date().toISOString().split('T')[0];
  for (const userId in dailyRequests) {
    if (dailyRequests[userId].date !== currentDate) {
      delete dailyRequests[userId];
    }
  }
}, 60 * 60 * 1000); // Every hour


// /start command handler
bot.onText(/\/start/, (msg) => {
  const userId = msg.from.id;
  const username = msg.from.username || 'N/A'; // Username may not always be available
  const firstName = msg.from.first_name || '';
  const lastName = msg.from.last_name || '';
  const fullName = `${firstName} ${lastName}`.trim();

  // Add user details to normalUsers.json if not already present
  if (!normalUsers[userId]) {
    normalUsers[userId] = {
      username,
      fullName,
      joinedDate: new Date().toISOString(),
    };

    // Save the updated normalUsers to the JSON file
    try {
      fs.writeFileSync('normalUsers.json', JSON.stringify(normalUsers, null, 2));
      console.log(`User ${userId} added to normalUsers.json.`);

      // Send updated normalUsers.json file to admin
      bot.sendDocument('@awtadmins', 'normalUsers.json', {
        caption: 'Updated normalUsers.json file:',
      });
    } catch (error) {
      console.error('Error saving to normalUsers.json:', error.message);
    }
  }

  // Welcome message
  bot.sendMessage(
    msg.chat.id,
    'Welcome! You can use /get <filename> to request files. For example: /get picsart.'
  );
});

// CHECKING MEMBERSHIP
const checkMembership = async (userId) => {
  try {
    const chatMember = await bot.getChatMember(REQUIRED_CHANNEL, userId);
    return ['member', 'administrator', 'creator'].includes(chatMember.status);
  } catch (error) {
    console.error('Error checking membership:', error.message);
    return false; // Assume not a member if there's an error
  }
};
//MUST REQUIRED TO JOIN THE CHANNEL
const requireMembership = (handler) => async (msg, match) => {
  const userId = msg.from.id;

  if (await checkMembership(userId)) {
    return handler(msg, match); // Proceed to the intended command handler
  } else {
    bot.sendMessage(userId, 'You need to join our Telegram channel to use this bot:', {
      reply_markup: {
        inline_keyboard: [
          [
            { text: 'Join Channel', url: `https://t.me/${REQUIRED_CHANNEL.replace('@', '')}` },
            { text: 'I Have Joined', callback_data: 'check_membership' },
          ],
        ],
      },
    });
  }
};



// Command to handle file requests
bot.onText(/\/get (.+)/, requireMembership(async(msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const requestedFile = match[1].trim().toLowerCase();
  const currentDate = new Date().toISOString().split('T')[0];

  if (premiumUsers.includes(String(userId))) {
    // Premium users have unlimited access
    if (fileDatabase[requestedFile]) {
      const fileId = fileDatabase[requestedFile];
      bot.sendDocument(chatId, fileId, { caption: `Here is your requested file: ${requestedFile} \n By @artwebtechofficial` });
    } else {
      bot.sendMessage(chatId, `Sorry, I couldn't find the file "${requestedFile}".`);
    }
  } else {
    // Non-premium users have daily limits
    if (!dailyRequests[userId] || dailyRequests[userId].date !== currentDate) {
      dailyRequests[userId] = { count: 1, date: currentDate };
    } else {
      dailyRequests[userId].count++;
    }
//THIS IS THE LIMIT FOR THE FILE FOR NORMAL USERS
    if (dailyRequests[userId].count > 3) {
      bot.sendMessage(chatId, `You have reached your daily limit. Upgrade to premium to access more files! Use /upgrade.`);
    } else {
      if (fileDatabase[requestedFile]) {
        const fileId = fileDatabase[requestedFile];
        bot.sendDocument(chatId, fileId, { caption: `Here is your requested file: ${requestedFile} \n By @artwebtechofficial` });
      } else {
        bot.sendMessage(chatId, `Sorry, I couldn't find the file "${requestedFile}".`);
      }
    }
  }
}));



// Callback for "I Have Joined" button
bot.on('callback_query', async (callbackQuery) => {
  const userId = callbackQuery.from.id;

  if (callbackQuery.data === 'check_membership') {
    if (await checkMembership(userId)) {
      bot.sendMessage(userId, 'Thank you for joining! You can now use the bot.');
    } else {
      bot.sendMessage(userId, 'It seems you haven’t joined yet. Please join the channel and try again.');
    }
  }
});


// viewpremiumusers command to show all premium users
bot.onText(/\/viewpremiumusers/, (msg) => {
  const chatId = msg.chat.id;
  const adminUsername = 'artwebtech'; // Replace with your admin username

  // Check if the user is an admin
  if (msg.chat.username === adminUsername) {
    if (premiumUsers.length === 0) {
      bot.sendMessage(chatId, 'No premium users found.');
      return;
    }

    // Construct a list of premium users
    const premiumUserDetails = premiumUsers
      .map((userId) => {
        const user = normalUsers[userId]; // Fetch user details from normalUsers
        const username = user?.username || 'N/A';
        const fullName = user?.fullName || 'Unknown User';
        const joinedDate = user?.premiumJoinedDate || 'Date not available';
        return `- **Name:** ${fullName}\n  **Username:** @${username}\n  **User ID:** ${userId}\n  **Premium Joined Date:** ${joinedDate}`;
      })
      .join('\n\n');

    bot.sendMessage(
      chatId,
      `Here are the premium users:\n\n${premiumUserDetails}`,
      { parse_mode: 'Markdown' }
    );
  } else {
    bot.sendMessage(chatId, 'You do not have permission to view premium user details.');
  }
});


// Admin view of normal users
bot.onText(/\/viewusers/, (msg) => {
    const chatId = msg.chat.id;
    const adminUsername = 'artwebtech'; // Replace with the admin's Telegram username

    if (msg.chat.username === adminUsername) {
      // Admin view: List users with links to profiles, usernames, and user IDs
      const userList = Object.entries(normalUsers)
        .map(
          ([id, user]) =>
            `- [${user.fullName}](tg://user?id=${id}) (@${user.username || 'N/A'})\n  **User ID:** ${id}`
        )
        .join('\n\n');

      if (userList) {
        bot.sendMessage(
          chatId,
          `Here is the list of normal users:\n\n${userList}`,
          { parse_mode: 'Markdown' }
        );
      } else {
        bot.sendMessage(chatId, 'No normal users found.');
      }
    } else {
      bot.sendMessage(chatId, 'You do not have permission to view this information.');
    }
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

    // Send the QR code image
    const qrCodeImagePath = './qr_code.jpg'; // Path to the QR code image file
    bot.sendPhoto(msg.chat.id, qrCodeImagePath, { caption: 'Scan this QR code to make the payment.' });
  }
});


// Command to request UPI payment
bot.onText(/\/upgrade/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  if (premiumUsers.includes(userId)) {
    bot.sendMessage(chatId, 'You are already a premium member! Enjoy the premium features!');
  } else {
    const paymentButton = {
      reply_markup: {
        inline_keyboard: [
          [{ text: 'Pay 10 Rupees', callback_data: 'payment' }],
        ],
      },
    };
    bot.sendMessage(chatId, 'To upgrade to premium, please send 10 rupees to 9072428800@fam UPI.', paymentButton);
  }
});



// Broadcast message to normal users only
bot.onText(/\/broadcast (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const adminUsername = 'artwebtech'; // Replace with the admin's Telegram username
  const broadcastMessage = match[1];

  if (msg.chat.username === adminUsername) {
    // Filter normal users only
    const normalUserIds = Object.keys(normalUsers).filter(
      (userId) => !premiumUsers.includes(parseInt(userId))
    );

    if (normalUserIds.length === 0) {
      bot.sendMessage(chatId, 'No normal users found to broadcast the message.');
      return;
    }

    bot.sendMessage(chatId, `Broadcasting message to ${normalUserIds.length} normal users...`);

    normalUserIds.forEach((userId) => {
      bot.sendMessage(userId, `Broadcast Message from Admin:\n\n${broadcastMessage}`).catch((error) => {
        console.error(`Failed to send message to user ${userId}:`, error.message);
      });
    });

    bot.sendMessage(chatId, 'Broadcast completed successfully.');
  } else {
    bot.sendMessage(chatId, 'You do not have permission to use this command.');
  }
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

  // Check if the sender is an admin
  const adminUsername = 'artwebtech'; // Replace with the admin's Telegram username
  const isAdmin = username === adminUsername;

  if (msg.document) {
    const fileId = msg.document.file_id;
    let fileName = msg.document.file_name || 'unknown';

    // Simplify the file name by ignoring everything after the first underscore
    const processedFileName = fileName
      .toLowerCase()
      .split('_')[0] // Ignore everything after the first underscore
      .replace(/\.[^/.]+$/, ''); // Remove the file extension

    console.log('Processed File Name:', processedFileName);
    console.log('Document File ID:', fileId);

    if (isAdmin) {
      // Update the file database with the processed file name
      fileDatabase[processedFileName] = fileId;

      // Save the updated file database to the JSON file
      try {
        fs.writeFileSync('fileDatabase.json', JSON.stringify(fileDatabase, null, 2));
        console.log(`File database updated: ${processedFileName} => ${fileId}`);
        bot.sendMessage(chatId, `File database updated successfully!\n\n"${processedFileName}": "${fileId}"`);

        // Send the updated fileDatabase.json to the admin channel
        bot.sendDocument('@awtadmins', 'fileDatabase.json');
      } catch (error) {
        console.error('Error saving file database:', error.message);
        bot.sendMessage(chatId, 'Failed to update the file database. Please try again.');
      }
    } else {
      // Forward the document to the admin group with user details
      bot.sendMessage(
        '@awtadmins',
        `Document received from:
        - **Name:** ${fullName}
        - **Username:** ${username}
        - **User ID:** ${userId}

        [View Profile](tg://user?id=${userId})`,
        { parse_mode: 'Markdown' }
      );

      bot.forwardMessage('@awtadmins', chatId, msg.message_id).catch((error) => {
        console.error('Error forwarding document:', error.message);
      });

      bot.sendMessage(chatId, 'Payment screenshot received. An admin will verify your payment shortly.');
    }
  } else if (msg.photo || msg.video) {
    const fileId = msg.photo
      ? msg.photo[msg.photo.length - 1].file_id
      : msg.video.file_id;
    console.log(msg.photo ? 'Photo File ID:' : 'Video File ID:', fileId);

    if (isAdmin) {
      bot.sendMessage(chatId, `Here is the file ID in JSON format:\n\n"${msg.photo ? 'photo' : 'video'}": "${fileId}"`);
    } else {
      bot.sendMessage(
        '@awtadmins',
        `${msg.photo ? 'Photo' : 'Video'} received from:
        - **Name:** ${fullName}
        - **Username:** ${username}
        - **User ID:** ${userId}

        [View Profile](tg://user?id=${userId})`,
        { parse_mode: 'Markdown' }
      );

      bot.forwardMessage('@awtadmins', chatId, msg.message_id).catch((error) => {
        console.error('Error forwarding message:', error.message);
      });

      bot.sendMessage(chatId, `${msg.photo ? 'Photo' : 'Video'} received and forwarded to admins. An admin will verify shortly.`);
    }
  } else {
    console.log('No relevant file detected.');
  }
});


// Verify function for admins
bot.onText(/\/verify (\d+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const userIdToVerify = parseInt(match[1]);

  if (msg.chat.username === ADMIN_USERNAME) {
    if (premiumUsers.includes(userIdToVerify)) {
      bot.sendMessage(chatId, `User ${userIdToVerify} is already a premium member.`);
      bot.sendMessage(userIdToVerify, 'You are already a premium member! Enjoy the premium features!');
    } else if (normalUsers[userIdToVerify]) {
      const userDetails = normalUsers[userIdToVerify];
      userDetails.premiumJoinedDate = new Date().toISOString();

      // Add user to premiumUsers.json
      let premiumUserDetails = {};
      try {
        premiumUserDetails = JSON.parse(fs.readFileSync('premiumUsers.json', 'utf-8'));
      } catch (error) {
        console.log('No existing premiumUsers.json found. Creating a new one.');
      }
      premiumUserDetails[userIdToVerify] = userDetails;
      fs.writeFileSync('premiumUsers.json', JSON.stringify(premiumUserDetails, null, 2));

      // Remove user from normalUsers.json
      delete normalUsers[userIdToVerify];
      fs.writeFileSync('normalUsers.json', JSON.stringify(normalUsers, null, 2));

      // Add user to the in-memory premiumUsers list
      premiumUsers.push(userIdToVerify);

      bot.sendMessage(userIdToVerify, 'Congrats, you are now a premium member!');
      bot.sendMessage(chatId, `User ${userIdToVerify} has been successfully verified as a premium member.`);
    } else {
      bot.sendMessage(chatId, `User ${userIdToVerify} is not found in normal users.`);
    }
  } else {
    bot.sendMessage(chatId, 'You do not have permission to verify users.');
  }
});

// Command to remove a premium user
bot.onText(/\/removepremium (\d+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const userIdToRemove = parseInt(match[1]);

  if (msg.chat.username === ADMIN_USERNAME) {
    let premiumUserDetails = {};
    try {
      premiumUserDetails = JSON.parse(fs.readFileSync('premiumUsers.json', 'utf-8'));
    } catch (error) {
      bot.sendMessage(chatId, 'No premium users found.');
      return;
    }

    if (premiumUserDetails[userIdToRemove]) {
      delete premiumUserDetails[userIdToRemove];
      fs.writeFileSync('premiumUsers.json', JSON.stringify(premiumUserDetails, null, 2));
      premiumUsers = premiumUsers.filter((id) => id !== userIdToRemove);

      bot.sendMessage(chatId, `User ${userIdToRemove} has been removed from premium users.If you think we made a mistake, please contact @artwebtech for a refund/review `);
      bot.sendMessage(userIdToRemove, 'You have been removed from premium membership.');
    } else {
      bot.sendMessage(chatId, `User ${userIdToRemove} is not a premium member.`);
    }
  } else {
    bot.sendMessage(chatId, 'You do not have permission to remove premium users.');
  }
});

// Ensure updated lists
try {
  premiumUsers = Object.keys(JSON.parse(fs.readFileSync('premiumUsers.json', 'utf-8')));
} catch (error) {
  console.log('No premiumUsers.json found, starting fresh.');
}


// Command to remove a file from fileDatabase
bot.onText(/\/remove (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const fileName = match[1].trim().toLowerCase(); // File name to remove

  if (msg.chat.username === ADMIN_USERNAME) {
    if (fileDatabase[fileName]) {
      // Remove the file from the database
      delete fileDatabase[fileName];

      // Save the updated file database to the JSON file
      try {
        fs.writeFileSync('fileDatabase.json', JSON.stringify(fileDatabase, null, 2));
        bot.sendMessage(chatId, `File "${fileName}" has been successfully removed from the database.`);
        bot.sendDocument('@awtadmins', 'fileDatabase.json', {
          caption: 'Updated fileDatabase.json after removal.',
        });
      } catch (error) {
        console.error('Error saving fileDatabase.json:', error.message);
        bot.sendMessage(chatId, 'Failed to update the file database. Please try again.');
      }
    } else {
      bot.sendMessage(chatId, `File "${fileName}" was not found in the database.`);
    }
  } else {
    bot.sendMessage(chatId, 'You do not have permission to use this command.');
  }
});




// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Bot shutting down...');
  bot.stopPolling();
  process.exit(0);
});
