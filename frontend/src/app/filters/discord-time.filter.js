import angular from 'angular';
import '../../app.module.js';

angular.module('vibgyorChat').filter('discordTime', function() {
  return function(isoTimestamp) {
    if (!isoTimestamp) return '';

    const messageDate = new Date(isoTimestamp);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const messageDay = new Date(messageDate.getFullYear(), messageDate.getMonth(), messageDate.getDate());
    
    // Get time in 12-hour format
    const timeOptions = {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    };
    const timeString = messageDate.toLocaleTimeString(undefined, timeOptions);
    
    // Check if message is from today
    if (messageDay.getTime() === today.getTime()) {
      return `Today at ${timeString}`;
    }
    
    // Check if message is from yesterday
    if (messageDay.getTime() === yesterday.getTime()) {
      return `Yesterday at ${timeString}`;
    }
    
    // Check if message is from this year
    if (messageDate.getFullYear() === now.getFullYear()) {
      const dateOptions = {
        month: 'short',
        day: 'numeric'
      };
      const dateString = messageDate.toLocaleDateString(undefined, dateOptions);
      return `${dateString} at ${timeString}`;
    }
    
    // Message is from a previous year
    const dateOptions = {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    };
    const dateString = messageDate.toLocaleDateString(undefined, dateOptions);
    return `${dateString} at ${timeString}`;
  };
});

// Compact time filter for message list (just time for today, date for older)
angular.module('vibgyorChat').filter('discordTimeCompact', function() {
  return function(isoTimestamp) {
    if (!isoTimestamp) return '';

    const messageDate = new Date(isoTimestamp);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const messageDay = new Date(messageDate.getFullYear(), messageDate.getMonth(), messageDate.getDate());
    
    // If message is from today, show only time
    if (messageDay.getTime() === today.getTime()) {
      const timeOptions = {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      };
      return messageDate.toLocaleTimeString(undefined, timeOptions);
    }
    
    // If message is from this year, show month and day
    if (messageDate.getFullYear() === now.getFullYear()) {
      const dateOptions = {
        month: 'short',
        day: 'numeric'
      };
      return messageDate.toLocaleDateString(undefined, dateOptions);
    }
    
    // If message is from previous year, show full date
    const dateOptions = {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    };
    return messageDate.toLocaleDateString(undefined, dateOptions);
  };
});

// Tooltip time filter (full date and time)
angular.module('vibgyorChat').filter('discordTimeTooltip', function() {
  return function(isoTimestamp) {
    if (!isoTimestamp) return '';

    const messageDate = new Date(isoTimestamp);
    
    const options = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    };
    
    return messageDate.toLocaleString(undefined, options);
  };
});
