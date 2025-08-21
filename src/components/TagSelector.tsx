//src/components/TagSelector.tsx
import React from 'react';
import clsx from 'clsx';

interface TagSelectorProps {
  options: string[];
  selected: string[];
  onChange: (updated: string[]) => void;
  multiple?: boolean;
  animate?: boolean;
}

const TagSelector: React.FC<TagSelectorProps> = ({
  options,
  selected,
  onChange,
  multiple = true,
  animate = false,
}) => {
  const toggleTag = (tag: string) => {
    if (multiple) {
      onChange(
        selected.includes(tag)
          ? selected.filter((t) => t !== tag)
          : [...selected, tag]
      );
    } else {
      onChange([tag]);
    }
  };

  return (
    <div className={clsx('flex flex-wrap gap-2', animate && 'animate-fadeIn')}>
      {options.map((tag) => {
        const isSelected = selected.includes(tag);
        return (
          <button
            key={tag}
            type="button"
            aria-pressed={isSelected}
            onClick={() => toggleTag(tag)}
            className={clsx(
              'px-3 py-1 rounded-full text-sm transition border font-medium focus:outline-none',
              isSelected
                ? 'bg-[#FF3B30] text-white border-transparent'
                : 'bg-[#1E1E1E] text-[#B0B0B0] border-[#2A2A2A] hover:border-[#FF3B30] hover:text-white'
            )}
          >
            {tag}
          </button>
        );
      })}
    </div>
  );
};

export default TagSelector;
