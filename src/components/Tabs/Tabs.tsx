'use client';

import { type KeyboardEvent } from 'react';
import clsx from 'clsx';
import styles from './Tabs.module.css';

interface Tab {
  value: string;
  label: string;
  disabled?: boolean;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (value: string) => void;
  className?: string;
}

export function Tabs({ tabs, activeTab, onTabChange, className }: TabsProps) {
  function handleKeyDown(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    const enabledTabs = tabs.filter((t) => !t.disabled);
    const currentEnabledIndex = enabledTabs.findIndex((t) => t.value === tabs[index].value);

    let nextIndex: number | undefined;

    if (e.key === 'ArrowRight') {
      nextIndex = (currentEnabledIndex + 1) % enabledTabs.length;
    } else if (e.key === 'ArrowLeft') {
      nextIndex = (currentEnabledIndex - 1 + enabledTabs.length) % enabledTabs.length;
    } else if (e.key === 'Home') {
      nextIndex = 0;
    } else if (e.key === 'End') {
      nextIndex = enabledTabs.length - 1;
    }

    if (nextIndex !== undefined) {
      e.preventDefault();
      const nextTab = enabledTabs[nextIndex];
      onTabChange(nextTab.value);
      const tabEl = (e.currentTarget.parentElement as HTMLElement)?.querySelector<HTMLButtonElement>(
        `[data-tab-value="${nextTab.value}"]`,
      );
      tabEl?.focus();
    }
  }

  return (
    <div role="tablist" className={clsx(styles.tablist, className)}>
      {tabs.map((tab, index) => (
        <button
          key={tab.value}
          role="tab"
          type="button"
          data-tab-value={tab.value}
          aria-selected={activeTab === tab.value}
          aria-disabled={tab.disabled || undefined}
          disabled={tab.disabled}
          tabIndex={activeTab === tab.value ? 0 : -1}
          className={clsx(
            styles.tab,
            activeTab === tab.value && styles.active,
          )}
          onClick={() => onTabChange(tab.value)}
          onKeyDown={(e) => handleKeyDown(e, index)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
