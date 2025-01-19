# Telegram Bot for App Management

This Telegram bot provides a variety of features for managing and interacting with applications, user requests, subscriptions, and more. It is equipped with both user and admin commands for seamless functionality.

---

## Features
- **App Management**: View available apps, request new apps, and manage app data.
- **User Management**: Handle premium subscriptions and verify users.
- **Admin Controls**: Advanced administrative features for managing users, requests, and the overall system.

---

## User Commands

### **1. `/get`**  
- **Description**: Retrieve available apps.  
- **Usage**: Type `/get` to view the list of available apps.  

### **2. `/list`**  
- **Description**: View the list of available apps.  
- **Usage**: Type `/list` to see the full list of apps.  

### **3. `/request`**  
- **Description**: Request apps from the admin.  
- **Usage**: Type `/request <app_name>` to submit your request for an app.  

### **4. `/requeststatus`**  
- **Description**: Check the status of your request.  
- **Usage**: Type `/requeststatus` to see whether your request has been approved or rejected.

### **5. `/upgrade`**  
- **Description**: Purchase a premium subscription.  
- **Usage**: Type `/upgrade` to upgrade your account to premium.

---

## Admin Commands

### **1. `/verify`**  
- **Description**: Verify a user.  
- **Usage**: Type `/verify <user_id>` to verify a user account.  
- **Admin Only**

### **2. `/remove`**  
- **Description**: Remove an app from the database.  
- **Usage**: Type `/remove <app_name>` to remove an app from the system.  
- **Admin Only**

### **3. `/broadcast`**  
- **Description**: Send a broadcast message to all users.  
- **Usage**: Type `/broadcast <message>` to send a message to all users.  
- **Admin Only**

### **4. `/totalusers`**  
- **Description**: View the total number of users.  
- **Usage**: Type `/totalusers` to get the current count of users.  
- **Admin Only**

### **5. `/removepremium`**  
- **Description**: Remove a user from the premium list.  
- **Usage**: Type `/removepremium <user_id>` to remove a user from the premium list.  
- **Admin Only**

### **6. `/viewpremiumusers`**  
- **Description**: Display the list of premium users.  
- **Usage**: Type `/viewpremiumusers` to see all users with a premium subscription.  
- **Admin Only**

### **7. `/viewusers`**  
- **Description**: Display the list of normal users.  
- **Usage**: Type `/viewusers` to see all users who are not premium.  
- **Admin Only**

### **8. `/showrequests`**  
- **Description**: View all app requests made by users.  
- **Usage**: Type `/showrequests` to view requests made by users for apps.  
- **Admin Only**

### **9. `/done`**  
- **Description**: Approve a user's request.  
- **Usage**: Type `/done <request_id>` to approve a request.  
- **Admin Only**

### **10. `/undone`**  
- **Description**: Reject a user's request.  
- **Usage**: Type `/undone <request_id>` to reject a request.  
- **Admin Only**

### **11. `/data`**  
- **Description**: Retrieve the latest database from the server.  
- **Usage**: Type `/data` to get the most recent version of the database.  
- **Admin Only**

---

## Contribution
Feel free to fork the repository and submit pull requests. Any contributions to improve the bot are highly appreciated!

## License
This project is licensed under the MIT License. See the `LICENSE` file for details.

---

### Developed By  
**Aadith C V With 🤍**
