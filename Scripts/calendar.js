// Templater user script: tp.user.calendar()
// Fetches today's calendar events via icalBuddy

const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

async function calendar() {
  try {
    const { stdout } = await execPromise('/opt/homebrew/bin/icalbuddy -npn -nc -ps "/: /" -iep "datetime,title" -po "datetime,title" -tf "%H:%M" -df "" -ec "Birthdays,Holidays,Found in Natural Language" eventsToday');

    if (!stdout || stdout.trim() === '') {
      return '*No events scheduled for today*';
    }

    // Format each event as a bullet point
    const events = stdout.trim().split('\n')
      .filter(line => line.trim())
      .map(line => `- ${line}`)
      .join('\n');

    return events || '*No events scheduled for today*';
  } catch (e) {
    return `*Calendar error: ${e.message || e}*`;
  }
}

module.exports = calendar;
