const cron = require('node-cron');
const fs = require('fs');
const path = require('path');

const folderPath = path.join(__dirname, '..', 'public', 'uploads', 'bookingDocs');

// Helper function to delete old files
const deleteOldFiles = () => {
  console.log('🧹 Running file cleanup check...');

  const now = Date.now();
  const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;


  fs.readdir(folderPath, (err, files) => {
    if (err) {
      console.error('❌ Error reading bookingDocs folder:', err);
      return;
    }

    files.forEach(file => {
      const filePath = path.join(folderPath, file);

      fs.stat(filePath, (err, stats) => {
        if (err) {
          console.error(`❌ Could not access ${file}:`, err);
          return;
        }

        const isOld = now - stats.mtimeMs > THIRTY_DAYS;
        if (isOld) {
          fs.unlink(filePath, err => {
            if (err) console.error(`❌ Failed to delete ${file}:`, err);
            else console.log(`🗑️ Deleted file older than 1 day: ${file}`);
          });
        }
      });
    });
  });
};

const scheduleFileCleanup = () => {
  // Run once immediately
  deleteOldFiles();

  // Then schedule for daily at 2:00 AM
  cron.schedule('0 2 * * *', deleteOldFiles);
};

module.exports = scheduleFileCleanup;
