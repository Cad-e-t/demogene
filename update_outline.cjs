const fs = require('fs');
const file = './components/content-creator/demo-creator/SmartCaptions.tsx';
let content = fs.readFileSync(file, 'utf8');

const target = `  return (
    <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'center', zIndex: 10, pointerEvents: 'none' }}>
      <style dangerouslySetInnerHTML={{__html: \\\`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@900&display=swap');
        .smart-caption-text {
          font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          font-weight: 900;
        }
      \\\`}} />
      <div style={containerStyle}>
        <div
          className="smart-caption-text"
          style={{
            fontSize: fontSize,
            letterSpacing: !isPortrait ? '-0.02em' : '-0.05em',
            color: '#FFFFFF',
            textAlign: 'center',
            WebkitTextStroke: !isPortrait ? '1px #000000' : '3px #000000',
            textTransform: !isPortrait ? 'none' : 'uppercase',
            textShadow: textShadow,
            wordBreak: 'break-word',
            whiteSpace: 'normal',
            lineHeight: !isPortrait ? '0.5' : '10',
          }}
        >
          {currentWords.map((w: any, idx: number) => {
            const globalIdx = startIndex + idx;
            return (
              <span
                key={globalIdx}
                style={{
                  display: 'inline-block',
                  margin: !isPortrait ? '0 5px' : '0 12px',
                  transform: \\\`scale(\\\${scale})\\\`,
                }}
              >
                {renderWordText(w.text)}
              </span>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
`;

const replacement = `  const renderedWords = currentWords.map((w: any, idx: number) => {
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

const index = content.indexOf(target.slice(0, 100));
if (index === -1) {
    console.error("Target not found!");
    process.exit(1);
}

// simple replace using split
const lines = content.split('\n');
// find the line index for 'return ('
const returnIndex = lines.findIndex(l => l.trim() === 'return (');
if (returnIndex !== -1) {
    const newContent = lines.slice(0, returnIndex).join('\n') + '\n' + replacement;
    fs.writeFileSync(file, newContent, 'utf8');
    console.log("Updated correctly.");
} else {
    console.error("return ( not found");
}
