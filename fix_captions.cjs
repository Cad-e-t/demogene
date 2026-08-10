const fs = require('fs');
const file = './components/content-creator/demo-creator/SmartCaptions.tsx';
let content = fs.readFileSync(file, 'utf8');

const lines = content.split('\n');
// We need to keep lines 0 to 196 (0-indexed 195)
const keepLines = lines.slice(0, 196);

const restOfTheCode = `      return (
        <span style={{ color: '#34C759' }}>
          {text}
        </span>
      );
    }

    const chars = Array.from(text);
    const hasDigits = /[0-9]/.test(text);
    const hasDollar = text.includes('$');

    if (hasDollar) {
      return (
        <span style={{ color: '#34C759' }}>
          {text}
        </span>
      );
    }

    return chars.map((char, index) => {
      const isDigit = /[0-9]/.test(char);
      const isCurrency = /[$€£¥₩₹]/.test(char);
      
      let isCommaOrDecimalInNumber = false;
      if ((char === ',' || char === '.') && hasDigits) {
        isCommaOrDecimalInNumber = true;
      }

      let color = isPortrait ? '#FFDE00' : '#FFFFFF';
      if (isDigit || isCommaOrDecimalInNumber) {
        color = '#26cc4a'; // elegant red
      } else if (isCurrency) {
        color = '#34C759'; // elegant green
      }

      return (
        <span key={index} style={{ color }}>
          {char}
        </span>
      );
    });
  };

  const containerStyle: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: !isPortrait ? '12px' : '20px',
        maxWidth: !isPortrait ? '90%' : '85%',
        position: 'absolute',
        bottom: !isPortrait ? '5%' : '40%'
  };

  const fontSize = !isPortrait ? 39 : 48;
  
  const textShadow = !isPortrait
    ? \`
      -1.5px -1.5px 0 #000000, 
       1.5px -1.5px 0 #000000,
      -1.5px  1.5px 0 #000000, 
       1.5px  1.5px 0 #000000,
      -1.5px  0px 0 #000000, 
       1.5px  0px 0 #000000, 
       0px -1.5px 0 #000000, 
       0px  1.5px 0 #000000, 
       0px  4px 8px rgba(0,0,0,0.8)
    \`
    : \`
      -2.5px -2.5px 0 #000000, 
       2.5px -2.5px 0 #000000,
      -2.5px  2.5px 0 #000000, 
       2.5px  2.5px 0 #000000,
      -2.5px  0px 0 #000000, 
       2.5px  0px 0 #000000, 
       0px -2.5px 0 #000000, 
       0px  2.5px 0 #000000, 
       0px  4px 8px rgba(0,0,0,0.8)
    \`;

  const renderedWords = currentWords.map((w: any, idx: number) => {
    const globalIdx = startIndex + idx;
    return (
      <span
        key={globalIdx}
        style={{
          display: 'inline-block',
          margin: !isPortrait ? '0 5px' : '0 12px',
          transform: \`scale(\${scale})\`,
        }}
      >
        {renderWordText(w.text)}
      </span>
    );
  });

  return (
    <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'center', zIndex: 10, pointerEvents: 'none' }}>
      <style dangerouslySetInnerHTML={{__html: \`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@900&display=swap');
        .smart-caption-text {
          font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          font-weight: 900;
        }
      \`}} />
      <div style={containerStyle}>
        <div style={{ display: 'grid' }}>
          {/* Background thick stroke for the "sticker" effect */}
          <div
            className="smart-caption-text"
            style={{
              gridArea: '1 / 1',
              fontSize: fontSize,
              letterSpacing: !isPortrait ? '-0.02em' : '-0.05em',
              color: '#000000',
              textAlign: 'center',
              WebkitTextStroke: !isPortrait ? '12px #000000' : '22px #000000',
              textTransform: !isPortrait ? 'none' : 'uppercase',
              textShadow: '0 8px 16px rgba(0,0,0,0.8)',
              wordBreak: 'break-word',
              whiteSpace: 'normal',
              lineHeight: !isPortrait ? '0.5' : '1.1',
              zIndex: 1,
            }}
          >
            {renderedWords}
          </div>
          
          {/* Foreground text */}
          <div
            className="smart-caption-text"
            style={{
              gridArea: '1 / 1',
              fontSize: fontSize,
              letterSpacing: !isPortrait ? '-0.02em' : '-0.05em',
              color: '#FFFFFF',
              textAlign: 'center',
              WebkitTextStroke: !isPortrait ? '1px #000000' : '3px #000000',
              textTransform: !isPortrait ? 'none' : 'uppercase',
              textShadow: textShadow,
              wordBreak: 'break-word',
              whiteSpace: 'normal',
              lineHeight: !isPortrait ? '0.5' : '1.1',
              zIndex: 2,
            }}
          >
            {renderedWords}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
`;

const newContent = keepLines.join('\n') + '\n' + restOfTheCode;
fs.writeFileSync(file, newContent, 'utf8');
console.log("Restored and updated correctly");
