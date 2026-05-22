const axios = require('axios');
const mongoose = require('mongoose');
const OTP = require('./models/OTP');

const testEmail = `otp_test_${Date.now()}@example.com`;
const testUser = `otpTest_${Date.now()}`;

(async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/dailymed');
    console.log('Connected to MongoDB.');

    const registerResponse = await axios.post('http://127.0.0.1:5000/api/auth/register', {
      username: testUser,
      email: testEmail,
      password: 'Test@1234',
      role: 'patient',
    }, {
      headers: { 'Content-Type': 'application/json' }
    });

    console.log('Register response:', registerResponse.data);

    const otpDoc = await OTP.findOne({ email: testEmail }).lean();
    console.log('OTP document found:', otpDoc ? { email: otpDoc.email, otp: otpDoc.otp, createdAt: otpDoc.createdAt } : null);

    if (!otpDoc) {
      throw new Error('OTP record not found after registration');
    }

    const verifyResponse = await axios.post('http://127.0.0.1:5000/api/auth/verify-otp', {
      email: testEmail,
      otp: otpDoc.otp,
    }, {
      headers: { 'Content-Type': 'application/json' }
    });

    console.log('Verify response:', verifyResponse.data);
  } catch (error) {
    if (error.response) {
      console.error('HTTP error response:', error.response.status, JSON.stringify(error.response.data));
    } else {
      console.error('Error:', error && error.message ? error.message : error);
    }
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
})();
