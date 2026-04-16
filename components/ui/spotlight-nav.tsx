"use client";

import React, { useState } from 'react';
import { Home, Bookmark, PlusCircle, User, Settings } from 'lucide-react';
import { cn } from "@/lib/utils";

interface NavItemProps {
  icon: React.ElementType;
  isActive?: boolean;
  onClick?: () => void;
  indicatorPosition: number;
  position: number;
}

const NavItem: React.FC<NavItemProps> = ({ 
  icon: Icon, 
  isActive = false, 
  onClick,
}) => {
  return (
    <button
      className="relative flex items-center justify-center w-12 h-12 mx-2 transition-all duration-400"
      onClick={onClick}
    >
      <Icon
        className={cn(
          "w-6 h-6 transition-colors duration-200",
          isActive ? "text-white" : "text-gray-500 hover:text-gray-300"
        )}
        strokeWidth={isActive ? 2.5 : 2}
      />
    </button>
  );
};

export const SpotlightNav = () => {
  const [activeIndex, setActiveIndex] = useState(0);

  const navItems = [
    { icon: Home, label: 'Home' },
    { icon: Bookmark, label: 'Bookmarks' },
    { icon: PlusCircle, label: 'Add' },
    { icon: User, label: 'Profile' },
    { icon: Settings, label: 'Settings' },
  ];

  return (
    <nav className="relative flex items-center px-2 py-3 bg-black/90 backdrop-blur-sm rounded-md shadow-lg border border-white/10">
      <div 
        className="absolute top-0 h-[2px] bg-white transition-all duration-400 ease-in-out"
        style={{
          left: `${activeIndex * 64 + 16}px`,
          width: '48px',
          transform: 'translateY(-1px)',
        }}
      />
      {navItems.map((item, index) => (
        <NavItem
          key={item.label}
          icon={item.icon}
          isActive={activeIndex === index}
          onClick={() => setActiveIndex(index)}
        />
      ))}
    </nav>
  );
};
