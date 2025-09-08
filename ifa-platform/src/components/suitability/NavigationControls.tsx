// =====================================================
// FILE: src/components/suitability/NavigationControls.tsx
// =====================================================

import React from 'react'
import { Button } from '@/components/ui/Button'
import { ChevronLeft, ChevronRight, Send, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavigationControlsProps {
  currentSection: string
  sections: Array<{ id: string; title: string }>
  onNavigate: (sectionId: string) => void
  onPrevious: () => void
  onNext: () => void
  canSubmit: boolean
  onSubmit: () => void
  isSubmitting: boolean
}

export const NavigationControls: React.FC<NavigationControlsProps> = ({
  currentSection,
  sections,
  onNavigate,
  onPrevious,
  onNext,
  canSubmit,
  onSubmit,
  isSubmitting
}) => {
  const currentIndex = sections.findIndex(s => s.id === currentSection)
  const isFirst = currentIndex === 0
  const isLast = currentIndex === sections.length - 1
  
  return (
    <div className="flex items-center justify-between p-4 border-t bg-white">
      <Button
        variant="outline"
        onClick={onPrevious}
        disabled={isFirst}
      >
        <ChevronLeft className="w-4 h-4 mr-2" />
        Previous
      </Button>
      
      <div className="flex items-center gap-2">
        {sections.map((section, index) => (
          <button
            key={section.id}
            onClick={() => onNavigate(section.id)}
            className={cn(
              "w-2 h-2 rounded-full transition-colors",
              section.id === currentSection
                ? "bg-blue-500 w-8"
                : "bg-gray-300 hover:bg-gray-400"
            )}
            aria-label={`Go to ${section.title}`}
          />
        ))}
      </div>
      
      {isLast ? (
        <Button
          onClick={onSubmit}
          disabled={!canSubmit || isSubmitting}
        >
          {isSubmitting ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Send className="w-4 h-4 mr-2" />
          )}
          Submit Assessment
        </Button>
      ) : (
        <Button
          onClick={onNext}
        >
          Next
          <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      )}
    </div>
  )
}