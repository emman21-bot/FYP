const mongoose = require('mongoose');
const HealthData = require('../models/HealthData');
const User = require('../models/User');
const path = require('path');

// Load environment variables from parent directory
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const migrateHealthDataEmails = async () => {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI;
    
    if (!mongoUri) {
      throw new Error('MONGODB_URI not found in environment variables');
    }
    
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Find all health data records without userEmail
    const healthDataWithoutEmail = await HealthData.find({
      $or: [
        { userEmail: { $exists: false } },
        { userEmail: null },
        { userEmail: '' }
      ]
    });

    console.log(`📊 Found ${healthDataWithoutEmail.length} health data records without email`);

    let updated = 0;
    let failed = 0;

    for (const record of healthDataWithoutEmail) {
      try {
        // Find the user by userId
        const user = await User.findById(record.userId);
        
        if (user && user.email) {
          // Update the health data record with the user's email
          await HealthData.updateOne(
            { _id: record._id },
            { $set: { userEmail: user.email } }
          );
          updated++;
          console.log(`✅ Updated record ${record._id} with email: ${user.email}`);
        } else {
          failed++;
          console.log(`❌ User not found for record ${record._id} (userId: ${record.userId})`);
        }
      } catch (error) {
        failed++;
        console.error(`❌ Error updating record ${record._id}:`, error.message);
      }
    }

    console.log('\n📈 Migration Summary:');
    console.log(`   Total records processed: ${healthDataWithoutEmail.length}`);
    console.log(`   Successfully updated: ${updated}`);
    console.log(`   Failed: ${failed}`);
    console.log('\n✅ Migration completed!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
};

// Run the migration
migrateHealthDataEmails();
