import React from 'react';

const ProductTable = ({ products = [], onSimulateSale, onUpdateStock }) => {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white border border-gray-200">
        <thead>
          <tr className="bg-gray-100">
            <th className="py-2 px-4 border-b text-left">Product</th>
            <th className="py-2 px-4 border-b text-left">Category</th>
            <th className="py-2 px-4 border-b text-left">Price</th>
            <th className="py-2 px-4 border-b text-left">Stock</th>
            <th className="py-2 px-4 border-b text-left">Status</th>
            <th className="py-2 px-4 border-b text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.id} className="hover:bg-gray-50">
              <td className="py-2 px-4 border-b">{product.name}</td>
              <td className="py-2 px-4 border-b">{product.category}</td>
              <td className="py-2 px-4 border-b">${product.currentPrice.toFixed(2)}</td>
              <td className="py-2 px-4 border-b">{product.stockLevel}</td>
              <td className="py-2 px-4 border-b">
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  product.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                  product.status === 'PRICE_REVIEW_PENDING' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {product.status.replace('_', ' ')}
                </span>
              </td>
              <td className="py-2 px-4 border-b">
                <button
                  onClick={() => onSimulateSale(product.id)}
                  className="mr-2 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                >
                  Simulate Sale
                </button>
                <button
                  onClick={() => onUpdateStock(product.id)}
                  className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm"
                >
                  Update Stock
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ProductTable;