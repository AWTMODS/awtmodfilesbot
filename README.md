# Telegram File Management Bot

A Telegram bot designed for efficient file management. The bot provides various user and admin functionalities to manage, store, and retrieve files conveniently.

## Features
- Upload and store files.
- Retrieve files using unique identifiers.
- User-friendly commands for seamless interaction.
- Admin-specific controls for managing file databases.

---

## User Commands and Features

### 1. `/start`
- **Description**: Initiates the bot and provides a welcome message with instructions on how to use the bot.
- **Usage**: Simply type `/start` to begin interacting with the bot.

### 2. `/help`
- **Description**: Displays a list of available commands and their descriptions.
- **Usage**: Type `/help` to see the full command list.

### 3. `/upload`
- **Description**: Allows users to upload a file to the bot.
- **Usage**: Send the file along with the `/upload` command.

### 4. `/getfile <file_id>`
- **Description**: Retrieves a file using its unique identifier.
- **Usage**: Type `/getfile <file_id>` (replace `<file_id>` with the actual ID).

### 5. `/list`
- **Description**: Displays a list of files uploaded by the user.
- **Usage**: Type `/list` to view all your files.

---

## Admin Commands and Features

### 1. `/viewdatabase`
- **Description**: Displays the current file database.
- **Usage**: Type `/viewdatabase` to see all stored file records.

### 2. `/removefile <file_id>`
- **Description**: Deletes a specific file from the database using its unique identifier.
- **Usage**: Type `/removefile <file_id>` (replace `<file_id>` with the actual ID).

### 3. `/backup`
- **Description**: Creates a backup of the file database.
- **Usage**: Type `/backup` to generate and download a backup file.

### 4. `/restore <file_path>`
- **Description**: Restores the file database from a backup file.
- **Usage**: Type `/restore <file_path>` (replace `<file_path>` with the actual path to the backup file).

---
Developed By Aadith C V With 🤍

---

## Contribution
Feel free to fork the repository and submit pull requests. Any contributions to improve the bot are highly appreciated!

## License
This project is licensed under the MIT License. See the `LICENSE` file for details.

