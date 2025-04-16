const { operatorIds, alertManagerIds, SUPER_ADMIN_ID } = require('../config/constants');

function isOperator(userId) {
  return operatorIds.includes(userId);
}

function isAlertManager(userId) {
  return alertManagerIds.includes(userId);
}

function isSuperAdmin(userId) {
  return userId === SUPER_ADMIN_ID;
}

function getUserName(user) {
  const firstName = user.first_name || '';
  const lastName = user.last_name || '';
  return `${firstName} ${lastName}`.trim();
}

function normalizeText(text) {
  return text.replace(/[^\p{L}\p{N}\s]/gu, '').trim().toLowerCase();
}

module.exports = {
  isOperator,
  isAlertManager,
  isSuperAdmin,
  getUserName,
  normalizeText
};