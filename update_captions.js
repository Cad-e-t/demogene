const fs = require('fs');
const file = './components/content-creator/demo-creator/SmartCaptions.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  `  // 5. Dynamic word limits based on aspect ratio
  const maxWords = 4;

  const chunkIdx = Math.floor(activeIdx / maxWords);
  const startIndex = chunkIdx * maxWords;
  const currentWords = wordsToSearch.slice(startIndex, startIndex + maxWords);

  // Calculate dynamic scale pop for the active word (only in portrait mode)
  let scale = 1;
  if (isPortrait && activeWord) {
    const popProgress = (frame - (activeWord.start || 0)) / 5;
    if (popProgress >= 0 && popProgress <= 1) {
      scale = 1 + 0.25 * Math.sin(popProgress * Math.PI);
    }
  }`,
  `  // 5. Dynamic word limits based on aspect ratio
  const maxWords = isPortrait ? 1 : 4;

  const chunkIdx = Math.floor(activeIdx / maxWords);
  const startIndex = chunkIdx * maxWords;
  const currentWords = wordsToSearch.slice(startIndex, startIndex + maxWords);

  // Calculate dynamic scale pop for the active word (only in portrait mode)
  let scale = 1;
  if (isPortrait && activeWord) {
    const popProgress = (frame - (activeWord.start || 0)) / 5;
    if (popProgress >= 0 && popProgress <= 1) {
      scale = 1 + 0.15 * Math.sin(popProgress * Math.PI);
    }
  }`
);

content = content.replace(
  `      let color = '#FFFFFF';
      if (isDigit || isCommaOrDecimalInNumber) {
        color = '#26cc4a'; // elegant red
      } else if (isCurrency) {
        color = '#34C759'; // elegant green
      }`,
  `      let color = isPortrait ? '#FFDE00' : '#FFFFFF';
      if (isDigit || isCommaOrDecimalInNumber) {
        color = '#26cc4a'; // elegant red
      } else if (isCurrency) {
        color = '#34C759'; // elegant green
      }`
);

content = content.replace(
  `  const containerStyle: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: !isPortrait ? '12px' : '40px',
        maxWidth: !isPortrait ? '90%' : '85%',
        position: 'absolute',
        bottom: !isPortrait ? '5%' : '15%'
  };

  const fontSize = !isPortrait ? 39 : 80;

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
      -3px -3px 0 #000000, 
       3px -3px 0 #000000,
      -3px  3px 0 #000000, 
       3px  3px 0 #000000,
      -3px  0px 0 #000000, 
       3px  0px 0 #000000, 
       0px -3px 0 #000000, 
       0px  3px 0 #000000, 
       0px  8px 16px rgba(0,0,0,0.8)
    \`;`,
  `  const containerStyle: React.CSSProperties = {
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
    \`;`
);

content = content.replace(
  `WebkitTextStroke: !isPortrait ? '1px #000000' : '8px #000000',`,
  `WebkitTextStroke: !isPortrait ? '1px #000000' : '3px #000000',`
);

fs.writeFileSync(file, content, 'utf8');
