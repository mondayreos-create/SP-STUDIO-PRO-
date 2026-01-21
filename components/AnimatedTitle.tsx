import React, { useState, useEffect } from 'react';

interface AnimatedTitleProps {
  title: string;
}

const gradients = [
  { class: 'from-cyan-400 via-blue-400 to-indigo-500', cursor: '#22d3ee' },
  { class: 'from-blue-400 via-indigo-400 to-purple-500', cursor: '#6366f1' },
  { class: 'from-emerald-400 via-cyan-400 to-blue-500', cursor: '#34d399' },
];

const AnimatedTitle: React.FC<AnimatedTitleProps> = ({ title }) => {
  const [displayedTitle, setDisplayedTitle] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const [colorIndex, setColorIndex] = useState(0);
  
  const typingDuration = 2500;
  const pauseDuration = 8000;
  const typingSpeed = typingDuration / title.length;

  useEffect(() => {
    let timeoutId: number;

    const typeCharacter = (index = 0) => {
      if (index < title.length) {
        setDisplayedTitle(prev => prev + title[index]);
        timeoutId = window.setTimeout(() => typeCharacter(index + 1), typingSpeed);
      } else {
        // Typing finished, start pause
        setIsTyping(false);
        timeoutId = window.setTimeout(startOver, pauseDuration);
      }
    };
    
    const startOver = () => {
        setDisplayedTitle('');
        setIsTyping(true);
        // Move to the next color in the cycle
        setColorIndex(prevIndex => (prevIndex + 1) % gradients.length);
        // A short delay before starting to type again for a clean reset
        timeoutId = window.setTimeout(() => typeCharacter(0), 100);
    };

    // Start the first cycle
    timeoutId = window.setTimeout(() => typeCharacter(0), 100);

    return () => clearTimeout(timeoutId);
  }, [title, typingSpeed, pauseDuration]);

  const titleStyle: React.CSSProperties = {
    fontFamily: "'Chakra Petch', sans-serif",
    fontWeight: 900,
    letterSpacing: '-0.03em',
    textShadow: `
      0 0 30px rgba(34, 211, 238, 0.3),
      0 0 60px rgba(34, 211, 238, 0.1)
    `,
    minHeight: '2rem',
    display: 'inline-block',
  };

  const currentGradient = gradients[colorIndex];

  const cursorStyle: React.CSSProperties = {
    display: 'inline-block',
    width: '4px',
    height: '1.5rem',
    backgroundColor: currentGradient.cursor,
    animation: 'blink 1s step-end infinite',
    verticalAlign: 'middle',
    marginLeft: '4px',
    visibility: isTyping ? 'visible' : 'hidden',
  };

  return (
    <div className="flex flex-col items-start">
      <style>
      {`
        @keyframes blink {
          from, to { background-color: transparent }
          50% { background-color: ${currentGradient.cursor} }
        }
      `}
      </style>
      <h1 
        className={`text-2xl md:text-3xl text-transparent bg-clip-text bg-gradient-to-r ${currentGradient.class}`}
        style={titleStyle}
      >
        {displayedTitle}
        <span style={cursorStyle}></span>
      </h1>
    </div>
  );
};

export default AnimatedTitle;