import React, { FC, useRef } from 'react'
import { useMouseHovered } from 'react-use'
import './styles.css'

interface VideoPreviewerProps {
  imgs: string[]
}
const VideoPreviewer: FC<VideoPreviewerProps> = ({ imgs }) => {
  const ref = useRef<HTMLDivElement>(null)
  const { elX, elW } = useMouseHovered(ref, { whenHovered: true })

  const lastCur = imgs.length - 1

  const rate = Math.round((elX / elW) * 10)
  const curx = elX <= 0 ? 0 : elX >= elW ? lastCur : rate
  const processStyle = { width: `${rate * 10}%` }

  return (
    <div className='video-previewer' ref={ref}>
      <img src={imgs[curx]} />
      <div className='process'>
        <div className='process-inner' style={processStyle}></div>
      </div>
    </div>
  )
}

export default VideoPreviewer
