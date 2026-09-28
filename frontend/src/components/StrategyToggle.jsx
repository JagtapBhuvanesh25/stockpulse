import React from 'react';

const StrategyToggle = ({ currentStrategy, onChange, availableStrategies }) => {
  return (
    <div className="flex items-center space-x-4">
      <label className="text-sm font-medium text-gray-700">Strategy:</label>
      <select
        value={currentStrategy}
        onChange={(e) => onChange(e.target.value)}
        className="border border-gray-300 rounded px-3 py-1 text-sm"
      >
        {availableStrategies.map((strategy) => (
          <option key={strategy} value={strategy}>
            {strategy.charAt(0).toUpperCase() + strategy.slice(1)}
          </option>
        ))}
      </select>
    </div>
  );
};

export default StrategyToggle;