const fs = require('fs');
const path = require('path');

const warningsFile = path.join(__dirname, 'warnings.json');

class WarningsManager {
  constructor() {
    this.warnings = {};
    this.load();
  }

  load() {
    if (fs.existsSync(warningsFile)) {
      this.warnings = JSON.parse(fs.readFileSync(warningsFile, 'utf8'));
    }
  }

  save() {
    fs.writeFileSync(warningsFile, JSON.stringify(this.warnings, null, 2));
  }

  addWarning(userId, warning) {
    if (!this.warnings[userId]) this.warnings[userId] = [];
    this.warnings[userId].push(warning);
    this.save();
  }

  getWarnings(userId) {
    return this.warnings[userId] || [];
  }
}

module.exports = new WarningsManager();