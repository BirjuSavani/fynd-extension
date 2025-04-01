import { useState } from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';

export function ProductCard() {
  const { transcript, listening, resetTranscript } = useSpeechRecognition();
  const [searchQuery, setSearchQuery] = useState('');

  const toggleListening = () => {
    if (listening) {
      SpeechRecognition.stopListening();
    } else {
      resetTranscript();
      setSearchQuery('');
      SpeechRecognition.startListening({ continuous: true });
    }
  };

  return (
    <div>
      <button onClick={toggleListening}>{listening ? 'Stop Listening' : 'Speak'}</button>
      {transcript && <p>Heard: {transcript}</p>}
    </div>
  );
}

// export default ProductCard;