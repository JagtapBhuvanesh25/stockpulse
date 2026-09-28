import React from 'react';

const SuggestionCard = ({ suggestion, type, onAccept, onReject }) => {
  const isPricing = type === 'pricing';
  
  return (
    <div className="border rounded-lg p-4 mb-4 bg-white shadow-sm">
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-semibold">
          {isPricing ? 'Price Adjustment' : 'Reorder Recommendation'}
        </h3>
        <span className={`px-2 py-1 rounded text-xs font-medium ${
          suggestion.triggerReason === 'INVENTORY_LOW' ? 'bg-orange-100 text-orange-800' :
          suggestion.triggerReason === 'DEMAND_SPIKE' ? 'bg-purple-100 text-purple-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {suggestion.triggerReason.replace('_', ' ')}
        </span>
      </div>
      
      <div className="mb-3">
        <p className="text-sm text-gray-600 mb-2">{suggestion.reasoning}</p>
        
        {isPricing ? (
          <div>
            <p className="text-lg font-medium">
              ${suggestion.currentPrice.toFixed(2)} → ${suggestion.recommendedPrice.toFixed(2)}
              <span className={`ml-2 px-2 py-1 rounded text-xs ${
                suggestion.direction === 'INCREASE' ? 'bg-green-100 text-green-800' :
                suggestion.direction === 'DECREASE' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {suggestion.direction}
              </span>
            </p>
            <p className="text-sm text-gray-500">
              Confidence: {(suggestion.confidence * 100).toFixed(0)}%
            </p>
          </div>
        ) : (
          <div>
            <p className="text-lg font-medium">
              Reorder {suggestion.recommendedQuantity} units
            </p>
            <p className="text-sm text-gray-500">
              Confidence: {(suggestion.confidence * 100).toFixed(0)}%
            </p>
          </div>
        )}
      </div>
      
      <div className="flex space-x-2">
        <button
          onClick={() => onAccept(suggestion.id)}
          className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
        >
          Accept
        </button>
        <button
          onClick={() => onReject(suggestion.id)}
          className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
        >
          Reject
        </button>
      </div>
    </div>
  );
};

export default SuggestionCard;