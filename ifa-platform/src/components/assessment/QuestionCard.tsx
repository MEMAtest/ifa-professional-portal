// ================================================================
// FILE 2: Create QuestionCard Component
// Path: ifa-platform/src/components/assessment/QuestionCard.tsx
// ================================================================

'use client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { cn } from '@/lib/utils'

interface QuestionCardProps {
  question: {
    id: string
    text: string
    options: string[]
    category?: string
  }
  selectedAnswer?: string | number
  onAnswerSelect: (questionId: string, answer: string | number) => void
  showCategory?: boolean
}

export function QuestionCard({ 
  question, 
  selectedAnswer, 
  onAnswerSelect, 
  showCategory = false 
}: QuestionCardProps) {
  return (
    <Card className="w-full">
      <CardHeader>
        {showCategory && question.category && (
          <div className="text-sm text-blue-600 font-medium mb-2">
            {question.category.charAt(0).toUpperCase() + question.category.slice(1)}
          </div>
        )}
        <CardTitle className="text-lg leading-relaxed">
          {question.text}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {question.options.map((option: string, index: number) => {
            const isSelected = selectedAnswer === option || selectedAnswer === index
            
            return (
              <button
                key={index}
                onClick={() => onAnswerSelect(question.id, option)}
                className={cn(
                  "w-full p-4 text-left border rounded-lg transition-all hover:bg-gray-50",
                  isSelected 
                    ? "border-blue-500 bg-blue-50 text-blue-900" 
                    : "border-gray-200"
                )}
              >
                <div className="flex items-start space-x-3">
                  <div 
                    className={cn(
                      "w-4 h-4 rounded-full border-2 mt-0.5 flex-shrink-0",
                      isSelected 
                        ? "border-blue-500 bg-blue-500" 
                        : "border-gray-300"
                    )}
                  >
                    {isSelected && (
                      <div className="w-full h-full rounded-full bg-white scale-50" />
                    )}
                  </div>
                  <span className="text-sm leading-relaxed">{option}</span>
                </div>
              </button>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}