// Generate random 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Validate OTP format
const isValidOTP = (otp) => {
  return /^\d{6}$/.test(otp);
};

module.exports = {
  generateOTP,
  isValidOTP
};
