const axios = require('axios');

// Get Zoom Access Token using Server-to-Server OAuth
const getZoomAccessToken = async () => {
  try {
    const { ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET } = process.env;

    if (!ZOOM_ACCOUNT_ID || !ZOOM_CLIENT_ID || !ZOOM_CLIENT_SECRET) {
      throw new Error('Zoom credentials not configured in environment variables');
    }

    const credentials = Buffer.from(`${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`).toString('base64');

    const response = await axios.post(
      `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${ZOOM_ACCOUNT_ID}`,
      {},
      {
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    return response.data.access_token;
  } catch (error) {
    console.error('Error getting Zoom access token:', error.response?.data || error.message);
    throw new Error('Failed to authenticate with Zoom API');
  }
};

// Create Zoom Meeting
const createZoomMeeting = async (appointmentData) => {
  try {
    const accessToken = await getZoomAccessToken();

    const { doctorName, patientName, appointmentDate, timeSlot } = appointmentData;

    // Format date and time
    const startDateTime = new Date(appointmentDate);
    const [startHour, startMinute] = timeSlot.startTime.split(':');
    startDateTime.setHours(parseInt(startHour), parseInt(startMinute), 0, 0);

    // Calculate duration (difference between start and end time)
    const [endHour, endMinute] = timeSlot.endTime.split(':');
    const duration = (parseInt(endHour) * 60 + parseInt(endMinute)) - (parseInt(startHour) * 60 + parseInt(startMinute));

    // Format time for Zoom - they expect format: YYYY-MM-DDTHH:mm:ss
    const year = startDateTime.getFullYear();
    const month = String(startDateTime.getMonth() + 1).padStart(2, '0');
    const day = String(startDateTime.getDate()).padStart(2, '0');
    const hour = String(startDateTime.getHours()).padStart(2, '0');
    const minute = String(startDateTime.getMinutes()).padStart(2, '0');
    const zoomStartTime = `${year}-${month}-${day}T${hour}:${minute}:00`;

    const meetingData = {
      topic: `Medical Consultation: Dr. ${doctorName} & ${patientName}`,
      type: 2, // Scheduled meeting
      start_time: zoomStartTime,
      duration: duration,
      timezone: 'Asia/Karachi',
      agenda: `Medical consultation between Dr. ${doctorName} and ${patientName}`,
      settings: {
        host_video: true,
        participant_video: true,
        join_before_host: true, // CRITICAL: Must be enabled
        jbh_time: 0, // Allow joining anytime before host
        mute_upon_entry: false,
        watermark: false,
        use_pmi: false,
        approval_type: 0, // No approval needed
        audio: 'both',
        auto_recording: 'none',
        waiting_room: false, // CRITICAL: Disable waiting room
        meeting_authentication: false, // CRITICAL: No authentication required
        allow_multiple_devices: true,
        encryption_type: 'enhanced_encryption',
        enable_dedicated_group_chat: false,
        private_meeting: false, // Public meeting
        enforce_login: false, // Don't require login
        registrants_email_notification: false
      }
    };

    const response = await axios.post(
      'https://api.zoom.us/v2/users/me/meetings',
      meetingData,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      success: true,
      meetingId: response.data.id.toString(),
      meetingLink: response.data.join_url,
      password: response.data.password || '',
      startUrl: response.data.start_url,
      startTime: response.data.start_time,
      duration: response.data.duration
    };
  } catch (error) {
    console.error('Error creating Zoom meeting:', error.response?.data || error.message);
    throw new Error('Failed to create Zoom meeting');
  }
};

// Delete Zoom Meeting
const deleteZoomMeeting = async (meetingId) => {
  try {
    const accessToken = await getZoomAccessToken();

    await axios.delete(
      `https://api.zoom.us/v2/meetings/${meetingId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );

    return { success: true, message: 'Meeting deleted successfully' };
  } catch (error) {
    console.error('Error deleting Zoom meeting:', error.response?.data || error.message);
    // Don't throw error if meeting doesn't exist
    if (error.response?.status === 404) {
      return { success: true, message: 'Meeting not found or already deleted' };
    }
    throw new Error('Failed to delete Zoom meeting');
  }
};

// Update Zoom Meeting
const updateZoomMeeting = async (meetingId, updateData) => {
  try {
    const accessToken = await getZoomAccessToken();

    const { appointmentDate, timeSlot } = updateData;

    // Format new date and time
    const startDateTime = new Date(appointmentDate);
    const [startHour, startMinute] = timeSlot.startTime.split(':');
    startDateTime.setHours(parseInt(startHour), parseInt(startMinute), 0, 0);

    // Calculate duration
    const [endHour, endMinute] = timeSlot.endTime.split(':');
    const duration = (parseInt(endHour) * 60 + parseInt(endMinute)) - (parseInt(startHour) * 60 + parseInt(startMinute));

    const meetingUpdateData = {
      start_time: startDateTime.toISOString(),
      duration: duration,
      timezone: 'Asia/Karachi'
    };

    await axios.patch(
      `https://api.zoom.us/v2/meetings/${meetingId}`,
      meetingUpdateData,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return { success: true, message: 'Meeting updated successfully' };
  } catch (error) {
    console.error('Error updating Zoom meeting:', error.response?.data || error.message);
    throw new Error('Failed to update Zoom meeting');
  }
};

// Create an instant Zoom meeting (starts immediately)
const createInstantZoomMeeting = async (doctorName, patientName) => {
  try {
    console.log('Creating instant Zoom meeting...');
    const accessToken = await getZoomAccessToken();

    const meetingData = {
      topic: `Medical Consultation: Dr. ${doctorName} & ${patientName}`,
      type: 1, // Instant meeting
      agenda: `Medical consultation between Dr. ${doctorName} and ${patientName}`,
      settings: {
        host_video: true,
        participant_video: true,
        join_before_host: true,
        mute_upon_entry: false,
        watermark: false,
        approval_type: 0,
        audio: 'both',
        auto_recording: 'none',
        waiting_room: false,
        meeting_authentication: false,
        allow_multiple_devices: true,
        enforce_login: false
      }
    };

    const response = await axios.post(
      `https://api.zoom.us/v2/users/me/meetings`,
      meetingData,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('Instant Zoom meeting created successfully');
    
    return {
      meetingId: response.data.id,
      meetingLink: response.data.join_url,
      password: response.data.password || '',
      startUrl: response.data.start_url,
      startTime: new Date().toISOString(), // Current time
    };
  } catch (error) {
    console.error('Error creating instant Zoom meeting:', error.response?.data || error.message);
    throw new Error('Failed to create instant Zoom meeting');
  }
};

module.exports = {
  createZoomMeeting,
  deleteZoomMeeting,
  updateZoomMeeting,
  getZoomAccessToken,
  createInstantZoomMeeting
};
