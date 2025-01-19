const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const TOKEN = '7989937085:AAF8_i_0NKvf-iuxDMx3ywAbAjS6oh9l3Sg'; // BOT_TOKEN
const ADMIN_USERNAME = 'artwebtech'; // ADMIN_USERNAME
const REQUIRED_CHANNEL = '@awt_bots'; // REQURIED_CHANNEL
const adminUsers = ["1343548529",""];  // ADMINS  IDs
const privateChannelId = -1002433715335; // PRIVATE_CHANNEL_ID
const RATE_LIMIT = 60000; // 1-minute rate limit
const userRequests = {}; // To track user requests for rate limiting
const requestLog = []; // To log all requests
// Create a new bot instance
const bot = new TelegramBot(TOKEN, { polling: true });

// Initialize file database and premium users
let fileDatabase = {};
let premiumUsers = [];
let normalUsers = {};
const REQUESTS_FILE = "requests.json";

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
    'Welcome! You can find the available app list by /list ,You can use /get <filename> to request files. For example: /get picsart.'
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



// Handle the /list command
bot.onText(/\/list/, (msg) => {
  const chatId = msg.chat.id;

  // Load the file database
  fs.readFile('fileDatabase.json', 'utf8', (err, data) => {
    if (err) {
      bot.sendMessage(chatId, 'Error reading the file database.');
      console.error(err);
      return;
    }

    try {
      const fileDatabase = JSON.parse(data);
      const files = fileDatabase.files;

      if (files.length === 0) {
        bot.sendMessage(chatId, 'No files available.');
        return;
      }

      // Generate a message with easily copyable text commands
      let message = 'Available Files:\n\n';
      files.forEach((file, index) => {
        message += `${index + 1}. ${file.appName}\n   Added Date: ${file.addedDate}\n   Use: \`/get ${file.appName}\`\n\n`;
      });

      // Send the message to the user
      bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    } catch (parseErr) {
      bot.sendMessage(chatId, 'Error parsing the file database.');
      console.error(parseErr);
    }
  });
});

// Command to handle file requests
bot.onText(/\/get (.+)/, requireMembership(async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const requestedFile = match[1].trim().toLowerCase();

  // Load the file database
  fs.readFile('fileDatabase.json', 'utf8', (err, data) => {
    if (err) {
      bot.sendMessage(chatId, 'Error reading the file database.');
      console.error(err);
      return;
    }

    try {
      const fileDatabase = JSON.parse(data);
      const files = fileDatabase.files;

      // Find the file by appName (case-insensitive search)
      const file = files.find((f) => f.appName.toLowerCase() === requestedFile);

      if (!file) {
        bot.sendMessage(chatId, `Sorry, I couldn't find the file "${requestedFile}".`);
        return;
      }

      const fileId = file.fileId;

      // Check if the user is an admin or premium
      if (adminUsers.includes(String(userId)) || premiumUsers.includes(String(userId))) {
        // No limit for admins or premium users
        bot.sendDocument(chatId, fileId, { caption: `Here is your requested file: ${file.appName} \n By @artwebtechofficial` });
      } else {
        // Non-premium users have daily limits
        const currentDate = new Date().toISOString().split('T')[0];

        if (!dailyRequests[userId] || dailyRequests[userId].date !== currentDate) {
          dailyRequests[userId] = { count: 1, date: currentDate };
        } else {
          dailyRequests[userId].count++;
        }

        // Limit for normal users
        if (dailyRequests[userId].count > 3) {
          bot.sendMessage(chatId, `You have reached your daily limit. Upgrade to premium to access more files! Use /upgrade.`);
        } else {
          bot.sendDocument(chatId, fileId, { caption: `Here is your requested file: ${file.appName} \n By @artwebtechofficial` });
        }
      }
    } catch (parseErr) {
      bot.sendMessage(chatId, 'Error parsing the file database.');
      console.error(parseErr);
    }
  });
}));


// Load requests from file
function loadRequests() {
    if (fs.existsSync(REQUESTS_FILE)) {
        const data = fs.readFileSync(REQUESTS_FILE, "utf8");
        return JSON.parse(data);
    }
    return [];
}

// Save requests to file
function saveRequests() {
    fs.writeFileSync(REQUESTS_FILE, JSON.stringify(requestLog, null, 2));
}

// Notify user about request status
function notifyUser(request, status, reason = null) {
    const message =
        status === "approved"
            ? `✅ Your request for *${request.appName}* has been approved!`
            : `❌ Your request for *${request.appName}* was rejected.\n*Reason*: ${reason}`;
    bot.sendMessage(request.userId, message, { parse_mode: "Markdown" }).catch((error) => {
        console.error("Error notifying user:", error.message);
    });
}

// Handle approval or rejection
function handleRequestAction(requestId, status, reason = null) {
    const requestIndex = requestLog.findIndex(req => req.requestId === requestId);
    if (requestIndex === -1) {
        return { success: false, message: "Request ID not found." };
    }

    const request = requestLog[requestIndex];
    request.status = status;
    if (reason) request.reason = reason;

    // Notify the user
    notifyUser(request, status, reason);

    // Remove request from the log and save
    requestLog.splice(requestIndex, 1);
    saveRequests();

    return { success: true, message: `Request #${requestId} has been ${status}.` };
}

// Initialize the request log from the file
Object.assign(requestLog, loadRequests());

// Listen for "/request" without parameters
bot.onText(/\/request$/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, "Please specify the app name using `/request appname`.");
});

// Listen for "/request appname" commands
bot.onText(/\/request (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const username = msg.from.username || "Anonymous";
    const appName = match[1]?.trim();

    if (!appName) {
        bot.sendMessage(chatId, "❌ Please provide a valid app name. Example: `/request MyApp`", {
            parse_mode: "Markdown",
        });
        return;
    }

    const now = Date.now();
    if (userRequests[userId] && now - userRequests[userId] < RATE_LIMIT) {
        bot.sendMessage(chatId, "⏳ Please wait before sending another request.");
        return;
    }
    userRequests[userId] = now;

    const requestId = requestLog.length + 1;
    requestLog.push({
        requestId,
        userId,
        username,
        appName,
        timestamp: now,
        status: "pending",
        reason: null,
    });

    saveRequests();

    const messageToAdmins = `
🔔 *New Request*
- *Request ID*: ${requestId}
- *User ID*: ${userId}
- *App Name*: ${appName}
- *From*: @${username}
    `;

    bot.sendMessage(privateChannelId, messageToAdmins, { parse_mode: "Markdown" })
        .then(() => {
            bot.sendMessage(chatId, "✅ Your request has been sent to the administrators. Thank you!");
        })
        .catch((error) => {
            console.error("Error sending message to admins:", error.message);
            bot.sendMessage(chatId, "❌ Failed to send your request. Please try again later.");
        });
});

// Listen for "/requeststatus" command
bot.onText(/\/requeststatus$/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    const userRequestStatus = requestLog
        .filter(request => request.userId === userId)
        .map(request => `🔹 *App Name*: ${request.appName}\n   *Status*: ${request.status}\n   ${request.reason ? `*Reason*: ${request.reason}\n` : ""}   *Requested At*: ${new Date(request.timestamp).toLocaleString()}`)
        .join("\n\n");

    if (!userRequestStatus) {
        bot.sendMessage(chatId, "ℹ️ You have not made any requests yet.");
    } else {
        bot.sendMessage(chatId, `📄 *Your Request Statuses*:\n\n${userRequestStatus}`, { parse_mode: "Markdown" });
    }
});

// Admin command to list all pending requests
bot.onText(/\/showrequests$/, (msg) => {
    const chatId = msg.chat.id;
    if (chatId.toString() !== privateChannelId && msg.chat.type !== "private") {
        return; // Ignore commands outside admin scope
    }

    const pendingRequests = requestLog
        .filter(request => request.status === "pending")
        .map(request => `🔹 *Request ID*: ${request.requestId}\n   *App Name*: ${request.appName}\n   *From*: @${request.username || "Anonymous"}\n   *Requested At*: ${new Date(request.timestamp).toLocaleString()}`)
        .join("\n\n");

    if (!pendingRequests) {
        bot.sendMessage(chatId, "ℹ️ There are no pending requests.");
    } else {
        bot.sendMessage(chatId, `📄 *Pending Requests*:\n\n${pendingRequests}`, { parse_mode: "Markdown" });
    }
});

// Handle admin approval (/done <ID>) or rejection (/undone <ID> <reason>)
bot.onText(/\/(done|undone) (\d+)(?: (.+))?/, (msg, match) => {
    const chatId = msg.chat.id;
    if (chatId.toString() !== privateChannelId && msg.chat.type !== "private") {
        return; // Ignore commands outside admin scope
    }

    const action = match[1]; // "done" or "undone"
    const requestId = parseInt(match[2], 10);
    const reason = match[3]?.trim();

    if (action === "done") {
        const result = handleRequestAction(requestId, "approved");
        bot.sendMessage(chatId, result.message);
    } else if (action === "undone") {
        if (!reason) {
            bot.sendMessage(chatId, "❌ Please provide a reason for rejection. Example: `/undone 1 Invalid app name`");
            return;
        }
        const result = handleRequestAction(requestId, "rejected", reason);
        bot.sendMessage(chatId, result.message);
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


// Command to request UPI payment/premiumpay
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

bot.on('callback_query', (callbackQuery) => {
  const msg = callbackQuery.message;
  if (callbackQuery.data === 'joined') {
    bot.sendMessage(
      msg.chat.id,
      'Thank you for joining the channels! You can now use /get <filename> to request files.'
    );
  } else if (callbackQuery.data === 'payment') {
    const qrCodeImagePath = './qr_code.jpg';

    // Check if the QR code image exists
    if (fs.existsSync(qrCodeImagePath)) {
      bot.sendPhoto(msg.chat.id, qrCodeImagePath, {
        caption: 'Scan this QR code to make the payment.',
      });
    } else {
      bot.sendMessage(
        msg.chat.id,
        'QR code not available. Please contact the admin for assistance.'
      );
    }
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


// Function to broadcast messages to all users
const broadcastMessage = (message) => {
  // Read the users list from users.json
  fs.readFile('users.json', 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading users list:', err.message);
      return;
    }

    let users;
    try {
      users = JSON.parse(data).users || [];
    } catch (parseErr) {
      console.error('Error parsing users list:', parseErr.message);
      return;
    }

    // Send message to each user
    users.forEach((userId) => {
      bot.sendMessage(userId, message).catch((error) => {
        console.error(`Failed to send message to user ${userId}:`, error.message);
      });
    });
  });
};

    // Bot message handler
 // Listen for messages
  bot.on('message', (msg) => {
      const chatId = msg.chat.id;
      const userId = msg.from.id;
      const username = msg.from.username || "Unknown";
      const fullName = `${msg.from.first_name || ""} ${msg.from.last_name || ""}`.trim();
      const isAdmin = msg.from.username === ADMIN_USERNAME;

      // Handle /start command and add users to users.json and normalUsers.json
      if (msg.text === '/start') {
          // Update users.json
          fs.readFile('users.json', 'utf8', (err, data) => {
              let users = [];
              if (!err) {
                  try {
                      users = JSON.parse(data).users || [];
                  } catch (parseErr) {
                      console.error('Error parsing users.json:', parseErr.message);
                  }
              }

              if (!users.includes(userId)) {
                  users.push(userId);

                  fs.writeFile('users.json', JSON.stringify({ users }, null, 2), (writeErr) => {
                      if (writeErr) {
                          console.error('Error saving users.json:', writeErr.message);
                      } else {
                          console.log(`Added new user ID: ${userId}`);

                          bot.sendDocument(privateChannelId, 'users.json', {
                              caption: `Updated users.json file:\nNew user added: ${userId}`,
                          }).catch((error) => {
                              console.error('Error sending updated users.json to private channel:', error.message);
                          });
                      }
                  });
              }
          });

          // Update normalUsers.json
          fs.readFile('normalUsers.json', 'utf8', (err, data) => {
              let normalUsers = {};
              if (!err) {
                  try {
                      normalUsers = JSON.parse(data);
                  } catch (parseErr) {
                      console.error('Error parsing normalUsers.json:', parseErr.message);
                  }
              }

              if (!normalUsers[userId]) {
                  normalUsers[userId] = {
                      username,
                      fullName,
                      joinedDate: new Date().toISOString(),
                  };

                  fs.writeFile('normalUsers.json', JSON.stringify(normalUsers, null, 2), (writeErr) => {
                      if (writeErr) {
                          console.error('Error saving normalUsers.json:', writeErr.message);
                      } else {
                          console.log(`Added new user details for ID: ${userId}`);

                          bot.sendDocument(privateChannelId, 'normalUsers.json', {
                              caption: `Updated normalUsers.json file:\nNew user added: ${username || "Unknown"} (ID: ${userId})`,
                          }).catch((error) => {
                              console.error('Error sending updated normalUsers.json to private channel:', error.message);
                          });
                      }
                  });
              }
          });
      }
 
    
      // Other existing bot functionality (e.g., /data, handling documents, etc.)
      if (msg.text === '/data' && isAdmin) {
        const filesToSend = ['fileDatabase.json', 'normalUsers.json', 'premiumUsers.json','users.json', 'requests.json'];

        filesToSend.forEach((file) => {
          if (fs.existsSync(file)) {
            bot.sendDocument(chatId, file, {
              caption: `Here is the latest ${file}`,
            }).catch((error) => {
              console.error(`Error sending file ${file}:`, error.message);
              bot.sendMessage(chatId, `Failed to send ${file}. Please try again later.`);
            });
          } else {
            bot.sendMessage(chatId, `File ${file} not found.`);
          }
        });
      } else if (msg.text === '/data') {
        bot.sendMessage(chatId, 'You do not have permission to use this command.');
      }
   

  // Handle /totalusers admin command
      if (msg.text === '/totalusers' && isAdmin) {
          fs.readFile('users.json', 'utf8', (err, data) => {
              if (err) {
                  console.error('Error reading users.json:', err.message);
                  bot.sendMessage(chatId, '❌ Could not read users.json. Please try again later.');
                  return;
              }

              let users = [];
              try {
                  users = JSON.parse(data).users || [];
              } catch (parseErr) {
                  console.error('Error parsing users.json:', parseErr.message);
                  bot.sendMessage(chatId, '❌ Error parsing users.json. Please check the file format.');
                  return;
              }

              bot.sendMessage(chatId, `📊 Total registered users: ${users.length}`);
          });
      }
  

  // Handle document uploads
  // Existing functionality (file handling, messages, etc.)
  if (msg.document) {
    const fileId = msg.document.file_id;
    let appName = msg.document.file_name || 'unknown';

    // Normalize appName
    const processedAppName = appName
      .toLowerCase()
      .split('_')[0] // Ignore everything after the first underscore
      .replace(/\.[^/.]+$/, ''); // Remove the file extension

    if (isAdmin) {
      // Load the file database
      fs.readFile('fileDatabase.json', 'utf8', (err, data) => {
        if (err) {
          bot.sendMessage(chatId, 'Error reading the file database.');
          console.error(err);
          return;
        }

        let fileDatabase;
        try {
          fileDatabase = JSON.parse(data);
        } catch (parseErr) {
          bot.sendMessage(chatId, 'Error parsing the file database.');
          console.error(parseErr);
          return;
        }

        // Get the current date
        const addedDate = new Date().toISOString().split('T')[0];
        const newFileEntry = {
          appName: processedAppName,
          fileId,
          addedDate, // Always use the current date dynamically
        };

        // Check if the appName already exists in the database
        const existingIndex = fileDatabase.files.findIndex(
          (file) => file.appName === processedAppName
        );

        if (existingIndex !== -1) {
          // Preserve the existing id and update the rest
          const existingId = fileDatabase.files[existingIndex].id;
          fileDatabase.files[existingIndex] = {
            ...newFileEntry,
            id: existingId, // Retain the existing id
          };
          bot.sendMessage(chatId, `Updated file entry for app: ${processedAppName}`);
        } else {
          // Assign a new id for the new entry
          const newId = fileDatabase.files.length
            ? Math.max(...fileDatabase.files.map((file) => file.id || 0)) + 1
            : 1;
          fileDatabase.files.push({
            id: newId,
            ...newFileEntry,
          });
          bot.sendMessage(chatId, `Added new file entry for app: ${processedAppName}`);
        }

        // Save the updated file database
        try {
          fs.writeFileSync('fileDatabase.json', JSON.stringify(fileDatabase, null, 2));
          console.log(`File database updated: ${processedAppName} => ${fileId}`);
          bot.sendMessage(chatId, `File database updated successfully!`);

          // Send updated database to the admin group
          bot.sendDocument(privateChannelId, 'fileDatabase.json', {
            caption: `Updated fileDatabase.json file:\nLast file added/updated: "${processedAppName}"`,
          });
        } catch (error) {
          console.error('Error saving file database:', error.message);
          bot.sendMessage(chatId, 'Failed to update the file database. Please try again.');
        }
      });

    } else {
      // Forward non-admin files to the admin group
      bot.sendMessage(
        privateChannelId, 
        `Document received from:
        - **Name:** ${fullName}
        - **Username:** ${username}
        - **User ID:** ${userId}

        [View Profile](tg://user?id=${userId})`,
        { parse_mode: 'Markdown' }
      );

      bot.forwardMessage(privateChannelId, chatId, msg.message_id).catch((error) => {
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
        privateChannelId, 
        `${msg.photo ? 'Photo' : 'Video'} received from:
        - **Name:** ${fullName}
        - **Username:** ${username}
        - **User ID:** ${userId}

        [View Profile](tg://user?id=${userId})`,
        { parse_mode: 'Markdown' }
      );

      bot.forwardMessage(privateChannelId, chatId, msg.message_id).catch((error) => {
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
        bot.sendDocument(privateChannelId,  'fileDatabase.json', {
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
