import React from 'react'

type Props = {
  left: React.ReactNode
  main: React.ReactNode
  right: React.ReactNode
}

export function SuitabilityLayout(props: Props) {
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-3 hidden md:block">{props.left}</div>
        <div className="col-span-12 md:col-span-6">
          <div className="space-y-6">{props.main}</div>
        </div>
        <div className="col-span-3 hidden md:block">{props.right}</div>
      </div>
    </div>
  )
}

