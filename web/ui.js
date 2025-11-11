// UI utility functions

/**
 * Show status message in a container
 * @param {HTMLElement} element - Container element
 * @param {string} message - Message to display
 * @param {string} type - Status type: 'loading', 'success', or 'error'
 */
export const showStatus = (element, message, type = 'loading') => {
  element.innerHTML = `<div class="status ${type}">${message}</div>`;
};

