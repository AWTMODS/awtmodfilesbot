//**const TelegramBot = require('node-telegram-bot-api');
//const fs = require('fs');
//const TOKEN = '7989937085:AAF8_i_0NKvf-iuxDMx3ywAbAjS6oh9l3Sg'; // BOT_TOKEN
//*const ADMIN_USERNAME = 'artwebtech'; // ADMIN_USERNAME
//*const REQUIRED_CHANNEL = '@awt_bots'; // REQURIED_CHANNEL
//*const adminUsers = ["1343548529",""];  // ADMINS  IDs
//*const privateChannelId = -1002433715335; // PRIVATE_CHANNEL_ID
//*const RATE_LIMIT = 60000; // 1-minute rate limit
//*const userRequests = {}; // To track user requests for rate limiting
//*const requestLog = []; // To log all requests
// Create a new bot instance
//const bot = new TelegramBot(TOKEN, { polling: true });
*/
/**
 * Enhanced Telegram File Management Bot with Dynamic Features
 * Features: Smart Categorization, Version Management, Advanced Search, and more
 */

require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// ─────────────────────────────────────────────
// ENV VARIABLES & CONFIGURATION
// ─────────────────────────────────────────────
const TOKEN = process.env.BOT_TOKEN;
const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_IDS = (process.env.ADMIN_IDS || '').split(',').filter(id => id.trim());
const MONGODB_URI = process.env.MONGO_URI;

// Feature flags
const FEATURES = {
  CATEGORIZATION: true,
  VERSION_MANAGEMENT: true,
  ADVANCED_SEARCH: true,
  UPDATE_NOTIFICATIONS: true,
  WISHLIST: true,
  FILE_VERIFICATION: true,
  ADMIN_CONTROLS: true,
  DASHBOARD_REPORTS: true,
  USER_PROFILES: true,
  AUTO_FETCH: true,
  SHARING_REFERRALS: true,
  BATCH_OPERATIONS: true,
  FILE_RELATIONSHIPS: true,
  INTERACTIVE_TUTORIAL: true,
  CUSTOMIZABLE_INTERFACE: true,
  MULTI_LANGUAGE: true,
  POINTS_REWARDS: true,
  PREMIUM_FEATURES: true,
  AFFILIATE_SYSTEM: true,
  SMART_RECOMMENDATIONS: true,
  AUTO_TAGGING: true,
  ADVANCED_SEARCH_ENGINE: true,
  COMMUNITY_FEATURES: true
};

// ─────────────────────────────────────────────
// MULTI-LANGUAGE SUPPORT
// ─────────────────────────────────────────────
const translations = {
  en: {
    welcome: "👋 Welcome *{name}*!",
    features: "🚀 *Available Features*",
    selectFeature: "Select a feature to explore:",
    back: "⬅️ Back",
    mainMenu: "🏠 Main Menu",
    adminPanel: "🛠 Admin Panel",
    // Add more translations as needed
  },
  es: {
    welcome: "👋 ¡Bienvenido *{name}*!",
    features: "🚀 *Características Disponibles*",
    selectFeature: "Selecciona una característica para explorar:",
    back: "⬅️ Atrás",
    mainMenu: "🏠 Menú Principal",
    adminPanel: "🛠 Panel Admin",
  }
};

// ─────────────────────────────────────────────
// ENHANCED SCHEMAS
// ─────────────────────────────────────────────
const CategorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: String,
  icon: String,
  createdAt: { type: Date, default: Date.now }
});

const FileSchema = new mongoose.Schema({
  appName: { type: String, required: true, index: true },
  displayName: { type: String, required: true },
  version: { type: String, default: '1.0.0' },
  fileId: { type: String, required: true },
  fileSize: { type: Number, required: true },
  fileType: { type: String, default: 'document' },
  mimeType: String,
  description: String,
  categories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
  tags: [String],
  isActive: { type: Boolean, default: true },
  isVerified: { type: Boolean, default: false },
  verificationHash: String,
  downloadCount: { type: Number, default: 0 },
  rating: { type: Number, default: 0 },
  reviewCount: { type: Number, default: 0 },
  dependencies: [String],
  alternatives: [{ type: mongoose.Schema.Types.ObjectId, ref: 'File' }],
  isLatest: { type: Boolean, default: true },
  previousVersion: { type: mongoose.Schema.Types.ObjectId, ref: 'File' },
  addedDate: { type: Date, default: Date.now, index: true },
  sourceChannel: String,
  uploader: { type: String, default: 'admin' },
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });

const UserSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true, index: true },
  username: String,
  fullName: String,
  language: { type: String, default: 'en' },
  theme: { type: String, default: 'light' },
  isPremium: { type: Boolean, default: false },
  points: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  achievements: [String],
  favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'File' }],
  wishlist: [String],
  subscriptions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'File' }],
  downloadHistory: [{
    fileId: { type: mongoose.Schema.Types.ObjectId, ref: 'File' },
    downloadedAt: { type: Date, default: Date.now }
  }],
  referralCode: { type: String, unique: true },
  referredBy: String,
  referralCount: { type: Number, default: 0 },
  totalDownloads: { type: Number, default: 0 },
  joinedAt: { type: Date, default: Date.now },
  lastActive: { type: Date, default: Date.now },
  settings: mongoose.Schema.Types.Mixed
});

const VersionHistorySchema = new mongoose.Schema({
  fileId: { type: mongoose.Schema.Types.ObjectId, ref: 'File', required: true },
  version: { type: String, required: true },
  fileId: String,
  fileSize: Number,
  changes: String,
  addedDate: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: false }
});

const WishlistSchema = new mongoose.Schema({
  appName: { type: String, required: true },
  requestedBy: { type: String, required: true },
  requestCount: { type: Number, default: 1 },
  voters: [String],
  createdAt: { type: Date, default: Date.now },
  fulfilled: { type: Boolean, default: false },
  fulfilledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'File' }
});

const ReviewSchema = new mongoose.Schema({
  fileId: { type: mongoose.Schema.Types.ObjectId, ref: 'File', required: true },
  userId: { type: String, required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: String,
  createdAt: { type: Date, default: Date.now }
});

const AffiliateSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  clicks: { type: Number, default: 0 },
  conversions: { type: Number, default: 0 },
  earnings: { type: Number, default: 0 },
  affiliateCode: { type: String, unique: true },
  createdAt: { type: Date, default: Date.now }
});

// Create models
const Category = mongoose.model('Category', CategorySchema);
const File = mongoose.model('File', FileSchema);
const User = mongoose.model('User', UserSchema);
const VersionHistory = mongoose.model('VersionHistory', VersionHistorySchema);
const Wishlist = mongoose.model('Wishlist', WishlistSchema);
const Review = mongoose.model('Review', ReviewSchema);
const Affiliate = mongoose.model('Affiliate', AffiliateSchema);

// ─────────────────────────────────────────────
// BOT SETUP & UTILITIES
// ─────────────────────────────────────────────
const bot = new TelegramBot(TOKEN, { polling: true });

// Feature menu state management
const userStates = new Map();

// Utility functions
const formatBytes = (bytes) => {
  if (bytes === 0) return '0 B';
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
};

const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

const isAdmin = (user) => {
  return user.username === ADMIN_USERNAME || ADMIN_IDS.includes(user.id.toString());
};

const generateReferralCode = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

// ─────────────────────────────────────────────
// DYNAMIC FEATURE MENUS
// ─────────────────────────────────────────────
const createFeatureMenu = (userId, currentFeature = null) => {
  const features = [
    { id: 'categorization', name: '🏷️ Smart Categorization', enabled: FEATURES.CATEGORIZATION },
    { id: 'version_management', name: '🔄 Version Management', enabled: FEATURES.VERSION_MANAGEMENT },
    { id: 'advanced_search', name: '🔍 Advanced Search', enabled: FEATURES.ADVANCED_SEARCH },
    { id: 'update_notifications', name: '🔔 Update Notifications', enabled: FEATURES.UPDATE_NOTIFICATIONS },
    { id: 'wishlist', name: '🎯 Wishlist Feature', enabled: FEATURES.WISHLIST },
    { id: 'file_verification', name: '🛡️ File Verification', enabled: FEATURES.FILE_VERIFICATION },
    { id: 'admin_controls', name: '⚙️ Admin Controls', enabled: FEATURES.ADMIN_CONTROLS },
    { id: 'dashboard_reports', name: '📊 Dashboard & Reports', enabled: FEATURES.DASHBOARD_REPORTS },
    { id: 'user_profiles', name: '👤 User Profiles', enabled: FEATURES.USER_PROFILES },
    { id: 'auto_fetch', name: '🤖 Auto-Fetch Sources', enabled: FEATURES.AUTO_FETCH },
    { id: 'sharing_referrals', name: '📤 Sharing & Referrals', enabled: FEATURES.SHARING_REFERRALS },
    { id: 'batch_operations', name: '⚡ Batch Operations', enabled: FEATURES.BATCH_OPERATIONS },
    { id: 'file_relationships', name: '🔗 File Relationships', enabled: FEATURES.FILE_RELATIONSHIPS },
    { id: 'interactive_tutorial', name: '🎓 Interactive Tutorial', enabled: FEATURES.INTERACTIVE_TUTORIAL },
    { id: 'customizable_interface', name: '🎨 Customizable Interface', enabled: FEATURES.CUSTOMIZABLE_INTERFACE },
    { id: 'multi_language', name: '🌐 Multi-Language', enabled: FEATURES.MULTI_LANGUAGE },
    { id: 'points_rewards', name: '🏆 Points & Rewards', enabled: FEATURES.POINTS_REWARDS },
    { id: 'premium_features', name: '💎 Premium Features', enabled: FEATURES.PREMIUM_FEATURES },
    { id: 'affiliate_system', name: '🤝 Affiliate System', enabled: FEATURES.AFFILIATE_SYSTEM },
    { id: 'smart_recommendations', name: '🧠 Smart Recommendations', enabled: FEATURES.SMART_RECOMMENDATIONS },
    { id: 'auto_tagging', name: '🏷️ Auto-Tagging', enabled: FEATURES.AUTO_TAGGING },
    { id: 'advanced_search_engine', name: '🔎 Advanced Search Engine', enabled: FEATURES.ADVANCED_SEARCH_ENGINE },
    { id: 'community_features', name: '👥 Community Features', enabled: FEATURES.COMMUNITY_FEATURES }
  ];

  const enabledFeatures = features.filter(f => f.enabled);
  
  // If a feature is selected, show only that feature's options
  if (currentFeature) {
    return createFeatureSubMenu(currentFeature, userId);
  }

  // Create main feature grid (4 columns)
  const keyboard = [];
  for (let i = 0; i < enabledFeatures.length; i += 4) {
    const row = enabledFeatures.slice(i, i + 4).map(feature => ({
      text: feature.name,
      callback_data: `feature_${feature.id}`
    }));
    keyboard.push(row);
  }

  // Add navigation
  keyboard.push([{ text: '🏠 Main Menu', callback_data: 'main_menu' }]);

  return {
    reply_markup: {
      inline_keyboard: keyboard
    }
  };
};

const createFeatureSubMenu = (featureId, userId) => {
  const user = userStates.get(userId);
  const subMenus = {
    categorization: [
      [{ text: '📁 Browse Categories', callback_data: 'cat_browse' }],
      [{ text: '🏷️ Manage Tags', callback_data: 'cat_tags' }],
      [{ text: '🔍 Search by Category', callback_data: 'cat_search' }],
      [{ text: '⬅️ Back to Features', callback_data: 'features_back' }]
    ],
    version_management: [
      [{ text: '📋 Version History', callback_data: 'vm_history' }],
      [{ text: '🔄 Rollback Version', callback_data: 'vm_rollback' }],
      [{ text: '📊 Compare Versions', callback_data: 'vm_compare' }],
      [{ text: '⬅️ Back to Features', callback_data: 'features_back' }]
    ],
    advanced_search: [
      [{ text: '🔍 Advanced Search', callback_data: 'search_advanced' }],
      [{ text: '📊 Search Filters', callback_data: 'search_filters' }],
      [{ text: '💾 Save Search', callback_data: 'search_save' }],
      [{ text: '⬅️ Back to Features', callback_data: 'features_back' }]
    ],
    // Add more submenus for other features...
    admin_controls: [
      [{ text: '📊 System Stats', callback_data: 'admin_stats' }],
      [{ text: '👥 User Management', callback_data: 'admin_users' }],
      [{ text: '🗃️ File Management', callback_data: 'admin_files' }],
      [{ text: '⚙️ System Settings', callback_data: 'admin_settings' }],
      [{ text: '⬅️ Back to Features', callback_data: 'features_back' }]
    ],
    user_profiles: [
      [{ text: '👤 My Profile', callback_data: 'profile_view' }],
      [{ text: '📊 My Stats', callback_data: 'profile_stats' }],
      [{ text: '🏆 Achievements', callback_data: 'profile_achievements' }],
      [{ text: '⭐ My Reviews', callback_data: 'profile_reviews' }],
      [{ text: '⬅️ Back to Features', callback_data: 'features_back' }]
    ]
    // Continue for all features...
  };

  return {
    reply_markup: {
      inline_keyboard: subMenus[featureId] || [[{ text: '⬅️ Back to Features', callback_data: 'features_back' }]]
    }
  };
};

// ─────────────────────────────────────────────
// COMMAND HANDLERS
// ─────────────────────────────────────────────

// Enhanced /start command with feature menu
bot.onText(/\/start/, async (msg) => {
  const { id, username, first_name, last_name } = msg.from;
  const fullName = `${first_name || ''} ${last_name || ''}`.trim();

  try {
    let user = await User.findOne({ userId: id.toString() });
    if (!user) {
      const referralCode = generateReferralCode();
      user = new User({
        userId: id.toString(),
        username,
        fullName,
        referralCode
      });
      await user.save();
    }

    user.lastActive = new Date();
    await user.save();

    const welcomeMessage = `👋 Welcome *${fullName || 'User'}*!\n\n🚀 *Discover Amazing Features*:\n\nTap the button below to explore all available features!`;

    bot.sendMessage(id, welcomeMessage, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🚀 Explore Features', callback_data: 'show_features' }],
          [{ text: '📦 Quick Download', switch_inline_query_current_chat: '' }],
          [{ text: '👤 My Profile', callback_data: 'profile_view' }]
        ]
      }
    });

  } catch (error) {
    console.error('Error in /start:', error);
    bot.sendMessage(id, '❌ An error occurred. Please try again.');
  }
});

// Features command
bot.onText(/\/features/, async (msg) => {
  const chatId = msg.chat.id;
  showFeaturesMenu(chatId);
});

// ─────────────────────────────────────────────
// FEATURE MENU DISPLAY
// ─────────────────────────────────────────────
const showFeaturesMenu = (chatId, messageId = null) => {
  const menu = createFeatureMenu(chatId);
  const message = `🚀 *Available Features*\n\n${FEATURES.selectFeature}`;

  if (messageId) {
    bot.editMessageText(message, {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'Markdown',
      reply_markup: menu.reply_markup
    });
  } else {
    bot.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      reply_markup: menu.reply_markup
    });
  }
};

// ─────────────────────────────────────────────
// CALLBACK QUERY HANDLER (Dynamic Feature System)
// ─────────────────────────────────────────────
bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const userId = query.from.id.toString();
  const data = query.data;

  try {
    await bot.answerCallbackQuery(query.id);

    // Feature selection handler
    if (data.startsWith('feature_')) {
      const featureId = data.replace('feature_', '');
      userStates.set(userId, { currentFeature: featureId });
      
      const featureMessages = {
        categorization: `🏷️ *Smart Categorization*\n\nOrganize files with categories and tags for better discovery.`,
        version_management: `🔄 *Version Management*\n\nKeep multiple versions and manage app updates.`,
        advanced_search: `🔍 *Advanced Search*\n\nPowerful search with filters and saved searches.`,
        admin_controls: `⚙️ *Admin Controls*\n\nComplete system management and moderation tools.`,
        user_profiles: `👤 *User Profiles*\n\nComprehensive user profiles with stats and achievements.`,
        // Add more feature descriptions...
      };

      const message = featureMessages[featureId] || `Exploring ${featureId.replace('_', ' ')}...`;
      const menu = createFeatureMenu(userId, featureId);

      await bot.editMessageText(message, {
        chat_id: chatId,
        message_id: query.message.message_id,
        parse_mode: 'Markdown',
        reply_markup: menu.reply_markup
      });
    }

    // Sub-feature handlers
    else if (data === 'features_back') {
      userStates.delete(userId);
      showFeaturesMenu(chatId, query.message.message_id);
    }

    else if (data === 'show_features') {
      showFeaturesMenu(chatId, query.message.message_id);
    }

    else if (data === 'main_menu') {
      userStates.delete(userId);
      bot.deleteMessage(chatId, query.message.message_id);
      bot.emitText('/start', query.message);
    }

    // Categorization features
    else if (data === 'cat_browse') {
      await handleCategoryBrowse(chatId, query.message.message_id);
    }

    // Version Management features
    else if (data === 'vm_history') {
      await handleVersionHistory(chatId, query.message.message_id);
    }

    // User Profile features
    else if (data === 'profile_view') {
      await handleProfileView(chatId, userId, query.message.message_id);
    }

    // Admin features
    else if (data.startsWith('admin_')) {
      if (!isAdmin(query.from)) {
        await bot.answerCallbackQuery(query.id, { text: '❌ Admin access required' });
        return;
      }
      await handleAdminFeature(data, chatId, query.message.message_id);
    }

  } catch (error) {
    console.error('Error in callback query:', error);
    await bot.answerCallbackQuery(query.id, { text: '❌ An error occurred' });
  }
});

// ─────────────────────────────────────────────
// FEATURE IMPLEMENTATION HANDLERS
// ─────────────────────────────────────────────

// Smart Categorization
const handleCategoryBrowse = async (chatId, messageId) => {
  const categories = await Category.find().limit(10);
  let message = `📁 *Categories*\n\n`;
  
  if (categories.length === 0) {
    message += "No categories available yet.";
  } else {
    categories.forEach((cat, index) => {
      message += `${index + 1}. ${cat.icon || '📂'} ${cat.name}\n`;
      if (cat.description) message += `   ${cat.description}\n`;
    });
  }

  const keyboard = [
    [{ text: '🔍 Browse Files by Category', callback_data: 'cat_browse_files' }],
    [{ text: '⬅️ Back', callback_data: 'feature_categorization' }]
  ];

  await bot.editMessageText(message, {
    chat_id: chatId,
    message_id: messageId,
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: keyboard }
  });
};

// Version Management
const handleVersionHistory = async (chatId, messageId) => {
  const files = await File.find({ isLatest: true }).limit(5);
  let message = `🔄 *Version Management*\n\nRecent apps with version history:\n\n`;

  files.forEach((file, index) => {
    message += `${index + 1}. ${file.displayName} v${file.version}\n`;
    message += `   📥 ${file.downloadCount} downloads\n`;
    message += `   🔗 Use: /versions ${file.appName}\n\n`;
  });

  const keyboard = [
    [{ text: '🔄 Check for Updates', callback_data: 'vm_check_updates' }],
    [{ text: '⬅️ Back', callback_data: 'feature_version_management' }]
  ];

  await bot.editMessageText(message, {
    chat_id: chatId,
    message_id: messageId,
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: keyboard }
  });
};

// User Profiles
const handleProfileView = async (chatId, userId, messageId) => {
  const user = await User.findOne({ userId }).populate('favorites');
  if (!user) return;

  const message = `👤 *User Profile*\n\n` +
    `🏷 Name: ${user.fullName || 'Not set'}\n` +
    `📊 Level: ${user.level}\n` +
    `⭐ Points: ${user.points}\n` +
    `💎 Premium: ${user.isPremium ? 'Yes' : 'No'}\n` +
    `📥 Total Downloads: ${user.totalDownloads}\n` +
    `🏆 Achievements: ${user.achievements.length}\n` +
    `⭐ Favorites: ${user.favorites.length}\n` +
    `🔗 Referral Code: ${user.referralCode}`;

  const keyboard = [
    [{ text: '📊 Detailed Stats', callback_data: 'profile_stats' }],
    [{ text: '🏆 My Achievements', callback_data: 'profile_achievements' }],
    [{ text: '⭐ My Favorites', callback_data: 'profile_favorites' }],
    [{ text: '🎯 My Wishlist', callback_data: 'profile_wishlist' }],
    [{ text: '⬅️ Back', callback_data: 'feature_user_profiles' }]
  ];

  await bot.editMessageText(message, {
    chat_id: chatId,
    message_id: messageId,
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: keyboard }
  });
};

// Admin Features
const handleAdminFeature = async (feature, chatId, messageId) => {
  switch (feature) {
    case 'admin_stats':
      const totalFiles = await File.countDocuments();
      const totalUsers = await User.countDocuments();
      const totalDownloads = await Download.countDocuments();
      
      const message = `📊 *Admin Statistics*\n\n` +
        `📦 Total Files: ${totalFiles}\n` +
        `👥 Total Users: ${totalUsers}\n` +
        `📥 Total Downloads: ${totalDownloads}\n` +
        `💾 Storage Used: Calculating...\n` +
        `🆕 New Today: 0`;
      
      await bot.editMessageText(message, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'Markdown'
      });
      break;

    case 'admin_users':
      // User management implementation
      break;
  }
};

// ─────────────────────────────────────────────
// NEW COMMAND IMPLEMENTATIONS
// ─────────────────────────────────────────────

// Version management command
bot.onText(/\/versions (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const appName = match[1].trim().toLowerCase();

  const files = await File.find({ 
    appName: new RegExp(appName, 'i') 
  }).sort({ version: -1 });

  if (files.length === 0) {
    return bot.sendMessage(chatId, `❌ No versions found for "${appName}"`);
  }

  let message = `🔄 *Version History: ${files[0].displayName}*\n\n`;
  files.forEach((file, index) => {
    const isLatest = index === 0 ? ' 🆕' : '';
    message += `${index + 1}. v${file.version}${isLatest}\n`;
    message += `   📅 ${file.addedDate.toDateString()}\n`;
    message += `   💾 ${formatBytes(file.fileSize)}\n`;
    message += `   📥 ${file.downloadCount} downloads\n\n`;
  });

  const keyboard = files.slice(0, 5).map(file => [
    { 
      text: `Download v${file.version}`, 
      callback_data: `download_version_${file._id}` 
    }
  ]);

  keyboard.push([{ text: '⬅️ Back to Features', callback_data: 'feature_version_management' }]);

  bot.sendMessage(chatId, message, {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: keyboard }
  });
});

// Wishlist command
bot.onText(/\/wishlist(?:\s+(.+))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id.toString();

  if (match[1]) {
    // Add to wishlist
    const appName = match[1].trim();
    await handleAddToWishlist(chatId, userId, appName);
  } else {
    // Show wishlist
    await handleShowWishlist(chatId, userId);
  }
});

const handleAddToWishlist = async (chatId, userId, appName) => {
  let wishlistItem = await Wishlist.findOne({ appName: appName.toLowerCase() });
  
  if (wishlistItem) {
    if (!wishlistItem.voters.includes(userId)) {
      wishlistItem.voters.push(userId);
      wishlistItem.requestCount += 1;
      await wishlistItem.save();
    }
  } else {
    wishlistItem = new Wishlist({
      appName: appName.toLowerCase(),
      requestedBy: userId,
      voters: [userId]
    });
    await wishlistItem.save();
  }

  const message = `🎯 *Added to Wishlist*\n\n"${appName}" has been added to the wishlist!\n\nTotal requests: ${wishlistItem.requestCount}`;

  bot.sendMessage(chatId, message, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '📋 View Wishlist', callback_data: 'feature_wishlist' }],
        [{ text: '🚀 Browse Features', callback_data: 'show_features' }]
      ]
    }
  });
};

// ─────────────────────────────────────────────
// BOT INITIALIZATION
// ─────────────────────────────────────────────
const initializeBot = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB Connected');
    
    // Create default categories
    const defaultCategories = [
      { name: 'Productivity', icon: '💼', description: 'Tools for work and productivity' },
      { name: 'Social', icon: '👥', description: 'Social media and communication apps' },
      { name: 'Games', icon: '🎮', description: 'Entertainment and gaming applications' },
      { name: 'Tools', icon: '🛠️', description: 'Utility and system tools' },
      { name: 'Entertainment', icon: '🎬', description: 'Media and entertainment apps' }
    ];

    for (const category of defaultCategories) {
      await Category.findOneAndUpdate(
        { name: category.name },
        category,
        { upsert: true }
      );
    }

    console.log('🤖 Enhanced Bot is running with dynamic features...');
    
    // Set bot commands
    await bot.setMyCommands([
      { command: 'start', description: 'Start the bot' },
      { command: 'features', description: 'Explore all features' },
      { command: 'list', description: 'List all apps' },
      { command: 'get', description: 'Download an app' },
      { command: 'wishlist', description: 'Manage your wishlist' },
      { command: 'versions', description: 'Check version history' },
      { command: 'profile', description: 'View your profile' }
    ]);

  } catch (error) {
    console.error('❌ Failed to initialize bot:', error);
    process.exit(1);
  }
};

initializeBot();

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log("\n🛑 Bot shutting down gracefully...");
  try {
    bot.stopPolling();
    await mongoose.connection.close();
    console.log('✅ Bot shutdown complete');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
});
