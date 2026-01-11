'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useOffline } from '@/hooks/useOffline'

interface VirtualizedListProps<T> {
  items: T[]
  itemHeight: number
  containerHeight: number
  renderItem: (item: T, index: number) => React.ReactNode
  className?: string
  overscan?: number
}

export function VirtualizedList<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  className = '',
  overscan = 5,
}: VirtualizedListProps<T>) {
  const { isOffline } = useOffline()
  const [scrollTop, setScrollTop] = useState(0)

  // Calculate visible range
  const visibleRange = useMemo(() => {
    const start = Math.floor(scrollTop / itemHeight)
    const visibleCount = Math.ceil(containerHeight / itemHeight)
    const end = Math.min(start + visibleCount + overscan * 2, items.length)

    return {
      start: Math.max(0, start - overscan),
      end: end,
    }
  }, [scrollTop, itemHeight, containerHeight, items.length, overscan])

  // Get visible items
  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.start, visibleRange.end).map((item, index) => ({
      item,
      index: visibleRange.start + index,
    }))
  }, [items, visibleRange])

  // Handle scroll
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop)
  }, [])

  // Total height for scrollbar
  const totalHeight = items.length * itemHeight

  // Only use virtualization when offline or when there are many items
  const shouldVirtualize = isOffline || items.length > 50

  if (!shouldVirtualize) {
    // Render all items normally when online and few items
    return (
      <div
        className={`overflow-auto ${className}`}
        style={{ height: containerHeight }}
        onScroll={handleScroll}
      >
        <div style={{ height: totalHeight }}>
          {items.map((item, index) => renderItem(item, index))}
        </div>
      </div>
    )
  }

  return (
    <div
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div
          style={{
            transform: `translateY(${visibleRange.start * itemHeight}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
          }}
        >
          {visibleItems.map(({ item, index }) => (
            <div
              key={index}
              style={{
                height: itemHeight,
                position: 'relative',
              }}
            >
              {renderItem(item, index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}