import { EventEmitter } from 'events';

// Create a singleton event emitter for the application
class EventBus extends EventEmitter {
  constructor() {
    super();
    // Set maximum listeners to avoid memory leaks warning
    this.setMaxListeners(20);
  }
}

const eventBus = new EventBus();

/**
 * Emit an inventory changed event
 * @param {Object} payload - The event payload
 * @param {string} payload.productId - The product ID
 * @param {number} payload.oldStockLevel - The previous stock level
 * @param {number} payload.newStockLevel - The new stock level
 * @param {number} payload.oldDemandVelocity - The previous demand velocity
 * @param {number} payload.newDemandVelocity - The new demand velocity
 */
export function emitInventoryChanged(payload) {
  eventBus.emit('inventory.changed', payload);
}

/**
 * Listen for inventory changed events
 * @param {Function} handler - The event handler function
 */
export function onInventoryChanged(handler) {
  eventBus.on('inventory.changed', handler);
}

/**
 * Remove inventory changed event listener
 * @param {Function} handler - The event handler function to remove
 */
export function offInventoryChanged(handler) {
  eventBus.off('inventory.changed', handler);
}

// Export the event bus for direct access if needed
export default eventBus;