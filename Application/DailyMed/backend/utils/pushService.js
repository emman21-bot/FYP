const axios = require('axios');

const sendExpoPushNotification = async (token, title, message, data = {}) => {
  const payload = {
    to: token,
    title,
    body: message,
    data,
    sound: 'default'
  };

  const response = await axios.post('https://exp.host/--/api/v2/push/send', payload, {
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    timeout: 10000
  });

  return response.data;
};

const sendFcmPushNotification = async (token, title, message, data = {}) => {
  const serverKey = process.env.FCM_SERVER_KEY;
  if (!serverKey) {
    throw new Error('FCM_SERVER_KEY is not configured');
  }

  const payload = {
    to: token,
    notification: {
      title,
      body: message,
      sound: 'default'
    },
    data: {
      ...data,
      type: data.type || 'general'
    }
  };

  const response = await axios.post('https://fcm.googleapis.com/fcm/send', payload, {
    headers: {
      Authorization: `key=${serverKey}`,
      'Content-Type': 'application/json'
    },
    timeout: 10000
  });

  return response.data;
};

const sendPushNotification = async (token, title, message, data = {}) => {
  if (!token) {
    throw new Error('Push token is required');
  }

  try {
    if (token.startsWith('ExponentPushToken')) {
      return await sendExpoPushNotification(token, title, message, data);
    }

    return await sendFcmPushNotification(token, title, message, data);
  } catch (error) {
    throw error;
  }
};

module.exports = {
  sendPushNotification
};
