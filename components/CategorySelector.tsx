
import React from 'react';
import { ProductCategory } from '../types';

interface CategorySelectorProps {
  selectedCategory: ProductCategory | null;
  onSelectCategory: (category: ProductCategory) => void;
}

const categories = Object.values(ProductCategory);

const CategorySelector: React.FC<CategorySelectorProps> = ({ selectedCategory, onSelectCategory }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {categories.map((category) => (
        <button
          key={category}
          onClick={() => onSelectCategory(category)}
          className={`px-4 py-6 text-center font-semibold border-2 rounded-lg transition-all duration-200 transform hover:-translate-y-1 ${
            selectedCategory === category
              ? 'bg-brand-primary text-white border-brand-primary shadow-lg'
              : 'bg-white text-gray-700 border-gray-200 hover:border-brand-primary hover:text-brand-primary'
          }`}
        >
          {category}
        </button>
      ))}
    </div>
  );
};

export default CategorySelector;
